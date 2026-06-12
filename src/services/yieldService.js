'use strict';

const { round } = require('../utils/math');

/**
 * Mock yield-accrual engine.
 *
 * Yield grows a vault's totalAssets over time based on its APY, while the number
 * of shares stays constant. This raises the price per share so every depositor
 * benefits proportionally.
 *
 * We use simple continuous-ish growth based on elapsed seconds rather than
 * compounding precisely, which is plenty for a mock.
 */

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

/**
 * Given a starting asset amount, an APY and elapsed seconds, return the asset
 * amount after accrual.
 */
function accrue(totalAssets, apy, elapsedSeconds) {
  if (totalAssets <= 0 || apy <= 0 || elapsedSeconds <= 0) {
    return round(totalAssets);
  }
  const growthFactor = 1 + (apy * elapsedSeconds) / SECONDS_PER_YEAR;
  return round(totalAssets * growthFactor);
}

/**
 * Apply accrued yield to a vault in place, updating its totalAssets and
 * lastAccruedAt timestamp. Returns the amount of yield added.
 */
function applyAccrual(vault, now = Date.now()) {
  const last = vault.lastAccruedAt || vault.createdAt || now;
  const elapsedSeconds = Math.max(0, (now - last) / 1000);
  if (elapsedSeconds === 0) {
    return 0;
  }
  const before = vault.totalAssets;
  vault.totalAssets = accrue(before, vault.apy, elapsedSeconds);
  vault.lastAccruedAt = now;
  return round(vault.totalAssets - before);
}

module.exports = {
  SECONDS_PER_YEAR,
  accrue,
  applyAccrual,
};
