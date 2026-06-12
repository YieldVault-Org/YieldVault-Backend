'use strict';

const transactionService = require('../services/transactionService');

/**
 * Transaction controller: lists mock transaction history.
 */
function listTransactions(req, res) {
  const transactions = transactionService.listTransactions(req.query.user);
  res.json({ count: transactions.length, transactions });
}

module.exports = { listTransactions };
