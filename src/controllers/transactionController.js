'use strict';

const transactionService = require('../services/transactionService');
const { paginate } = require('../utils/pagination');

/**
 * Transaction controller: lists mock transaction history.
 */
function listTransactions(req, res) {
  const transactions = transactionService.listTransactions(req.query.user);
  const { data, pagination } = paginate(transactions, req.query);
  res.json({ count: data.length, pagination, transactions: data });
}

module.exports = { listTransactions };
