import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  PRODUCTION_REF, STAGING_REF, EXPORT_FILES, assertIsolatedDestination,
  assertOutsideRepo, assertLinkedProject, assertServiceFile, sha256File,
  verifyBackup, validatePublicMediaEntry, assertImageSignature,
} from './lib.mjs';

const root = path.resolve('scripts/ops/v2_2_recovery');
const cli = path.join(root, 'recovery.mjs');
const scratch = mkdtempSync(path.join(os.tmpdir(), 'lumea-recovery-test-'));

test('destination guard rejects production, staging and source', () => {
  for (const destination of [PRODUCTION_REF, STAGING_REF]) {
    assert.throws(() => assertIsolatedDestination(PRODUCTION_REF, destination));
  }
  assert.doesNotThrow(() => assertIsolatedDestination(PRODUCTION_REF, 'aaaaaaaaaaaaaaaaaaaa'));
});

test('linked project must be exact production identity', () => {
  assert.throws(() => assertLinkedProject([{ id: STAGING_REF, ref: STAGING_REF, linked: true }], PRODUCTION_REF));
  assert.doesNotThrow(() => assertLinkedProject([{ id: PRODUCTION_REF, ref: PRODUCTION_REF, linked: true }], PRODUCTION_REF));
});

test('backup output refuses repository and accepts external scratch', () => {
  assert.throws(() => assertOutsideRepo(path.join(process.cwd(), 'sensitive-dump'), process.cwd()));
  assert.equal(assertOutsideRepo(path.join(scratch, 'backup'), process.cwd()), path.join(scratch, 'backup'));
});

test('service identity rejects both protected projects and wrong user', () => {
  const serviceFile = path.join(scratch, 'pg_service.conf');
  writeFileSync(serviceFile, `[isolated]\nhost=db.aaaaaaaaaaaaaaaaaaaa.supabase.co\nuser=postgres\nport=5432\n`);
  assert.doesNotThrow(() => assertServiceFile(serviceFile, 'isolated', 'aaaaaaaaaaaaaaaaaaaa'));
  assert.throws(() => assertServiceFile(serviceFile, 'isolated', PRODUCTION_REF));
  writeFileSync(serviceFile, `[isolated]\nhost=db.aaaaaaaaaaaaaaaaaaaa.supabase.co\nuser=postgres.${PRODUCTION_REF}\n`);
  assert.throws(() => assertServiceFile(serviceFile, 'isolated', 'aaaaaaaaaaaaaaaaaaaa'));
});

test('missing and modified backup files fail closed', async () => {
  const backup = path.join(scratch, 'backup');
  mkdirSync(backup);
  const files = [];
  for (const name of EXPORT_FILES) {
    const file = path.join(backup, name);
    writeFileSync(file, 'synthetic data\n');
    files.push({ name, bytes: 15, sha256: await sha256File(file) });
  }
  const manifest = { format: 'lumea-supabase-logical-v1', sourceRef: PRODUCTION_REF, files };
  writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest));
  await verifyBackup(backup);
  writeFileSync(path.join(backup, 'data.sql'), 'tampered\n');
  await assert.rejects(() => verifyBackup(backup), /mismatch/);
  writeFileSync(path.join(backup, 'data.sql'), 'synthetic data\n');
  manifest.files.pop();
  writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(() => verifyBackup(backup), /incomplete/);
});

test('public media guard rejects private, cross-project and path mismatch', () => {
  const entry = { bucket: 'public-media', key: 'products/example.png', url: `https://${PRODUCTION_REF}.supabase.co/storage/v1/object/public/public-media/products/example.png`, mime: 'image/png', bytes: 100 };
  assert.doesNotThrow(() => validatePublicMediaEntry(entry));
  assert.throws(() => validatePublicMediaEntry({ ...entry, bucket: 'private-uploads' }));
  assert.throws(() => validatePublicMediaEntry({ ...entry, url: `https://${STAGING_REF}.supabase.co/storage/v1/object/public/public-media/products/example.png` }));
  assert.throws(() => validatePublicMediaEntry({ ...entry, key: '../example.png' }));
  assert.doesNotThrow(() => assertImageSignature(Buffer.from('ffd8ffe000000000', 'hex'), 'image/jpeg'));
  assert.throws(() => assertImageSignature(Buffer.from('89504e470d0a1a0a', 'hex'), 'image/jpeg'));
});

test('default command cannot export or restore live data', () => {
  const result = spawnSync(process.execPath, [cli, 'plan', '--source-ref', PRODUCTION_REF], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /disabled/);
  const exportResult = spawnSync(process.execPath, [cli, 'export', '--source-ref', PRODUCTION_REF], { encoding: 'utf8' });
  assert.notEqual(exportResult.status, 0);
  const restoreResult = spawnSync(process.execPath, [cli, 'restore', '--source-ref', PRODUCTION_REF, '--destination-ref', PRODUCTION_REF], { encoding: 'utf8' });
  assert.notEqual(restoreResult.status, 0);
  assert.doesNotMatch(exportResult.stderr + restoreResult.stderr, /password|token|secret[_=]/i);
  const blockedOutput = path.join(scratch, 'must-not-be-created');
  const guarded = spawnSync(process.execPath, [cli, 'export', '--source-ref', PRODUCTION_REF, '--workdir', process.cwd(), '--output-dir', blockedOutput, '--supabase-cli', process.execPath], { encoding: 'utf8', env: { ...process.env, LUMEA_PRODUCTION_EXPORT_APPROVED: '' } });
  assert.notEqual(guarded.status, 0);
  assert.match(guarded.stderr, /Production export disabled/);
  assert.equal(guarded.stdout, '');
});

test('missing credentials and invalid destination prevent restore before any SQL', async () => {
  const result = spawnSync(process.execPath, [cli, 'restore', '--source-ref', PRODUCTION_REF, '--destination-ref', STAGING_REF, '--backup-dir', scratch], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Destination must be a new isolated project/);
  const backup = path.join(scratch, 'restore-ready');
  mkdirSync(backup);
  const files = [];
  for (const name of EXPORT_FILES) {
    const file = path.join(backup, name);
    writeFileSync(file, 'synthetic data\n');
    files.push({ name, bytes: 15, sha256: await sha256File(file) });
  }
  writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ format: 'lumea-supabase-logical-v1', sourceRef: PRODUCTION_REF, files }));
  writeFileSync(path.join(scratch, 'pg_service.conf'), '[isolated]\nhost=db.aaaaaaaaaaaaaaaaaaaa.supabase.co\nuser=postgres\n');
  const missing = spawnSync(process.execPath, [cli, 'restore', '--source-ref', PRODUCTION_REF, '--destination-ref', 'aaaaaaaaaaaaaaaaaaaa', '--backup-dir', backup, '--service-file', path.join(scratch, 'pg_service.conf'), '--service-name', 'isolated'], { encoding: 'utf8', env: { ...process.env, PGPASSFILE: '' } });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Private PGPASSFILE missing/);
});

test('public media backup detects corruption', async () => {
  const directory = path.join(scratch, 'media');
  mkdirSync(directory);
  const file = path.join(directory, 'object-001.jpg');
  writeFileSync(file, Buffer.from('ffd8ffe000000000', 'hex'));
  const manifest = { format: 'lumea-public-media-v1', sourceRef: PRODUCTION_REF, objects: [{ file: 'object-001.jpg', mime: 'image/jpeg', bytes: 8, sha256: await sha256File(file) }] };
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  const okay = spawnSync(process.execPath, [cli, 'storage-verify', '--backup-dir', directory], { encoding: 'utf8' });
  assert.equal(okay.status, 0, okay.stderr);
  writeFileSync(file, Buffer.from('ffd8ffe000000001', 'hex'));
  const bad = spawnSync(process.execPath, [cli, 'storage-verify', '--backup-dir', directory], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /Public media backup mismatch/);
});
