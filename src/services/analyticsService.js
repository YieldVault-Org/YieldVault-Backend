'use strict';

const store = require('../store');
const { round } = require('../utils/math');
const vaultService = require('./vaultService');

/**
 * Analytics service: aggregate metrics across all vaults and positions.
 */
function getAnalytics() {
  const vaults = Array.from(store.vaults.values()).map(vaultService.syncVault);

  const totalTvl = round(
    vaults.reduce((sum, v) => sum + v.totalAssets, 0)
  );

  // TVL-weighted average APY gives a more representative figure than a plain
  // mean when vaults differ greatly in size.
  let weightedApy = 0;
  if (totalTvl > 0) {
    weightedApy = round(
      vaults.reduce((sum, v) => sum + v.apy * v.totalAssets, 0) / totalTvl
    );
  } else if (vaults.length > 0) {
    weightedApy = round(
      vaults.reduce((sum, v) => sum + v.apy, 0) / vaults.length
    );
  }

  // Per-vault TVL share so clients can render allocation breakdowns.
  const breakdown = vaults.map((v) => ({
    vaultId: v.id,
    name: v.name,
    asset: v.asset,
    tvl: v.totalAssets,
    apy: v.apy,
    share: totalTvl > 0 ? round(v.totalAssets / totalTvl) : 0,
  }));

  return {
    totalTvl,
    averageApy: weightedApy,
    vaultCount: vaults.length,
    positionCount: store.positions.size,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getAnalytics,
};
