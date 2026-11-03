#!/usr/bin/env node
/**
 * Validación estricta de los inputs de release-promote.yml.
 *
 * El workflow pasa cada input por una variable de entorno y este script es la única
 * barrera antes de que otros pasos los usen. Así ningún valor externo se interpreta
 * como shell: los pasos posteriores solo reciben datos que ya cumplieron un patrón.
 */

import { pathToFileURL } from 'node:url';

import { PLAN_MODES } from './promotion-plan-contract.mjs';

const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const NUMERIC_ID_RE = /^[0-9]{1,20}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const DEPLOYMENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const BUCKET_RE = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateWorkflowInputs(env) {
  const errors = [];
  const value = (name) => (env[name] ?? '').trim();

  const phase = value('PHASE');
  const operation = value('OPERATION');
  const planMode = value('PLAN_MODE') || 'full';

  if (phase !== 'verify' && phase !== 'apply' && phase !== 'wif-read') {
    errors.push('phase debe ser verify, apply o wif-read.');
  }
  if (phase === 'wif-read') {
    if (!GIT_SHA_RE.test(value('GIT_SHA'))) {
      errors.push('git_sha debe ser 40 hex en minúscula.');
    }
    if (!NUMERIC_ID_RE.test(value('RELEASE_BUILD_RUN_ID'))) {
      errors.push('wif-read exige release_build_run_id numérico del release-build.');
    }
    if (!NUMERIC_ID_RE.test(value('VERIFY_RUN_ID'))) {
      errors.push('wif-read exige verify_run_id numérico del binding ya subido.');
    }
    if (!PLAN_MODES.includes(planMode)) {
      errors.push(`plan_mode debe ser uno de: ${PLAN_MODES.join(', ')}.`);
    }
    if (value('PLAN_SHA256') || value('TARGET_DEPLOYMENT_ID')) {
      errors.push('wif-read no acepta plan_sha256 ni target_deployment_id.');
    }
    if (!BUCKET_RE.test(value('STATE_BUCKET'))) {
      errors.push('TF_STATE_BUCKET ausente o con formato de bucket inválido.');
    }
    return { ok: errors.length === 0, errors };
  }
  if (operation !== 'promote' && operation !== 'rollback') {
    errors.push('operation debe ser promote o rollback.');
  }
  if (!PLAN_MODES.includes(planMode)) {
    errors.push(`plan_mode debe ser uno de: ${PLAN_MODES.join(', ')}.`);
  }
  if (!GIT_SHA_RE.test(value('GIT_SHA'))) {
    errors.push('git_sha debe ser 40 hex en minúscula.');
  }

  const buildRunId = value('RELEASE_BUILD_RUN_ID');
  if (operation === 'promote' && !NUMERIC_ID_RE.test(buildRunId)) {
    errors.push('release_build_run_id debe ser numérico en una promoción.');
  }
  if (operation === 'rollback' && buildRunId !== '' && !NUMERIC_ID_RE.test(buildRunId)) {
    errors.push('release_build_run_id debe ser numérico o estar vacío (baseline R5).');
  }

  const target = value('TARGET_DEPLOYMENT_ID');
  if (operation === 'rollback') {
    if (!DEPLOYMENT_ID_RE.test(target)) {
      errors.push('rollback exige target_deployment_id (letras, números, guiones; máx. 64).');
    }
    if (phase === 'apply' && planMode !== 'full') {
      errors.push('rollback solo admite plan_mode full.');
    }
  } else if (operation === 'promote' && target !== '') {
    errors.push('target_deployment_id solo aplica a rollback.');
  }

  if (phase === 'apply') {
    if (!NUMERIC_ID_RE.test(value('VERIFY_RUN_ID'))) {
      errors.push('apply exige verify_run_id numérico.');
    }
    if (!SHA256_RE.test(value('PLAN_SHA256'))) {
      errors.push('apply exige plan_sha256 de 64 hex en minúscula.');
    }
  }

  const bucket = value('STATE_BUCKET');
  if (env.STATE_BUCKET !== undefined && !BUCKET_RE.test(bucket)) {
    errors.push('TF_STATE_BUCKET ausente o con formato de bucket inválido.');
  }

  return { ok: errors.length === 0, errors };
}

function runCli() {
  const result = validateWorkflowInputs(process.env);
  if (!result.ok) {
    for (const e of result.errors) {
      process.stderr.write(`::error::${e}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('Inputs del workflow válidos.\n');
}

const isMain =
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli();
}
