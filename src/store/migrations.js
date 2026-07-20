'use strict';

/**
 * Minimal versioned migration scaffold for the in-memory store.
 *
 * The current implementation only needs a single bootstrap migration to ensure
 * the store exposes the metadata container and collection Maps on first load.
 */
const STORE_VERSION = 1;

const MIGRATIONS = [
  {
    version: 1,
    apply(store) {
      if (!store.meta) {
        store.meta = {};
      }

      if (!store.meta.migrations) {
        store.meta.migrations = [];
      }

      if (!store.vaults || typeof store.vaults.set !== 'function') {
        store.vaults = new Map();
      }

      if (!store.positions || typeof store.positions.set !== 'function') {
        store.positions = new Map();
      }

      if (!store.transactions || typeof store.transactions.set !== 'function') {
        store.transactions = new Map();
      }

      if (!store.meta.migrations.includes(1)) {
        store.meta.migrations.push(1);
      }

      store.meta.version = 1;
    },
  },
];

function applyMigrations(store, targetVersion = STORE_VERSION) {
  if (!store) {
    throw new TypeError('Store instance is required');
  }

  if (!store.meta) {
    store.meta = {};
  }

  if (!store.meta.migrations) {
    store.meta.migrations = [];
  }

  if (!store.vaults || typeof store.vaults.set !== 'function') {
    store.vaults = new Map();
  }

  if (!store.positions || typeof store.positions.set !== 'function') {
    store.positions = new Map();
  }

  if (!store.transactions || typeof store.transactions.set !== 'function') {
    store.transactions = new Map();
  }

  let currentVersion = Number(store.meta.version || 0);

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion && migration.version <= targetVersion) {
      migration.apply(store);
      currentVersion = migration.version;
    }
  }

  if (targetVersion >= 1 && !store.meta.migrations.includes(1)) {
    store.meta.migrations.push(1);
  }

  store.meta.version = targetVersion;
  return store.meta;
}

module.exports = {
  applyMigrations,
  MIGRATIONS,
  STORE_VERSION,
};
