'use strict';

const store = require('./index');
const config = require('../config');
const logger = require('../utils/logger');
const { newVaultId } = require('../utils/ids');
const { SUPPORTED_ASSETS } = require('../utils/constants');

/**
 * Seed the in-memory store with a handful of demo vaults so the API returns
 * meaningful data immediately after boot.
 */
const SEED_VAULTS = [
  { name: 'USDC Stable Yield', asset: 'USDC', apy: 0.052, totalAssets: 1250000 },
  { name: 'XLM Growth Vault', asset: 'XLM', apy: 0.094, totalAssets: 480000 },
  { name: 'EURC Conservative', asset: 'EURC', apy: 0.038, totalAssets: 720000 },
  { name: 'USDC High Yield', asset: 'USDC', apy: 0.118, totalAssets: 340000 },
  { name: 'XLM Stable Pool', asset: 'XLM', apy: 0.061, totalAssets: 910000 },
  { name: 'EURC Growth Vault', asset: 'EURC', apy: 0.083, totalAssets: 215000 },
];

function seed() {
  if (store.vaults.size > 0) {
    return;
  }

  const now = Date.now();
  SEED_VAULTS.forEach((v) => {
    if (!SUPPORTED_ASSETS.includes(v.asset)) {
      logger.warn(`Skipping seed vault with unsupported asset: ${v.asset}`);
      return;
    }
    const id = newVaultId();
    store.vaults.set(id, {
      id,
      name: v.name,
      asset: v.asset,
      apy: v.apy || config.defaultApy,
      // Initial shares equal initial assets so price per share starts at 1.
      totalAssets: v.totalAssets,
      totalShares: v.totalAssets,
      createdAt: now,
      lastAccruedAt: now,
    });
  });

  logger.info(`Seeded ${store.vaults.size} demo vaults`);
}

module.exports = seed;
