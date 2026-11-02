#!/usr/bin/env node
/**
 * Verifica el manifiesto de activación en main (config/release/main-activation-paths.json).
 *
 *   node scripts/release/check-main-activation.mjs
 *       Local: cada ruta existe y está versionada, y todo archivo del repositorio que los
 *       workflows de release citan está cubierto por el manifiesto.
 *
 *   node scripts/release/check-main-activation.mjs --against=origin/main
 *       Además compara con esa referencia: lista lo que cambiaría y falla si la referencia
 *       tiene archivos bajo esas rutas que HEAD no tiene (un checkout por rutas no los borra,
 *       así que quedarían sobrando en main).
 *
 * Solo lee Git local. No hace fetch, checkout, commit ni push.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MANIFEST_PATH = 'config/release/main-activation-paths.json';
const WORKFLOWS = ['ci.yml', 'release-build.yml', 'release-promote.yml'];

/** @param {string} repoRoot */
export function loadActivationManifest(repoRoot) {
  return JSON.parse(readFileSync(join(repoRoot, MANIFEST_PATH), 'utf8'));
}

/**
 * @param {string} file ruta relativa con "/"
 * @param {string[]} paths entradas del manifiesto (archivo o directorio)
 */
export function isCovered(file, paths) {
  return paths.some((p) => file === p || file.startsWith(`${p}/`));
}

/**
 * Rutas del repositorio que un workflow cita en `run:`/`with:`. Se ignoran placeholders
 * (<…>, $…, *) y rutas de salida como promotion-bundle/, que no son parte del repositorio.
 *
 * @param {string} yaml
 */
export function repoPathsReferencedBy(yaml) {
  const found = new Set();
  for (const m of yaml.matchAll(/\b((?:scripts|config|infra|docs|backend|frontend)\/[A-Za-z0-9_./-]+)/g)) {
    const raw = m[1].replace(/[./-]+$/, '');
    if (/[<>*$]/.test(raw)) {
      continue;
    }
    found.add(raw);
  }
  return [...found];
}

/** @param {string} repoRoot @param {string[]} args */
function git(repoRoot, args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: (result.stderr ?? '').trim() };
}

/**
 * @param {string} repoRoot
 * @param {{ against?: string }} [options]
 */
export function checkMainActivation(repoRoot, options = {}) {
  const errors = [];
  const manifest = loadActivationManifest(repoRoot);
  const paths = manifest.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ok: false, errors: ['El manifiesto no declara rutas.'] };
  }

  // Versionados o pendientes de versionar (no ignorados): el chequeo sirve antes del commit.
  const tracked = git(repoRoot, ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...paths]);
  if (tracked.status !== 0) {
    return { ok: false, errors: [`git ls-files falló: ${tracked.stderr}`] };
  }
  const trackedFiles = tracked.stdout.split(/\r?\n/).filter(Boolean);

  for (const p of paths) {
    if (!existsSync(join(repoRoot, p))) {
      errors.push(`La ruta ${p} no existe en el árbol de trabajo.`);
    } else if (!trackedFiles.some((f) => isCovered(f, [p]))) {
      errors.push(`La ruta ${p} no tiene archivos versionados (¿sin git add?).`);
    }
  }

  // Todo archivo del repositorio que citan los workflows debe viajar a main.
  for (const workflow of WORKFLOWS) {
    const yamlPath = join(repoRoot, '.github', 'workflows', workflow);
    if (!existsSync(yamlPath)) {
      continue;
    }
    for (const ref of repoPathsReferencedBy(readFileSync(yamlPath, 'utf8'))) {
      if (!existsSync(join(repoRoot, ref))) {
        continue; // salida generada o ejemplo, no un archivo del repositorio
      }
      if (!isCovered(ref, paths) && !/^(backend|frontend)\//.test(ref)) {
        errors.push(`${workflow} usa ${ref}, que el manifiesto no cubre.`);
      }
    }
  }

  const summary = { files: trackedFiles.length };
  if (options.against) {
    const ref = options.against;
    const exists = git(repoRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    if (exists.status !== 0) {
      errors.push(`La referencia ${ref} no existe localmente (hacer fetch antes).`);
    } else {
      const there = git(repoRoot, ['ls-tree', '-r', '--name-only', ref, '--', ...paths]);
      const remoteFiles = there.stdout.split(/\r?\n/).filter(Boolean);
      const orphans = remoteFiles.filter((f) => !trackedFiles.includes(f));
      for (const f of orphans) {
        errors.push(`${ref} tiene ${f}, que HEAD no tiene: el checkout por rutas no lo elimina.`);
      }
      const diff = git(repoRoot, ['diff', '--name-status', ref, 'HEAD', '--', ...paths]);
      summary.changes = diff.stdout.split(/\r?\n/).filter(Boolean);
    }
  }

  return errors.length > 0 ? { ok: false, errors, summary } : { ok: true, summary };
}

function runCli(argv) {
  const against = argv.find((a) => a.startsWith('--against='))?.slice('--against='.length);
  const result = checkMainActivation(process.cwd(), { against });
  if (!result.ok) {
    for (const e of result.errors) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(`Manifiesto de activación OK (${result.summary.files} archivos versionados).\n`);
  if (result.summary.changes) {
    process.stdout.write(`Cambios respecto de ${against}: ${result.summary.changes.length}\n`);
    for (const line of result.summary.changes) {
      process.stdout.write(`  ${line}\n`);
    }
  }
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
