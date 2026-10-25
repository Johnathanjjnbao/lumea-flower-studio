import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRODUCTION_REF, STAGING_REF, EXPORT_FILES, assertRef, assertIsolatedDestination,
  assertOutsideRepo, assertNewDirectory, assertLinkedProject, assertServiceFile,
  sha256File, verifyBackup, validatePublicMediaEntry,
  assertImageSignature,
} from './lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function argsOf(argv) {
  const [command, ...rest] = argv;
  if (!command) throw new Error('Usage: recovery.mjs <doctor|plan|export|verify|restore|validate-target|storage-backup|storage-verify|report> [--key value]');
  const opts = {};
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    if (!key?.startsWith('--') || !rest[index + 1] || rest[index + 1].startsWith('--')) throw new Error('Invalid options');
    if (Object.hasOwn(opts, key.slice(2))) throw new Error('Duplicate option');
    opts[key.slice(2)] = rest[index + 1];
  }
  return { command, opts };
}

function required(opts, name) {
  if (!opts[name]) throw new Error(`Missing --${name}`);
  return opts[name];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: options.cwd ?? repoRoot, env: options.env ?? process.env, encoding: 'utf8', windowsHide: true, maxBuffer: 5_000_000 });
  if (result.error || result.status !== 0) throw new Error(`${options.label ?? path.basename(command)} failed; inspect locally without exposing secrets`);
  return result.stdout;
}

function assertProductionSource(opts) {
  if (assertRef(required(opts, 'source-ref')) !== PRODUCTION_REF) throw new Error('Source is not the expected production project');
}

function linkedProjects(cli, workdir) {
  return JSON.parse(run(cli, ['projects', 'list', '--output', 'json'], { cwd: workdir, label: 'Supabase project identity check' }));
}

async function exportDatabase(opts) {
  assertProductionSource(opts);
  const workdir = path.resolve(required(opts, 'workdir'));
  const output = assertOutsideRepo(required(opts, 'output-dir'), repoRoot);
  assertNewDirectory(output);
  const cli = required(opts, 'supabase-cli');
  if (!existsSync(cli)) throw new Error('Supabase CLI executable missing');
  if (opts.execute !== 'EXPORT_LIVE_DATA' || process.env.LUMEA_PRODUCTION_EXPORT_APPROVED !== 'YES_EXPORT_LIVE_DATA') {
    throw new Error('Production export disabled: requires separate owner authorization and explicit opt-in');
  }
  assertLinkedProject(linkedProjects(cli, workdir), PRODUCTION_REF);
  mkdirSync(path.dirname(output), { recursive: true });
  mkdirSync(output);
  const jobs = [
    ['roles.sql', ['--role-only']],
    ['schema.sql', []],
    ['data.sql', ['--use-copy', '--data-only', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes']],
    ['history_schema.sql', ['--schema', 'supabase_migrations']],
    ['history_data.sql', ['--schema', 'supabase_migrations', '--use-copy', '--data-only']],
  ];
  for (const [name, flags] of jobs) {
    run(cli, ['db', 'dump', '--linked', ...flags, '-f', path.join(output, name)], { cwd: workdir, label: `Export ${name}` });
  }
  const files = [];
  for (const name of EXPORT_FILES) {
    const file = path.join(output, name);
    const bytes = statSync(file).size;
    if (bytes < 1) throw new Error(`Empty export: ${name}`);
    files.push({ name, bytes, sha256: await sha256File(file) });
  }
  const manifest = { format: 'lumea-supabase-logical-v1', sourceRef: PRODUCTION_REF, createdAt: new Date().toISOString(), files };
  writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await verifyBackup(output);
  console.log(`Export files verified: ${files.length}; keep this directory encrypted and private`);
}

async function restoreDatabase(opts) {
  const source = assertRef(required(opts, 'source-ref'));
  const destination = assertRef(required(opts, 'destination-ref'));
  assertIsolatedDestination(source, destination);
  const backup = assertOutsideRepo(required(opts, 'backup-dir'), repoRoot);
  await verifyBackup(backup, source);
  const serviceFile = assertOutsideRepo(required(opts, 'service-file'), repoRoot);
  const serviceName = required(opts, 'service-name');
  assertServiceFile(serviceFile, serviceName, destination);
  if (!process.env.PGPASSFILE || !existsSync(assertOutsideRepo(process.env.PGPASSFILE, repoRoot))) throw new Error('Private PGPASSFILE missing');
  const psql = required(opts, 'psql');
  if (!existsSync(psql)) throw new Error('psql executable missing');
  if (opts.execute !== 'RESTORE_ISOLATED' || process.env.LUMEA_ISOLATED_RESTORE_APPROVED !== 'YES_RESTORE_ISOLATED') {
    throw new Error('Restore disabled: requires separate owner authorization and explicit opt-in');
  }
  const env = { ...process.env, PGSERVICEFILE: serviceFile };
  const db = `service=${serviceName}`;
  const fresh = run(psql, ['-X', '--no-password', '--dbname', db, '--no-align', '--tuples-only', '--set', 'ON_ERROR_STOP=1', '--command', "select (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('products','orders','media_assets','commercial_content_sections'))::text || ':' || (select count(*) from auth.users)::text || ':' || (select count(*) from storage.objects)::text || ':' || (to_regclass('supabase_migrations.schema_migrations') is not null)::text"], { env, label: 'Isolated destination preflight' }).trim();
  if (fresh !== '0:0:0:false') throw new Error('Destination is not empty/fresh; refusing restore');
  run(psql, ['-X', '--no-password', '--dbname', db, '--single-transaction', '--set', 'ON_ERROR_STOP=1', ...['roles.sql', 'schema.sql'].map((name) => `--file=${path.join(backup, name)}`), '--command=SET session_replication_role = replica', `--file=${path.join(backup, 'data.sql')}`], { env, label: 'Isolated database restore' });
  run(psql, ['-X', '--no-password', '--dbname', db, '--single-transaction', '--set', 'ON_ERROR_STOP=1', `--file=${path.join(backup, 'history_schema.sql')}`, `--file=${path.join(backup, 'history_data.sql')}`], { env, label: 'Isolated migration-history restore' });
  console.log('Isolated SQL import completed; Auth, Vault, roles, RLS, Storage and application validation still required');
}

function validateTarget(opts) {
  assertIsolatedDestination(PRODUCTION_REF, assertRef(required(opts, 'destination-ref')));
  const serviceFile = assertOutsideRepo(required(opts, 'service-file'), repoRoot);
  const serviceName = required(opts, 'service-name');
  assertServiceFile(serviceFile, serviceName, opts['destination-ref']);
  if (!process.env.PGPASSFILE || !existsSync(assertOutsideRepo(process.env.PGPASSFILE, repoRoot))) throw new Error('Private PGPASSFILE missing');
  const psql = required(opts, 'psql');
  if (!existsSync(psql)) throw new Error('psql executable missing');
  const sql = "select ((select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('products','product_variants','orders','admin_profiles','media_assets') and c.relrowsecurity)=5)::text || ':' || (to_regclass('auth.users') is not null)::text || ':' || (to_regclass('storage.objects') is not null)::text || ':' || (to_regclass('supabase_migrations.schema_migrations') is not null)::text || ':' || (select count(*) > 0 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_checkout_order')::text";
  const result = run(psql, ['-X', '--no-password', '--dbname', `service=${serviceName}`, '--no-align', '--tuples-only', '--set', 'ON_ERROR_STOP=1', '--command', sql], { env: { ...process.env, PGSERVICEFILE: serviceFile }, label: 'Isolated target metadata check' }).trim();
  if (result !== 'true:true:true:true:true') throw new Error(`Isolated target metadata incomplete: ${result}`);
  console.log('Isolated target metadata smoke PASS; data counts, Auth login, Vault and Storage bytes still require separate checks');
}

async function backupPublicMedia(opts) {
  assertProductionSource(opts);
  const input = JSON.parse(readFileSync(required(opts, 'input-manifest'), 'utf8'));
  if (input.sourceRef !== PRODUCTION_REF) throw new Error('Public media manifest source mismatch');
  if (!Array.isArray(input.objects) || input.objects.length < 1 || input.objects.length > 51) throw new Error('Bounded public media list required (1–51)');
  const keys = new Set();
  for (const item of input.objects) {
    validatePublicMediaEntry(item);
    if (keys.has(item.key)) throw new Error('Duplicate media key');
    keys.add(item.key);
  }
  const output = assertOutsideRepo(required(opts, 'output-dir'), repoRoot);
  assertNewDirectory(output);
  if (opts.execute !== 'DOWNLOAD_PUBLIC_MEDIA') throw new Error('Plan-only: add explicit public-media download opt-in');
  mkdirSync(path.dirname(output), { recursive: true });
  mkdirSync(output);
  const results = [];
  for (let index = 0; index < input.objects.length; index++) {
    const item = input.objects[index];
    const url = validatePublicMediaEntry(item);
    const response = await fetch(url, { redirect: 'error' });
    if (!response.ok) throw new Error(`Public media GET failed at item ${index + 1}: HTTP ${response.status}`);
    const type = response.headers.get('content-type')?.split(';')[0].toLowerCase();
    if (type !== item.mime) throw new Error(`Public media MIME mismatch at item ${index + 1}`);
    const length = response.headers.get('content-length');
    if (length && Number(length) !== item.bytes) throw new Error(`Public media header size mismatch at item ${index + 1}`);
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.byteLength;
      if (total > item.bytes) throw new Error(`Public media exceeds metadata size at item ${index + 1}`);
      chunks.push(chunk);
    }
    if (total !== item.bytes) throw new Error(`Public media size mismatch at item ${index + 1}`);
    const bytes = Buffer.concat(chunks);
    assertImageSignature(bytes, item.mime);
    const name = `object-${String(index + 1).padStart(3, '0')}${path.extname(item.key).toLowerCase()}`;
    const file = path.join(output, name);
    const handle = openSync(file, 'wx', 0o600);
    try { writeFileSync(handle, bytes); } finally { closeSync(handle); }
    const sha256 = await sha256File(file);
    if (item.sha256 && sha256 !== item.sha256.toLowerCase()) throw new Error(`Public media hash mismatch at item ${index + 1}`);
    results.push({ bucket: item.bucket, key: item.key, mime: item.mime, bytes: item.bytes, file: name, sha256 });
  }
  writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({ format: 'lumea-public-media-v1', sourceRef: PRODUCTION_REF, objects: results }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(`Public media downloaded and hashed: ${results.length} object(s)`);
}

async function verifyPublicMedia(opts) {
  const directory = assertOutsideRepo(required(opts, 'backup-dir'), repoRoot);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.format !== 'lumea-public-media-v1' || manifest.sourceRef !== PRODUCTION_REF || !Array.isArray(manifest.objects)) throw new Error('Invalid public media manifest');
  for (const item of manifest.objects) {
    if (!/^object-\d{3}\.(png|jpe?g|webp|avif)$/.test(item.file)) throw new Error('Unsafe media backup filename');
    const file = path.join(directory, item.file);
    if (!existsSync(file) || statSync(file).size !== item.bytes || (await sha256File(file)) !== item.sha256) throw new Error(`Public media backup mismatch: ${item.file}`);
    assertImageSignature(readFileSync(file).subarray(0, 16), item.mime);
  }
  console.log(`Public media backup verified: ${manifest.objects.length} object(s)`);
}

async function main() {
  const { command, opts } = argsOf(process.argv.slice(2));
  if (command === 'doctor') {
    const cli = required(opts, 'supabase-cli');
    const psql = required(opts, 'psql');
    console.log(run(cli, ['--version'], { label: 'Supabase CLI' }).trim());
    console.log(run(psql, ['--version'], { label: 'PostgreSQL client' }).trim());
  } else if (command === 'plan') {
    assertProductionSource(opts);
    if (opts['destination-ref']) assertIsolatedDestination(PRODUCTION_REF, opts['destination-ref']);
    console.log('Plan only: production export and isolated restore are disabled without separate approval');
  } else if (command === 'export') await exportDatabase(opts);
  else if (command === 'verify') console.log(`Logical backup verified: ${(await verifyBackup(assertOutsideRepo(required(opts, 'backup-dir'), repoRoot))).files.length} files`);
  else if (command === 'restore') await restoreDatabase(opts);
  else if (command === 'validate-target') validateTarget(opts);
  else if (command === 'storage-backup') await backupPublicMedia(opts);
  else if (command === 'storage-verify') await verifyPublicMedia(opts);
  else if (command === 'report') {
    const directory = assertOutsideRepo(required(opts, 'backup-dir'), repoRoot);
    const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    if (manifest.format === 'lumea-supabase-logical-v1') {
      await verifyBackup(directory);
      console.log(`Logical backup: ${manifest.files.length} verified files, ${manifest.files.reduce((sum, file) => sum + file.bytes, 0)} bytes; live restore unverified`);
    } else if (manifest.format === 'lumea-public-media-v1') {
      await verifyPublicMedia({ 'backup-dir': directory });
      console.log(`Public media: ${manifest.objects.length} verified objects, ${manifest.objects.reduce((sum, item) => sum + item.bytes, 0)} bytes; no restore has run`);
    } else throw new Error('Unknown backup format');
  }
  else throw new Error('Unknown command');
}

main().catch((error) => { console.error(`Recovery safety stop: ${error.message}`); process.exitCode = 1; });
