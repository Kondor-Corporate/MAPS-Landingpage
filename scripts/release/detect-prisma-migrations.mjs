/**
 * Detecta migraciones Prisma nuevas entre baseline y SHA objetivo (git local).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { validateProductionBaseline } from './validate-production-baseline.mjs';

const MIGRATIONS_DIR = 'backend/prisma/migrations';

/**
 * @param {string} repoRoot
 * @param {string} fromSha
 * @param {string} toSha
 * @param {{ gitPath?: string }} [options]
 */
export function listNewMigrationFolders(repoRoot, fromSha, toSha, options = {}) {
  const git = options.gitPath ?? 'git';
  const errors = [];

  if (!existsSync(join(repoRoot, MIGRATIONS_DIR))) {
    return { ok: false, errors: [`No existe ${MIGRATIONS_DIR}.`] };
  }

  const diff = spawnSync(
    git,
    ['diff', '--name-only', `${fromSha}..${toSha}`, '--', MIGRATIONS_DIR],
    { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (diff.status !== 0) {
    errors.push(
      `git diff de migraciones falló: ${(diff.stderr || diff.stdout || '').trim() || 'sin salida'}`,
    );
    return { ok: false, errors };
  }

  const paths = diff.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const folders = [
    ...new Set(
      paths
        .map((p) => {
          const parts = p.split('/');
          const idx = parts.indexOf('migrations');
          return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
        })
        .filter(Boolean),
    ),
  ];

  return { ok: true, newMigrationFolders: folders, paths };
}

/**
 * @param {Record<string, unknown>} baseline
 * @param {string} targetSha
 * @param {string} repoRoot
 */
export function buildMigrationPromotionReport(baseline, targetSha, repoRoot) {
  const baselineCheck = validateProductionBaseline(baseline);
  if (!baselineCheck.ok) {
    return {
      ok: false,
      errors: baselineCheck.errors,
      automatic_migration_comparison: false,
    };
  }

  const baselineSha = /** @type {string} */ (baseline.git_sha);
  const diff = listNewMigrationFolders(repoRoot, baselineSha, targetSha);
  if (!diff.ok) {
    return { ok: false, errors: diff.errors ?? ['Error al diff migraciones.'] };
  }

  const newFolders = diff.newMigrationFolders ?? [];
  return {
    ok: true,
    baseline_git_sha: baselineSha,
    target_git_sha: targetSha,
    new_migration_folders: newFolders,
    requires_jobs_first_apply: newFolders.length > 0,
    requires_human_schema_review: newFolders.length > 0,
    automatic_migration_comparison: true,
    recommended_plan_modes: newFolders.length > 0
      ? ['jobs-only', 'services-only']
      : ['full'],
    notes: newFolders.length > 0
      ? 'Aplicar jobs-only, ejecutar maps-prod-migrate, luego services-only. Revisar compatibilidad con la revisión anterior.'
      : 'Un solo plan full puede actualizar las tres imágenes.',
  };
}
