'use strict';

const store = require('../store');
const lifecycle = require('./transactionLifecycleService');

/**
 * Transaction service: read access to the mock transaction history recorded by
 * deposit/withdraw flows.
 */
function listTransactions(user) {
  return Array.from(store.transactions.values())
    .filter((tx) => !user || tx.user === user)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getTransactionStatus(txHash) {
  return lifecycle.publicStatus(txHash);
}

module.exports = {
  listTransactions,
  getTransactionStatus,
};
