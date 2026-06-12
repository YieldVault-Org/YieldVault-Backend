'use strict';

const store = require('../store');
const { notFound } = require('../utils/errors');
const { pricePerShare } = require('../utils/math');
const yieldService = require('./yieldService');

/**
 * Vault service: read-side access to vaults plus accrual bookkeeping.
 */

/**
 * Ensure a vault's accrued yield is up to date before it is read.
 */
function syncVault(vault) {
  yieldService.applyAccrual(vault);
  return vault;
}

/**
 * Shape a vault for API responses, adding derived fields.
 */
function serialize(vault) {
  return {
    id: vault.id,
    name: vault.name,
    asset: vault.asset,
    apy: vault.apy,
    tvl: vault.totalAssets,
    totalAssets: vault.totalAssets,
    totalShares: vault.totalShares,
    pricePerShare: pricePerShare(vault.totalAssets, vault.totalShares),
    createdAt: vault.createdAt,
  };
}

function listVaults() {
  return Array.from(store.vaults.values())
    .map(syncVault)
    .map(serialize);
}

function getVaultRecord(id) {
  const vault = store.vaults.get(id);
  if (!vault) {
    throw notFound(`Vault ${id} not found`);
  }
  return syncVault(vault);
}

function getVault(id) {
  return serialize(getVaultRecord(id));
}

module.exports = {
  syncVault,
  serialize,
  listVaults,
  getVaultRecord,
  getVault,
};
