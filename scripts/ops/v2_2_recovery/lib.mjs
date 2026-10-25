import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

export const PRODUCTION_REF = 'nihhynwvltttadlfatdm';
export const STAGING_REF = 'puzuubnxarmviwgpjclj';
export const EXPORT_FILES = ['roles.sql', 'schema.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];

export function assertRef(value, label = 'project ref') {
  if (!/^[a-z]{20}$/.test(value ?? '')) throw new Error(`Invalid ${label}`);
  return value;
}

export function assertIsolatedDestination(sourceRef, destinationRef) {
  assertRef(sourceRef, 'source ref');
  assertRef(destinationRef, 'destination ref');
  if ([PRODUCTION_REF, STAGING_REF, sourceRef].includes(destinationRef)) {
    throw new Error('Destination must be a new isolated project, never production, staging, or source');
  }
}

export function assertOutsideRepo(target, repoRoot) {
  if (!path.isAbsolute(target)) throw new Error('Backup path must be absolute');
  let ancestor = path.resolve(target);
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) throw new Error('Cannot resolve backup path');
    ancestor = parent;
  }
  const existing = realpathSync(ancestor).toLowerCase();
  const repo = realpathSync(repoRoot).toLowerCase();
  if (existing === repo || existing.startsWith(repo + path.sep)) {
    throw new Error('Backup output must be outside the Git repository');
  }
  return path.resolve(target);
}

export function assertNewDirectory(target) {
  if (existsSync(target)) throw new Error('Output already exists; refusing overwrite');
}

export function assertLinkedProject(projects, sourceRef) {
  const linked = projects.filter((project) => project.linked === true);
  if (linked.length !== 1 || linked[0].ref !== sourceRef || linked[0].id !== sourceRef) {
    throw new Error('CLI linked project does not match the expected source');
  }
}

export function assertServiceFile(serviceFile, serviceName, destinationRef) {
  if (!existsSync(serviceFile) || !statSync(serviceFile).isFile()) throw new Error('Private libpq service file missing');
  if (!/^[a-z][a-z0-9_]*$/.test(serviceName ?? '')) throw new Error('Invalid service name');
  const text = readFileSync(serviceFile, 'utf8');
  const escaped = serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`(?:^|\\n)\\[${escaped}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)`, 'i'));
  if (!match) throw new Error('Destination service entry missing');
  const values = Object.fromEntries(match[1].split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => {
    const index = line.indexOf('=');
    return index < 0 ? ['', ''] : [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
  }));
  const host = values.host?.toLowerCase();
  const user = values.user?.toLowerCase();
  const direct = host === `db.${destinationRef}.supabase.co` && user === 'postgres';
  const pooler = /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host ?? '') && user === `postgres.${destinationRef}`;
  if (!direct && !pooler) throw new Error('Service host/user do not prove isolated destination identity');
  if (values.password || values.passfile) throw new Error('Do not embed credentials in the service file');
  return { host, user };
}

export async function sha256File(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifyBackup(directory, expectedSource = PRODUCTION_REF) {
  const manifestPath = path.join(directory, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error('Backup manifest missing: partial or unverified export');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.format !== 'lumea-supabase-logical-v1' || manifest.sourceRef !== expectedSource) {
    throw new Error('Backup format/source mismatch');
  }
  if (!Array.isArray(manifest.files) || manifest.files.length !== EXPORT_FILES.length) {
    throw new Error('Backup manifest is incomplete');
  }
  const names = manifest.files.map((item) => item.name);
  if (new Set(names).size !== EXPORT_FILES.length || EXPORT_FILES.some((name) => !names.includes(name))) {
    throw new Error('Backup file set is incomplete');
  }
  for (const item of manifest.files) {
    const file = path.join(directory, item.name);
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`Backup file missing: ${item.name}`);
    const size = statSync(file).size;
    if (size < 1 || size !== item.bytes) throw new Error(`Backup size mismatch: ${item.name}`);
    if ((await sha256File(file)) !== item.sha256) throw new Error(`Backup hash mismatch: ${item.name}`);
  }
  return manifest;
}

export function validatePublicMediaEntry(entry, productionRef = PRODUCTION_REF) {
  if (entry.bucket !== 'public-media') throw new Error('Only public-media is permitted');
  if (typeof entry.key !== 'string' || !entry.key || entry.key.startsWith('/') || entry.key.includes('..') || entry.key.includes('\\')) {
    throw new Error('Unsafe Storage object key');
  }
  const url = new URL(entry.url);
  if (url.protocol !== 'https:' || url.hostname !== `${productionRef}.supabase.co` || url.search || url.hash) {
    throw new Error('Media URL does not belong to production project');
  }
  const expectedPath = `/storage/v1/object/public/public-media/${entry.key.split('/').map(encodeURIComponent).join('/')}`;
  if (url.pathname !== expectedPath) throw new Error('Media URL/key mismatch');
  if (!/^image\/(jpeg|png|webp|avif)$/.test(entry.mime)) throw new Error('Unsupported public image MIME');
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > 20_000_000) throw new Error('Invalid bounded image size');
  return url;
}

export function assertImageSignature(bytes, mime) {
  const head = Buffer.from(bytes.subarray(0, 16));
  const png = head.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const jpeg = head.subarray(0, 3).toString('hex') === 'ffd8ff';
  const webp = head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP';
  const avif = head.subarray(4, 8).toString('ascii') === 'ftyp' && /^(avif|avis)$/.test(head.subarray(8, 12).toString('ascii'));
  if (!({ 'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp, 'image/avif': avif })[mime]) {
    throw new Error('Image bytes do not match expected MIME');
  }
}
