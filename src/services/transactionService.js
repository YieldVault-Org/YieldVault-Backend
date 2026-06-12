'use strict';

const store = require('../store');

/**
 * Transaction service: read access to the mock transaction history recorded by
 * deposit/withdraw flows.
 */
function listTransactions(user) {
  return Array.from(store.transactions.values())
    .filter((tx) => !user || tx.user === user)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  listTransactions,
};
