'use strict';

const store = require('../store');
const { notFound } = require('../utils/errors');
const { pricePerShare } = require('../utils/math');
const { projectedYield, effectiveAnnualRate } = require('../utils/finance');
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

/**
 * Return the top vaults ranked by a metric ('tvl' or 'apy'), highest first.
 */
function topVaults({ sort = 'tvl', limit = 5 } = {}) {
  const key = sort === 'apy' ? 'apy' : 'tvl';
  const count = Math.max(1, Math.min(Number(limit) || 5, 50));
  return listVaults()
    .sort((a, b) => b[key] - a[key])
    .slice(0, count);
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

/**
 * Return a mock APY history series for a vault, ending at its current APY.
 */
function getApyHistory(id, days) {
  const vault = getVaultRecord(id);
  return yieldService.apyHistory(vault.apy, days);
}

/**
 * Summary statistics for a single vault: liquidity, participation and a
 * forward-looking yield projection on its current assets.
 */
function getVaultStats(id) {
  const vault = getVaultRecord(id);
  const positions = Array.from(store.positions.values()).filter(
    (p) => p.vaultId === id
  );
  const depositors = new Set(positions.map((p) => p.user)).size;

  return {
    vaultId: vault.id,
    name: vault.name,
    asset: vault.asset,
    apy: vault.apy,
    effectiveApy: effectiveAnnualRate(vault.apy),
    tvl: vault.totalAssets,
    totalShares: vault.totalShares,
    pricePerShare: pricePerShare(vault.totalAssets, vault.totalShares),
    positionCount: positions.length,
    depositors,
    projectedAnnualYield: projectedYield(vault.totalAssets, vault.apy, 365),
  };
}

module.exports = {
  syncVault,
  serialize,
  listVaults,
  topVaults,
  getVaultRecord,
  getVault,
  getApyHistory,
  getVaultStats,
};
