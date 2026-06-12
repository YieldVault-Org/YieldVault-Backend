'use strict';

const vaultService = require('../services/vaultService');

/**
 * Vault controller: exposes vault listing and detail endpoints.
 */
function listVaults(req, res) {
  const vaults = vaultService.listVaults();
  res.json({ count: vaults.length, vaults });
}

function getVault(req, res) {
  const vault = vaultService.getVault(req.params.id);
  res.json({ vault });
}

module.exports = {
  listVaults,
  getVault,
};
