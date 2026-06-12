'use strict';

const vaultService = require('../services/vaultService');
const positionService = require('../services/positionService');

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

function getVaultPositions(req, res) {
  // Ensure the vault exists (throws 404 otherwise) before listing positions.
  vaultService.getVault(req.params.id);
  const positions = positionService.listByVault(req.params.id);
  res.json({ count: positions.length, positions });
}

function getVaultApyHistory(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const history = vaultService.getApyHistory(req.params.id, days);
  res.json({ vaultId: req.params.id, count: history.length, history });
}

module.exports = {
  listVaults,
  getVault,
  getVaultPositions,
  getVaultApyHistory,
};
