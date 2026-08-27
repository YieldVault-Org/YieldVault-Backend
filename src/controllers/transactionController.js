'use strict';

const transactionService = require('../services/transactionService');
const { paginate } = require('../utils/pagination');
const { validateResponse } = require('../services/contractValidationService');

/**
 * Transaction controller: lists mock transaction history.
 */
function listTransactions(req, res) {
  const transactions = transactionService.listTransactions(req.query.user);
  const { data, pagination } = paginate(transactions, req.query);
  const response = { count: data.length, pagination, transactions: data };
  validateResponse('transactionPage', response);
  res.json(response);
}

module.exports = { listTransactions };
