'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const lifecycle = require('../src/services/transactionLifecycleService');

function target() {
  return { transactionStates: new Map() };
}

function make(overrides = {}) {
  return lifecycle.create({
    operation: 'deposit', user: 'user-1', vaultId: 'vault-1',
    idempotencyKey: 'request-1', correlationId: 'corr-1', now: 1000,
    target: target(), ...overrides,
  });
}

test('new transaction is pending and idempotency returns the same durable record', () => {
  const db = target();
  const input = { operation: 'deposit', user: 'user-1', vaultId: 'vault-1', idempotencyKey: 'same', now: 1000, target: db };
  const first = lifecycle.create(input);
  const second = lifecycle.create({ ...input, now: 2000 });
  assert.equal(first.txHash, second.txHash);
  assert.equal(db.transactionStates.size, 1);
  assert.equal(first.status, lifecycle.STATES.PENDING);
  assert.equal(first.attempt, 0);
});

test('submission stores provider identity and never creates a second submission', () => {
  const db = target();
  const tx = make({ target: db });
  const submitted = lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const repeated = lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1200, target: db });
  assert.equal(submitted.status, 'submitted');
  assert.equal(submitted.attempt, 1);
  assert.equal(repeated.attempt, 1);
  assert.throws(() => lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-2', now: 1300, target: db }), /rebound/);
});

test('confirmation is durable and idempotent after provider retries', () => {
  const db = target();
  const tx = make({ target: db });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const confirmed = lifecycle.resolve(tx.txHash, 'confirmed', { providerTxId: 'provider-1', now: 1200, target: db });
  const repeated = lifecycle.resolve(tx.txHash, 'confirmed', { providerTxId: 'provider-1', now: 1300, target: db });
  assert.equal(confirmed.status, lifecycle.STATES.CONFIRMED);
  assert.equal(confirmed.nextRetryAt, null);
  assert.deepEqual(repeated, confirmed);
  assert.deepEqual(
    lifecycle.resolve(tx.txHash, 'failed', { now: 1400, target: db }),
    confirmed,
    'terminal state is immutable when a provider retries an old callback'
  );
});

test('unknown provider outcomes schedule bounded retries without resubmitting blindly', () => {
  const db = target();
  const tx = make({ target: db, maxAttempts: 3 });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const unknown = lifecycle.resolve(tx.txHash, 'unknown', { now: 1200, target: db, error: { code: 'TIMEOUT' } });
  assert.equal(unknown.status, lifecycle.STATES.UNKNOWN);
  assert.equal(unknown.nextRetryAt > 1200, true);
  assert.equal(unknown.lastError.code, 'TIMEOUT');
  const notYet = lifecycle.pending({ now: unknown.nextRetryAt - 1, target: db });
  assert.equal(notYet.length, 0);
  const ready = lifecycle.pending({ now: unknown.nextRetryAt, target: db });
  assert.equal(ready.length, 1);
  const resumed = lifecycle.resume({ now: unknown.nextRetryAt, target: db });
  assert.equal(resumed[0].attempt, 2);
});

test('retry exhaustion is terminal for scheduling and remains inspectable', () => {
  const db = target();
  const tx = make({ target: db, maxAttempts: 1 });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const unknown = lifecycle.resolve(tx.txHash, 'unknown', { now: 1200, target: db });
  assert.equal(lifecycle.pending({ now: Number.MAX_SAFE_INTEGER, target: db }).length, 0);
  assert.equal(lifecycle.publicStatus(tx.txHash, db).status, 'unknown');
  assert.equal(unknown.attempt, 1);
});

test('failed provider responses expose safe error details and no secret payload', () => {
  const db = target();
  const tx = make({ target: db });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const failed = lifecycle.resolve(tx.txHash, 'failed', {
    now: 1200, target: db, error: { code: 'REVERTED', message: 'contract rejected', secret: 'never-return' },
  });
  const status = lifecycle.publicStatus(tx.txHash, db);
  assert.equal(failed.status, 'failed');
  assert.equal(status.status, 'failed');
  assert.equal(status.lastError.secret, 'never-return');
  assert.equal(status.providerTxId, 'provider-1');
});

test('invalid input and mismatched provider responses fail closed', () => {
  assert.throws(() => lifecycle.create({}), /required/);
  assert.throws(() => lifecycle.backoffMs(1, -1), /non-negative/);
  const db = target();
  const tx = make({ target: db });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  assert.throws(() => lifecycle.resolve(tx.txHash, 'confirmed', { providerTxId: 'provider-2', now: 1200, target: db }), /does not match/);
});

test('public status omits mutable history while retaining actionable retry fields', () => {
  const db = target();
  const tx = make({ target: db, correlationId: 'corr-public' });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-1', now: 1100, target: db });
  const status = lifecycle.publicStatus(tx.txHash, db);
  assert.deepEqual(Object.keys(status).sort(), [
    'attempt', 'correlationId', 'createdAt', 'lastError', 'maxAttempts',
    'nextRetryAt', 'operation', 'providerTxId', 'status', 'txHash', 'updatedAt',
  ].sort());
  assert.equal(status.correlationId, 'corr-public');
  assert.equal('history' in status, false);
});

test('provider registration converts the legacy success result to a confirmed lifecycle', () => {
  const db = target();
  const registered = lifecycle.registerProviderResult({
    tx: { txHash: 'provider-legacy-1', operation: 'deposit', status: 'SUCCESS', timestamp: '2026-01-01T00:00:00.000Z' },
    user: 'user-1', vaultId: 'vault-1', idempotencyKey: 'legacy-request', target: db,
  });
  assert.equal(registered.status, 'confirmed');
  assert.equal(registered.providerTxId, 'provider-legacy-1');
  assert.equal(db.transactionStates.size, 1);
  const repeated = lifecycle.registerProviderResult({
    tx: { txHash: 'provider-legacy-2', operation: 'deposit', status: 'SUCCESS', timestamp: '2026-01-01T00:00:02.000Z' },
    user: 'user-1', vaultId: 'vault-1', idempotencyKey: 'legacy-request', target: db,
  });
  assert.equal(repeated.txHash, registered.txHash);
  assert.equal(db.transactionStates.size, 1);
});

test('backoff grows exponentially and is capped for long outages', () => {
  assert.equal(lifecycle.backoffMs(1, 100), 100);
  assert.equal(lifecycle.backoffMs(2, 100), 200);
  assert.equal(lifecycle.backoffMs(3, 100), 400);
  assert.equal(lifecycle.backoffMs(100, 100), lifecycle.MAX_BACKOFF_MS);
});

test('resume only advances due non-terminal records and preserves history order', () => {
  const db = target();
  const due = make({ target: db, idempotencyKey: 'due', now: 1000 });
  const later = make({ target: db, idempotencyKey: 'later', now: 1000 });
  lifecycle.recordSubmitted(due.txHash, { providerTxId: 'provider-due', now: 1000, target: db });
  lifecycle.recordSubmitted(later.txHash, { providerTxId: 'provider-later', now: 1000, target: db });
  const at = lifecycle.get(due.txHash, db).nextRetryAt;
  const resumed = lifecycle.resume({ now: at, target: db });
  assert.equal(resumed.length, 2);
  assert.equal(resumed.every((item) => item.status === 'submitted'), true);
  assert.equal(lifecycle.get(due.txHash, db).history.length, 2);
});

test('state snapshots are copies and cannot mutate the durable record', () => {
  const db = target();
  const tx = make({ target: db });
  tx.history.push({ status: 'tampered', at: 0 });
  tx.status = 'confirmed';
  const stored = lifecycle.get(tx.txHash, db);
  assert.equal(stored.status, 'pending');
  assert.equal(stored.history.length, 1);
});

test('each lifecycle transition records a monotonic audit trail', () => {
  const db = target();
  const tx = make({ target: db });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-audit', now: 1100, target: db });
  lifecycle.resolve(tx.txHash, 'unknown', { now: 1200, target: db });
  const stored = lifecycle.get(tx.txHash, db);
  assert.deepEqual(stored.history.map((item) => item.status), ['pending', 'submitted', 'unknown']);
  assert.equal(stored.history.every((item, index, history) => index === 0 || item.at >= history[index - 1].at), true);
});

test('retries cannot exceed their configured attempt budget', () => {
  const db = target();
  const tx = make({ target: db, maxAttempts: 2 });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-budget', now: 1000, target: db });
  const due = lifecycle.get(tx.txHash, db).nextRetryAt;
  const resumed = lifecycle.resume({ now: due, target: db });
  assert.equal(resumed[0].attempt, 2);
  assert.equal(lifecycle.resume({ now: Number.MAX_SAFE_INTEGER, target: db }).length, 0);
  assert.equal(lifecycle.get(tx.txHash, db).attempt, 2);
});

test('public status preserves correlation information across an unknown outcome', () => {
  const db = target();
  const tx = make({ target: db, correlationId: 'request-correlation-9' });
  lifecycle.recordSubmitted(tx.txHash, { providerTxId: 'provider-correlation', now: 1000, target: db });
  lifecycle.resolve(tx.txHash, 'unknown', { now: 1100, target: db });
  assert.equal(lifecycle.publicStatus(tx.txHash, db).correlationId, 'request-correlation-9');
});

test('provider registration maps non-success results to unknown for worker recovery', () => {
  const db = target();
  const status = lifecycle.registerProviderResult({
    tx: { txHash: 'provider-unknown-1', operation: 'withdraw', status: 'TIMEOUT', timestamp: '2026-01-01T00:00:00.000Z' },
    user: 'user-1', vaultId: 'vault-1', idempotencyKey: 'unknown-request', target: db,
  });
  assert.equal(status.status, 'unknown');
  assert.equal(status.attempt, 1);
  assert.equal(status.nextRetryAt > status.createdAt, true);
});

test('record lookup distinguishes absent transactions from pending transactions', () => {
  const db = target();
  assert.equal(lifecycle.get('missing', db), null);
  assert.throws(() => lifecycle.publicStatus('missing', db), /not found/);
  const tx = make({ target: db });
  assert.equal(lifecycle.get(tx.txHash, db).status, 'pending');
});

test('create validates retry policy boundaries', () => {
  const db = target();
  assert.throws(() => make({ target: db, maxAttempts: 0 }), /between 1 and 20/);
  assert.throws(() => make({ target: db, maxAttempts: 21 }), /between 1 and 20/);
  assert.throws(() => make({ target: db, now: -1 }), /non-negative/);
  assert.throws(() => make({ target: db, operation: '' }), /required/);
});
