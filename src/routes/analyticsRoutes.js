'use strict';

const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/analytics - aggregate TVL and average APY
router.get('/', asyncHandler(analyticsController.getAnalytics));

module.exports = router;
