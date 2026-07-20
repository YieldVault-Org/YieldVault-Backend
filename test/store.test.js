'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const store = require('../src/store');
const { applyMigrations, STORE_VERSION } = require('../src/store/migrations');

test('store initializes with a versioned migration scaffold', () => {
  assert.equal(store.meta.version, STORE_VERSION);
  assert.deepEqual(store.meta.migrations, [1]);
  assert.ok(store.vaults instanceof Map);
  assert.ok(store.positions instanceof Map);
  assert.ok(store.transactions instanceof Map);
});

test('applyMigrations is idempotent for the current schema version', () => {
  const tempStore = {
    vaults: new Map(),
    positions: new Map(),
    transactions: new Map(),
  };

  applyMigrations(tempStore, STORE_VERSION);
  const firstVersion = tempStore.meta.version;
  const firstMigrations = tempStore.meta.migrations.slice();

  applyMigrations(tempStore, STORE_VERSION);

  assert.equal(tempStore.meta.version, firstVersion);
  assert.deepEqual(tempStore.meta.migrations, firstMigrations);
  assert.ok(tempStore.vaults instanceof Map);
});
