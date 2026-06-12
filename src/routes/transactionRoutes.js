'use strict';

const express = require('express');
const transactionController = require('../controllers/transactionController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/transactions?user=&limit=&offset= - paginated transaction history
router.get('/', asyncHandler(transactionController.listTransactions));

module.exports = router;
