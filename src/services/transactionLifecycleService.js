'use strict';

const store = require('../store');
const { newTxId } = require('../utils/ids');

const STATES = Object.freeze({
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
});

const TERMINAL_STATES = new Set([STATES.CONFIRMED, STATES.FAILED]);
const TRANSITIONS = Object.freeze({
  [STATES.PENDING]: new Set([STATES.SUBMITTED, STATES.UNKNOWN, STATES.FAILED]),
  [STATES.SUBMITTED]: new Set([STATES.CONFIRMED, STATES.FAILED, STATES.UNKNOWN]),
  [STATES.UNKNOWN]: new Set([STATES.SUBMITTED, STATES.CONFIRMED, STATES.FAILED]),
  [STATES.CONFIRMED]: new Set(),
  [STATES.FAILED]: new Set(),
});
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 1000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

function nowMs(now) {
  const value = now === undefined ? Date.now() : Number(now);
  if (!Number.isFinite(value) || value < 0) throw new TypeError('now must be a non-negative timestamp');
  return value;
}

function ensureStore(target = store) {
  if (!target.transactionStates || typeof target.transactionStates.set !== 'function') {
    target.transactionStates = new Map();
  }
  return target.transactionStates;
}

function copy(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function transition(record, nextState, at) {
  if (record.status === nextState) return;
  if (!TRANSITIONS[record.status]?.has(nextState)) {
    throw new Error(`Invalid transaction transition ${record.status} -> ${nextState}`);
  }
  record.status = nextState;
  record.updatedAt = at;
  record.history.push({ status: nextState, at });
}

function backoffMs(attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS) {
  const base = Number(baseDelayMs);
  if (!Number.isFinite(base) || base < 0) throw new TypeError('baseDelayMs must be non-negative');
  return Math.min(MAX_BACKOFF_MS, base * (2 ** Math.max(0, attempt - 1)));
}

function create({
  operation,
  user,
  vaultId,
  idempotencyKey,
  correlationId,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  txHash,
  now,
  target = store,
} = {}) {
  if (!operation || !user || !vaultId) throw new TypeError('operation, user, and vaultId are required');
  if (!idempotencyKey) throw new TypeError('idempotencyKey is required');
  const attempts = Number(maxAttempts);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) throw new RangeError('maxAttempts must be between 1 and 20');
  const timestamp = nowMs(now);
  const states = ensureStore(target);
  const existing = Array.from(states.values()).find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) return copy(existing);
  const record = {
    txHash: txHash || newTxId(),
    operation,
    user,
    vaultId,
    idempotencyKey,
    correlationId: correlationId || null,
    status: STATES.PENDING,
    providerTxId: null,
    attempt: 0,
    maxAttempts: attempts,
    nextRetryAt: timestamp,
    lastError: null,
    history: [{ status: STATES.PENDING, at: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  states.set(record.txHash, record);
  return copy(record);
}

function get(txHash, target = store) {
  const record = ensureStore(target).get(txHash);
  return record ? copy(record) : null;
}

function requireRecord(txHash, target = store) {
  const record = ensureStore(target).get(txHash);
  if (!record) throw new Error(`Transaction ${txHash} not found`);
  return record;
}

function recordSubmitted(txHash, { providerTxId, now, target = store } = {}) {
  if (!providerTxId) throw new TypeError('providerTxId is required');
  const at = nowMs(now);
  const record = requireRecord(txHash, target);
  if (TERMINAL_STATES.has(record.status)) return copy(record);
  if (record.providerTxId && record.providerTxId !== providerTxId) {
    throw new Error('A transaction cannot be rebound to another provider identifier');
  }
  if (record.status === STATES.SUBMITTED && record.providerTxId === providerTxId) {
    return copy(record);
  }
  transition(record, STATES.SUBMITTED, at);
  record.providerTxId = providerTxId;
  record.attempt += 1;
  record.nextRetryAt = at + backoffMs(record.attempt);
  return copy(record);
}

function resolve(txHash, outcome, { providerTxId, error, now, target = store } = {}) {
  const at = nowMs(now);
  const record = requireRecord(txHash, target);
  if (record.providerTxId && providerTxId && record.providerTxId !== providerTxId) {
    throw new Error('Provider transaction identifier does not match the submitted transaction');
  }
  if (TERMINAL_STATES.has(record.status)) return copy(record);
  if (outcome === 'confirmed') {
    transition(record, STATES.CONFIRMED, at);
    record.nextRetryAt = null;
    record.lastError = null;
  } else if (outcome === 'failed') {
    transition(record, STATES.FAILED, at);
    record.nextRetryAt = null;
    record.lastError = error ? copy(error) : { code: 'PROVIDER_FAILED', message: 'Provider rejected the transaction' };
  } else if (outcome === 'unknown') {
    transition(record, STATES.UNKNOWN, at);
    record.nextRetryAt = at + backoffMs(record.attempt || 1);
    record.lastError = error ? copy(error) : { code: 'PROVIDER_UNKNOWN', message: 'Provider outcome is unknown' };
  } else {
    throw new TypeError('outcome must be confirmed, failed, or unknown');
  }
  return copy(record);
}

function retryable(txHash, { now, target = store } = {}) {
  const at = nowMs(now);
  const record = requireRecord(txHash, target);
  if (TERMINAL_STATES.has(record.status) || record.attempt >= record.maxAttempts) return copy(record);
  if (record.nextRetryAt !== null && record.nextRetryAt > at) return copy(record);
  transition(record, STATES.SUBMITTED, at);
  record.attempt += 1;
  record.nextRetryAt = at + backoffMs(record.attempt);
  return copy(record);
}

function pending({ now, target = store } = {}) {
  const at = nowMs(now);
  return Array.from(ensureStore(target).values())
    .filter((record) => !TERMINAL_STATES.has(record.status) && record.attempt < record.maxAttempts && record.nextRetryAt <= at)
    .map(copy);
}

function resume({ now, target = store } = {}) {
  return pending({ now, target }).map((record) => retryable(record.txHash, { now, target }));
}

function publicStatus(txHash, target = store) {
  const record = requireRecord(txHash, target);
  return {
    txHash: record.txHash,
    operation: record.operation,
    status: record.status,
    providerTxId: record.providerTxId,
    attempt: record.attempt,
    maxAttempts: record.maxAttempts,
    nextRetryAt: record.nextRetryAt,
    lastError: copy(record.lastError),
    correlationId: record.correlationId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Register the synchronous mock provider result while preserving the same
 * lifecycle used by asynchronous providers. Production adapters can stop
 * after `recordSubmitted` and resolve the record from a worker later.
 */
function registerProviderResult({ tx, user, vaultId, idempotencyKey, correlationId, target = store } = {}) {
  if (!tx || !tx.txHash || !tx.operation) throw new TypeError('A provider transaction is required');
  const existing = Array.from(ensureStore(target).values()).find(
    (record) => idempotencyKey && record.idempotencyKey === idempotencyKey
  );
  if (existing) return publicStatus(existing.txHash, target);
  const timestamp = Date.parse(tx.timestamp) || Date.now();
  const record = create({
    txHash: tx.txHash,
    operation: tx.operation,
    user,
    vaultId,
    idempotencyKey: idempotencyKey || tx.txHash,
    correlationId,
    now: timestamp,
    target,
  });
  recordSubmitted(record.txHash, { providerTxId: tx.txHash, now: timestamp, target });
  resolve(record.txHash, tx.status === 'SUCCESS' ? 'confirmed' : 'unknown', { providerTxId: tx.txHash, now: timestamp, target });
  return publicStatus(record.txHash, target);
}

module.exports = {
  DEFAULT_MAX_ATTEMPTS,
  MAX_BACKOFF_MS,
  STATES,
  backoffMs,
  create,
  get,
  pending,
  publicStatus,
  recordSubmitted,
  registerProviderResult,
  resolve,
  resume,
  retryable,
};
