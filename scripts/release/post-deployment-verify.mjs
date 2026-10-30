/**
 * Informe estructurado post apply (promoción o rollback).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { PUBLIC_SMOKE_STATUS, verifyCloudRunDigests } from './post-promotion-verify.mjs';

/**
 * @param {object} input
 * @param {Record<string, string>} input.expectedImages
 * @param {{ ok: boolean, errors?: string[] }} [input.cloudRunVerify]
 * @param {string} [input.healthCheckStatus]
 */
export function buildPostDeploymentVerifyReport(input) {
  const errors = [];
  const cloudRun = input.cloudRunVerify ?? { ok: true };

  if (!cloudRun.ok) {
    errors.push(...(cloudRun.errors ?? ['Cloud Run no verificado.']));
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    cloud_run: cloudRun.ok
      ? { verified: true, expected: input.expectedImages }
      : { verified: false, errors: cloudRun.errors },
    health_checks: input.healthCheckStatus ?? 'not_run_in_ci',
    public_smoke: PUBLIC_SMOKE_STATUS,
    terraform_state: input.terraformStateNote ?? 'Verificar manualmente state vs revisiones.',
  };
}

/**
 * @param {Record<string, string>} expectedImages
 * @param {{ project?: string, region?: string, runVerify?: boolean }} [options]
 */
export function runPostDeploymentVerification(expectedImages, options = {}) {
  if (options.runVerify === false) {
    return buildPostDeploymentVerifyReport({
      expectedImages,
      cloudRunVerify: { ok: true },
      healthCheckStatus: 'skipped_offline',
    });
  }
  const cloudRunVerify = verifyCloudRunDigests(expectedImages, options);
  return buildPostDeploymentVerifyReport({ expectedImages, cloudRunVerify });
}

/**
 * @param {object} postVerify
 * @param {Record<string, unknown>} promotionReport
 */
export function summarizeDeploymentOutcome(postVerify, promotionReport) {
  const success = postVerify.ok === true;
  return {
    outcome: success ? 'succeeded' : 'partial',
    operation: promotionReport.operation ?? 'forward',
    git_sha: promotionReport.git_sha,
    replaced: promotionReport.rollback_from ?? null,
    restored: success ? promotionReport.images : null,
    post_verify: postVerify,
    declare_success: success,
    message: success
      ? 'Despliegue verificado (sin smoke público del dominio).'
      : 'Estado parcial: revisar Cloud Run / health checks antes de declarar éxito.',
  };
}

/**
 * @param {Record<string, unknown>} report
 */
export function expectedImagesFromPromotionReport(report) {
  const images = /** @type {Record<string, string>} */ (report.images ?? {});
  return {
    frontend_image: images.frontend_image ?? images.frontend,
    backend_image: images.backend_image ?? images.backend,
    jobs_image: images.jobs_image ?? images.jobs,
  };
}

function runCli(argv) {
  const args = Object.fromEntries(
    argv
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, v] = a.slice(2).split('=');
        return [k, v ?? 'true'];
      }),
  );
  const reportPath = args.report;
  if (!reportPath) {
    process.stderr.write(
      'Uso: node post-deployment-verify.mjs --report=promotion-report.json [--out=post-verify.json] [--offline]\n',
    );
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const expected = expectedImagesFromPromotionReport(report);
  const result = runPostDeploymentVerification(expected, {
    runVerify: args.offline !== 'true',
  });
  const summary = summarizeDeploymentOutcome(result, report);
  const payload = { ...result, summary };
  if (args.out) {
    writeFileSync(args.out, JSON.stringify(payload, null, 2));
  }
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (!result.ok) {
    process.exit(1);
  }
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}
