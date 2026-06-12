'use strict';

const express = require('express');
const healthController = require('../controllers/healthController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/health - service liveness probe
router.get('/', asyncHandler(healthController.getHealth));

module.exports = router;
