'use strict';

const config = require('../config');
const store = require('../store');
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
    store: store.stats(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Liveness probe: reports only that the process is up and responding. Kept
 * intentionally cheap so orchestrators can poll it frequently.
 */
function getLiveness(req, res) {
  res.json({ status: 'alive', uptime: process.uptime() });
}

/**
 * Readiness probe: reports whether the service is ready to serve traffic. The
 * store must hold at least one seeded vault before we accept requests.
 */
function getReadiness(req, res) {
  const ready = store.vaults.size > 0;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    vaults: store.vaults.size,
  });
}

module.exports = { getHealth, getLiveness, getReadiness };
