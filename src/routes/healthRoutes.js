'use strict';

const express = require('express');
const healthController = require('../controllers/healthController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/health - full service health report
router.get('/', asyncHandler(healthController.getHealth));

// GET /api/health/live - cheap liveness probe
router.get('/live', asyncHandler(healthController.getLiveness));

// GET /api/health/ready - readiness probe (503 until seeded)
router.get('/ready', asyncHandler(healthController.getReadiness));

module.exports = router;
