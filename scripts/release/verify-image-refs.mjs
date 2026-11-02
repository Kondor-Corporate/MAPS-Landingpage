#!/usr/bin/env node
/** Comprueba que los tres digests del reporte sigan en Artifact Registry. */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { verifyImmutableImageRef } from './gcp-artifact-verify.mjs';

/**
 * @param {Record<string, string>} images
 * @param {{ runGcloudFn?: Function }} [options]
 */
export function verifyReportImageRefs(images, options = {}) {
  const errors = [];
  for (const key of ['frontend_image', 'backend_image', 'jobs_image']) {
    const result = verifyImmutableImageRef(images[key], options);
    if (!result.ok) {
      errors.push(...(result.errors ?? [`${key} inválida.`]));
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}

function runCli(argv) {
  const file = argv[0];
  if (!file) {
    process.stderr.write('Uso: node verify-image-refs.mjs promotion-report.json\n');
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const result = verifyReportImageRefs(report.images ?? {});
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('Digests presentes en Artifact Registry.\n');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli(process.argv.slice(2));
}
