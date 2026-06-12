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

module.exports = store;
