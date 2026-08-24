'use strict';

const express = require('express');
const auditController = require('../controllers/auditController');
const asyncHandler = require('../utils/asyncHandler');
const requireAuditRole = require('../middleware/requireAuditRole');

const router = express.Router();
router.get('/', requireAuditRole, asyncHandler(auditController.listAuditEvents));

module.exports = router;
