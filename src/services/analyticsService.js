'use strict';

const store = require('../store');
const { round } = require('../utils/math');
const { MIN_HISTORY_DAYS, MAX_HISTORY_DAYS } = require('../utils/constants');
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

/**
 * Build a deterministic mock protocol-wide TVL history ending at the current
 * total TVL. Earlier days are scaled down by a smooth growth curve so charts
 * have a plausible upward trend without persisting real historical snapshots.
 */
function getTvlHistory(days = 30) {
  const points = Math.max(MIN_HISTORY_DAYS, Math.min(days, MAX_HISTORY_DAYS));
  const current = Array.from(store.vaults.values())
    .map(vaultService.syncVault)
    .reduce((sum, v) => sum + v.totalAssets, 0);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const series = [];

  for (let i = points - 1; i >= 0; i -= 1) {
    // Linearly ramp from ~80% of current TVL up to today's value.
    const progress = points === 1 ? 1 : (points - 1 - i) / (points - 1);
    const factor = 0.8 + 0.2 * progress;
    series.push({
      date: new Date(now - i * dayMs).toISOString().slice(0, 10),
      tvl: round(current * factor),
    });
  }

  return series;
}

module.exports = {
  getAnalytics,
  getTvlHistory,
};
