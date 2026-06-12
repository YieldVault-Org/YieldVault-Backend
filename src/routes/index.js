'use strict';

const express = require('express');

const healthRoutes = require('./healthRoutes');
const vaultRoutes = require('./vaultRoutes');
const positionRoutes = require('./positionRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const router = express.Router();

// Mount feature routers under the /api namespace.
router.use('/health', healthRoutes);
router.use('/vaults', vaultRoutes);
router.use('/positions', positionRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
