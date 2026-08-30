'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/store');
const positionService = require('../src/services/positionService');
const idempotencyService = require('../src/services/idempotencyService');

function seedVault() {
  store.vaults.clear();
  store.positions.clear();
  store.transactions.clear();
  store.transactionStates.clear();
  store.auditEvents.clear();
  store.idempotencyRecords.clear();
  store.vaults.set('vault_idempotency', {
    id: 'vault_idempotency', name: 'Idempotency Vault', asset: 'USDC', apy: 0,
    totalAssets: 1000, totalShares: 1000, createdAt: 1, lastAccruedAt: Date.now(),
  });
}

test.beforeEach(seedVault);

describe('deposit idempotency', () => {
  test('returns one terminal result and one provider transaction on retry', () => {
    const input = { user: 'operator_a', vaultId: 'vault_idempotency', amount: 100, idempotencyKey: 'deposit-0001', correlationId: 'req-1' };
    const first = positionService.deposit(input);
    const retry = positionService.deposit({ ...input, correlationId: 'req-retry' });

    assert.deepEqual(retry, first);
    assert.equal(store.positions.size, 1);
    assert.equal(store.transactions.size, 1);
    assert.equal(store.transactionStates.size, 1);
    assert.equal(store.auditEvents.size, 1);
    assert.equal(store.idempotencyRecords.size, 1);
  });

  test('rejects a changed amount before another provider call', () => {
    const input = { user: 'operator_a', vaultId: 'vault_idempotency', amount: 100, idempotencyKey: 'deposit-0002' };
    positionService.deposit(input);
    assert.throws(() => positionService.deposit({ ...input, amount: 101 }), (error) => error.statusCode === 409 && error.details.code === 'IDEMPOTENCY_CONFLICT');
    assert.equal(store.transactions.size, 1);
    assert.equal(store.positions.values().next().value.shares, 100);
  });

  test('isolates keys by authenticated user and operation', () => {
    const key = 'shared-key-1';
    const first = positionService.deposit({ user: 'operator_a', vaultId: 'vault_idempotency', amount: 10, idempotencyKey: key });
    const second = positionService.deposit({ user: 'operator_b', vaultId: 'vault_idempotency', amount: 10, idempotencyKey: key });
    assert.notEqual(first.position.id, second.position.id);
    assert.equal(store.idempotencyRecords.size, 2);
  });
});

describe('withdraw idempotency', () => {
  test('replaying a partial withdrawal does not reduce shares twice', () => {
    positionService.deposit({ user: 'operator_a', vaultId: 'vault_idempotency', amount: 100 });
    const input = { user: 'operator_a', vaultId: 'vault_idempotency', shares: 40, idempotencyKey: 'withdraw-0001' };
    const first = positionService.withdraw(input);
    const retry = positionService.withdraw(input);

    assert.deepEqual(retry, first);
    assert.equal(first.position.shares, 60);
    assert.equal(store.positions.values().next().value.shares, 60);
    assert.equal(store.transactions.size, 2);
    assert.equal(store.auditEvents.size, 2);
  });

  test('failed validation leaves no processing record', () => {
    assert.throws(() => positionService.withdraw({ user: 'missing', vaultId: 'vault_idempotency', shares: 1, idempotencyKey: 'withdraw-0002' }), /No position/);
    assert.equal(store.idempotencyRecords.size, 0);
  });
});

describe('idempotency state machine', () => {
  test('canonical fingerprints ignore object key order', () => {
    assert.equal(idempotencyService.fingerprint({ amount: 1, nested: { b: 2, a: 3 } }), idempotencyService.fingerprint({ nested: { a: 3, b: 2 }, amount: 1 }));
  });

  test('in-flight duplicate is not allowed to create a second mutation', () => {
    const started = idempotencyService.begin({ user: 'operator_a', operation: 'deposit', key: 'processing-1', payload: { amount: 1 } });
    assert.equal(started.replay, false);
    assert.throws(() => idempotencyService.begin({ user: 'operator_a', operation: 'deposit', key: 'processing-1', payload: { amount: 1 } }), (error) => error.statusCode === 409 && error.details.code === 'IDEMPOTENCY_IN_PROGRESS');
    idempotencyService.abort(started.scopedKey);
  });

  test('invalid key fails closed', () => {
    assert.throws(() => idempotencyService.begin({ user: 'operator_a', operation: 'deposit', key: 'short', payload: {} }), (error) => error.statusCode === 400);
  });

  test('a completed record can be read as the original terminal result', () => {
    const started = idempotencyService.begin({ user: 'operator_a', operation: 'withdraw', key: 'complete-1', payload: { shares: 2 } });
    const result = { tx: { txHash: 'tx-original' }, position: null };
    idempotencyService.complete(started.scopedKey, result);
    const retry = idempotencyService.begin({ user: 'operator_a', operation: 'withdraw', key: 'complete-1', payload: { shares: 2 } });
    assert.equal(retry.replay, true);
    assert.deepEqual(retry.result, result);
  });
});
