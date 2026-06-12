'use strict';

const express = require('express');
const vaultController = require('../controllers/vaultController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/vaults - list all vaults with TVL, APY and total shares
router.get('/', asyncHandler(vaultController.listVaults));

// GET /api/vaults/:id - vault detail
router.get('/:id', asyncHandler(vaultController.getVault));

module.exports = router;
