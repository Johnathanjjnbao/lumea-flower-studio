import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EXPORT_FILES, sha256File, verifyBackup } from './lib.mjs';

const bin = process.argv[2];
if (!bin || !path.isAbsolute(bin)) throw new Error('Provide absolute PostgreSQL bin directory');
const workspace = mkdtempSync(path.join(os.tmpdir(), 'lumea-v22-synthetic-'));
const executable = (name) => path.join(bin, `${name}.exe`);

function run(name, args) {
  const control = name === 'pg_ctl';
  const result = spawnSync(executable(name), args, { encoding: 'utf8', windowsHide: true, maxBuffer: 5_000_000, stdio: control ? 'ignore' : 'pipe' });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${(result.stderr ?? '').slice(-500)}`);
  return result.stdout?.trim() ?? '';
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

const clusters = [];
function psql(port, user, database, ...args) {
  return run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(port), '-U', user, '-d', database, ...args]);
}

async function startCluster(label, user) {
  const data = path.join(workspace, label, 'data');
  mkdirSync(path.dirname(data), { recursive: true });
  run('initdb', ['-D', data, '-A', 'trust', '-U', user, '--no-instructions']);
  const port = await freePort();
  run('pg_ctl', ['-D', data, '-l', path.join(workspace, label, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  clusters.push(data);
  return { data, port, user };
}

const fixtureSql = `
create role qa_public_reader nologin;
create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key);
insert into supabase_migrations.schema_migrations values ('20261008090500');
create table public.products(id uuid primary key, stable_code text unique not null, visibility text not null);
create table public.product_variants(id uuid primary key, product_id uuid not null references public.products(id), sku text unique not null, price_amount integer not null check(price_amount >= 0));
create table public.product_translations(product_id uuid not null references public.products(id), locale text not null check(locale in ('vi','ko')), name text not null, primary key(product_id, locale));
create function public.product_price(p_sku text) returns integer language sql stable as 'select price_amount from public.product_variants where sku = p_sku';
alter table public.products enable row level security;
create policy published_read on public.products for select to public using (visibility = 'PUBLISHED');
grant select on public.products to qa_public_reader;
insert into public.products values ('11111111-1111-4111-8111-111111111111','qa-synthetic','PUBLISHED');
insert into public.product_variants values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','QA-SYNTH-STD',1200000);
insert into public.product_translations values ('11111111-1111-4111-8111-111111111111','vi','Bó hoa thử'),('11111111-1111-4111-8111-111111111111','ko','테스트 꽃다발');
`;

try {
  const source = await startCluster('source', 'lumeasource');
  const target = await startCluster('target', 'lumeatarget');
  psql(source.port, source.user, 'postgres', '-c', fixtureSql);
  const expected = psql(source.port, source.user, 'postgres', '-At', '-c', `select (select count(*) from public.products)::text || ':' || (select count(*) from public.product_variants)::text || ':' || (select count(*) from public.product_translations)::text || ':' || (select sum(price_amount) from public.product_variants)::text`);
  const backup = path.join(workspace, 'backup');
  mkdirSync(backup);
  const sourceArgs = ['-h', '127.0.0.1', '-p', String(source.port), '-U', source.user, '-d', 'postgres'];
  run('pg_dumpall', ['-h', '127.0.0.1', '-p', String(source.port), '-U', source.user, '--roles-only', '-f', path.join(backup, 'roles.sql')]);
  run('pg_dump', [...sourceArgs, '--schema-only', '--schema=public', '-f', path.join(backup, 'schema.sql')]);
  run('pg_dump', [...sourceArgs, '--data-only', '--schema=public', '--inserts', '-f', path.join(backup, 'data.sql')]);
  run('pg_dump', [...sourceArgs, '--schema-only', '--schema=supabase_migrations', '-f', path.join(backup, 'history_schema.sql')]);
  run('pg_dump', [...sourceArgs, '--data-only', '--schema=supabase_migrations', '--inserts', '-f', path.join(backup, 'history_data.sql')]);
  const files = [];
  for (const name of EXPORT_FILES) {
    const file = path.join(backup, name);
    files.push({ name, bytes: statSync(file).size, sha256: await sha256File(file) });
  }
  writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ format: 'lumea-supabase-logical-v1', sourceRef: 'synthetic-source', files }, null, 2));
  await verifyBackup(backup, 'synthetic-source');
  psql(target.port, target.user, 'postgres', '-c', 'drop schema public cascade');
  psql(target.port, target.user, 'postgres', '-1', '-f', path.join(backup, 'roles.sql'), '-f', path.join(backup, 'schema.sql'), '-f', path.join(backup, 'data.sql'));
  psql(target.port, target.user, 'postgres', '-1', '-f', path.join(backup, 'history_schema.sql'), '-f', path.join(backup, 'history_data.sql'));
  const actual = psql(target.port, target.user, 'postgres', '-At', '-c', `select (select count(*) from public.products)::text || ':' || (select count(*) from public.product_variants)::text || ':' || (select count(*) from public.product_translations)::text || ':' || (select sum(price_amount) from public.product_variants)::text`);
  if (actual !== expected) throw new Error(`Synthetic row/price mismatch: ${expected} vs ${actual}`);
  const contract = psql(target.port, target.user, 'postgres', '-At', '-c', `select (select relrowsecurity from pg_class where oid='public.products'::regclass)::text || ':' || (select count(*) from pg_policy where polrelid='public.products'::regclass)::text || ':' || (select has_table_privilege('qa_public_reader','public.products','SELECT'))::text || ':' || (select public.product_price('QA-SYNTH-STD'))::text || ':' || (select count(*) from supabase_migrations.schema_migrations)::text`);
  if (contract !== 'true:1:true:1200000:1') throw new Error(`Synthetic security/schema contract mismatch: ${contract}`);
  const image = path.join(workspace, 'synthetic.png');
  writeFileSync(image, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/cX8AAAAASUVORK5CYII=', 'base64'));
  if (readFileSync(image).subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Synthetic PNG signature invalid');
  console.log(`SYNTHETIC TOOLCHAIN RESTORE PASS; rows=${actual}; contract=${contract}; workspace=${workspace}`);
} finally {
  for (const data of clusters.reverse()) {
    try { run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']); } catch { console.error(`Stop local synthetic cluster manually: ${data}`); }
  }
}
