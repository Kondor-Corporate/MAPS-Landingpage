#!/usr/bin/env node
/**
 * Descarga objetos promotion/deployments/*.json del bucket (solo lectura).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { GCS_DEPLOYMENT_REGISTRY_PREFIX } from './deployment-registry-contract.mjs';
import { parseDeploymentRegistry } from './deployment-registry.mjs';

/**
 * @param {string} bucket
 */
export function listDeploymentObjectNames(bucket) {
  const prefix = `gs://${bucket}/${GCS_DEPLOYMENT_REGISTRY_PREFIX}/`;
  const result = spawnSync(
    'gsutil',
    ['ls', `${prefix}*.json`],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      errors: [(result.stderr || result.stdout || 'gsutil ls falló').trim()],
    };
  }
  const names = result.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.endsWith('.json'));
  return { ok: true, objectUrls: names };
}

/**
 * @param {string[]} objectUrls
 */
export function downloadDeploymentRecords(objectUrls) {
  const errors = [];
  /** @type {unknown[]} */
  const records = [];
  for (const url of objectUrls) {
    const cat = spawnSync('gsutil', ['cat', url], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (cat.status !== 0) {
      errors.push(`No se pudo leer ${url}`);
      continue;
    }
    try {
      records.push(JSON.parse(cat.stdout));
    } catch {
      errors.push(`JSON inválido en ${url}`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors, records };
  }
  return { ok: true, records };
}

/**
 * @param {string} bucket
 */
export function fetchDeploymentRegistryFromGcs(bucket) {
  const listed = listDeploymentObjectNames(bucket);
  if (!listed.ok) {
    return listed;
  }
  const downloaded = downloadDeploymentRecords(listed.objectUrls ?? []);
  if (!downloaded.ok) {
    return downloaded;
  }
  const parsed = parseDeploymentRegistry(downloaded.records ?? []);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, records: parsed.records };
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
  if (!args.bucket) {
    process.stderr.write('Uso: node fetch-deployment-registry.mjs --bucket=B [--out=registry.json]\n');
    process.exit(2);
  }
  const result = fetchDeploymentRegistryFromGcs(args.bucket);
  if (!result.ok) {
    for (const e of result.errors ?? []) {
      process.stderr.write(`error: ${e}\n`);
    }
    process.exit(1);
  }
  const json = JSON.stringify(result.records, null, 2);
  if (args.out) {
    writeFileSync(args.out, json);
    process.stdout.write(`Registro en ${args.out}\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli(process.argv.slice(2));
}

export { parseDeploymentRegistry };
