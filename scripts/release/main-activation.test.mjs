import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  MANIFEST_PATH,
  checkMainActivation,
  isCovered,
  loadActivationManifest,
  repoPathsReferencedBy,
} from './check-main-activation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

test('el repositorio cumple su propio manifiesto de activación', () => {
  const result = checkMainActivation(REPO_ROOT);
  assert.equal(result.ok, true, (result.errors ?? []).join(' '));
});

test('el procedimiento documentado copia exactamente las rutas del manifiesto', () => {
  const doc = readFileSync(join(REPO_ROOT, 'docs', 'R6_MAIN_ACTIVATION.md'), 'utf8').replace(/\r\n/g, '\n');
  const command = doc.match(/git checkout origin\/development -- \\\n([\s\S]*?)\n\n/)?.[1] ?? '';
  const documented = command.replace(/\\\n/g, ' ').split(/\s+/).filter(Boolean).sort();
  const manifest = loadActivationManifest(REPO_ROOT).paths.slice().sort();
  assert.deepEqual(documented, manifest);
});

test('cobertura por archivo o directorio, sin falsos prefijos', () => {
  assert.equal(isCovered('scripts/release/a.mjs', ['scripts/release']), true);
  assert.equal(isCovered('scripts/release', ['scripts/release']), true);
  assert.equal(isCovered('scripts/release-other/a.mjs', ['scripts/release']), false);
  assert.equal(isCovered('.gitignore', ['.gitignore']), true);
});

test('rutas citadas por un workflow: ignora placeholders y salidas', () => {
  const yaml = [
    'run: node scripts/release/a.mjs "$X"',
    'echo "plan en infra/terraform/environments/production/<bundle>/x"',
    'path: ${TF_DIR}/scripts/*.mjs',
    'cd config/release/',
  ].join('\n');
  const refs = repoPathsReferencedBy(yaml);
  assert.ok(refs.includes('scripts/release/a.mjs'));
  assert.ok(refs.includes('config/release'));
  assert.ok(!refs.some((r) => r.includes('<') || r.includes('*')));
});

test('detecta rutas ausentes, citas sin cubrir y huérfanos contra una referencia', () => {
  const dir = mkdtempSync(join(tmpdir(), 'maps-activation-'));
  const run = (...args) => {
    const res = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
  };
  try {
    run('init', '-q', '-b', 'main');
    run('config', 'user.email', 't@example.com');
    run('config', 'user.name', 't');
    run('config', 'commit.gpgsign', 'false');
    for (const d of ['scripts/release', 'scripts/other', 'config/release', '.github/workflows']) {
      mkdirSync(join(dir, d), { recursive: true });
    }
    writeFileSync(join(dir, 'scripts/release/a.mjs'), '//\n');
    writeFileSync(join(dir, 'scripts/release/old.mjs'), '//\n');
    writeFileSync(join(dir, 'scripts/other/b.mjs'), '//\n');
    writeFileSync(join(dir, '.github/workflows/release-promote.yml'), 'run: node scripts/other/b.mjs\n');
    writeFileSync(join(dir, MANIFEST_PATH), JSON.stringify({ paths: ['scripts/release', '.github/workflows/release-promote.yml'] }));
    run('add', '-A');
    run('commit', '-q', '-m', 'base');
    run('branch', 'ref'); // "main remoto": tiene old.mjs

    const uncovered = checkMainActivation(dir);
    assert.equal(uncovered.ok, false);
    assert.match(uncovered.errors.join(' '), /usa scripts\/other\/b\.mjs, que el manifiesto no cubre/);

    rmSync(join(dir, 'scripts/release/old.mjs'));
    writeFileSync(join(dir, MANIFEST_PATH), JSON.stringify({ paths: ['scripts/release', 'scripts/other', '.github/workflows/release-promote.yml', 'no-existe'] }));
    run('add', '-A');
    run('commit', '-q', '-m', 'sin old');
    const result = checkMainActivation(dir, { against: 'ref' });
    assert.equal(result.ok, false);
    const text = result.errors.join('\n');
    assert.match(text, /no-existe no existe/);
    assert.match(text, /ref tiene scripts\/release\/old\.mjs, que HEAD no tiene/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
