'use strict';

const { version } = require('../../package.json');
const { SERVICE_NAME, API_VERSION } = require('../utils/constants');

/**
 * Version controller: reports build/release metadata so clients and deploy
 * tooling can confirm exactly which release is running.
 */
function getVersion(req, res) {
  res.json({
    service: SERVICE_NAME,
    apiVersion: API_VERSION,
    version,
    node: process.version,
  });
}

module.exports = { getVersion };
