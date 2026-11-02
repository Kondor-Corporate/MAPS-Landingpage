/**
 * Compatibilidad de esquema Prisma al retroceder imágenes (sin migrate down).
 */

import { listNewMigrationFolders } from './detect-prisma-migrations.mjs';

/**
 * @param {object} input
 * @param {string} input.repoRoot
 * @param {string} input.targetGitSha
 * @param {string} input.currentGitSha
 * @param {Record<string, unknown> | null | undefined} input.schemaApproval
 * @param {string} [input.verifyRunId]
 * @param {string} [input.targetDeploymentId]
 */
export function evaluateRollbackSchemaRisk(input) {
  const errors = [];
  const target = input.targetGitSha;
  const current = input.currentGitSha;

  if (target === current) {
    errors.push('Rollback: target y current git_sha son iguales.');
    return { ok: false, errors, requires_human_schema_review: false };
  }

  const diff = listNewMigrationFolders(input.repoRoot, target, current);
  if (!diff.ok) {
    return {
      ok: false,
      errors: [
        ...(diff.errors ?? ['No se pudo evaluar migraciones para rollback.']),
        'Sin diff fiable no hay rollback de imágenes. Recuperación: backup de Cloud SQL (runbook), no migrate down.',
      ],
      requires_human_schema_review: true,
      automatic_assessment: false,
    };
  }

  const folders = diff.newMigrationFolders ?? [];
  if (folders.length > 0) {
    return {
      ok: false,
      errors: [
        `Hay ${folders.length} migración(es) entre el target y la versión actual (${folders.join(', ')}).`,
        'La presencia de carpetas no demuestra compatibilidad. El rollback de imágenes queda bloqueado.',
        'La identidad de deploy no acepta una auto-aprobación de esquema. Si el código anterior no tolera el esquema, restaurar desde backup.',
      ],
      requires_human_schema_review: true,
      migrations_since_target: folders,
      automatic_assessment: true,
    };
  }

  return {
    ok: true,
    requires_human_schema_review: false,
    migrations_since_target: [],
    schema_compatible_assumption: 'Sin migraciones Prisma nuevas entre target y versión actual.',
    automatic_assessment: true,
  };
}
