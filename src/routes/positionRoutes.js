'use strict';

const express = require('express');
const positionController = require('../controllers/positionController');
const asyncHandler = require('../utils/asyncHandler');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const depositSchema = {
  user: { type: 'string', required: true },
  vaultId: { type: 'string', required: true },
  // Cap a single deposit to guard against absurd amounts in the mock.
  amount: { type: 'number', required: true, positive: true, max: 1e12 },
};

const withdrawSchema = {
  user: { type: 'string', required: true },
  vaultId: { type: 'string', required: true },
  shares: { type: 'number', required: true, positive: true },
};

// POST /api/positions/deposit - deposit assets into a vault
router.post(
  '/deposit',
  validateBody(depositSchema),
  asyncHandler(positionController.deposit)
);

// POST /api/positions/withdraw - redeem shares from a vault
router.post(
  '/withdraw',
  validateBody(withdrawSchema),
  asyncHandler(positionController.withdraw)
);

// GET /api/positions?user= - list positions, optionally filtered by user
router.get('/', asyncHandler(positionController.listPositions));

// GET /api/positions/:id - position detail
router.get('/:id', asyncHandler(positionController.getPosition));

module.exports = router;
