'use strict';

const express = require('express');
const vaultController = require('../controllers/vaultController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/vaults - list all vaults with TVL, APY and total shares
router.get('/', asyncHandler(vaultController.listVaults));

// GET /api/vaults/:id - vault detail
router.get('/:id', asyncHandler(vaultController.getVault));

// GET /api/vaults/:id/stats - per-vault summary statistics
router.get('/:id/stats', asyncHandler(vaultController.getVaultStats));

// GET /api/vaults/:id/positions - positions held in a vault
router.get('/:id/positions', asyncHandler(vaultController.getVaultPositions));

// GET /api/vaults/:id/apy-history?days= - mock historical APY series
router.get('/:id/apy-history', asyncHandler(vaultController.getVaultApyHistory));

module.exports = router;
