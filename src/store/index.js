'use strict';

/**
 * In-memory data store. This stands in for a real database and holds all
 * application state in plain Maps keyed by id. State is lost on restart, which
 * is acceptable for a mock/demo backend.
 */
const store = {
  vaults: new Map(),
  positions: new Map(),
  transactions: new Map(),
};

/**
 * Return record counts for each collection. Useful for health/diagnostics.
 */
store.stats = function stats() {
  return {
    vaults: store.vaults.size,
    positions: store.positions.size,
    transactions: store.transactions.size,
  };
};

module.exports = store;
