'use strict';

const config = require('../config');

/**
 * Health controller: liveness/readiness probe for the service.
 */
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'yieldvault-backend',
    env: config.env,
    network: config.stellar.network,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
