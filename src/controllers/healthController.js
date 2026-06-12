'use strict';

const config = require('../config');
const { SERVICE_NAME, API_VERSION } = require('../utils/constants');

/**
 * Health controller: liveness/readiness probe for the service.
 */
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    version: API_VERSION,
    env: config.env,
    network: config.stellar.network,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
