'use strict';

/**
 * Share/asset conversion math for the vault.
 *
 * A vault tracks `totalAssets` (underlying token amount) and `totalShares`
 * (ownership units). The price per share is totalAssets / totalShares. As yield
 * accrues, totalAssets grows while totalShares stays fixed, so each share
 * becomes worth more underlying assets.
 *
 * The very first deposit into an empty vault mints shares 1:1 with assets.
 */

// Precision used to avoid floating point dust when rounding.
const PRECISION = 1e6;

function round(value) {
  return Math.round(value * PRECISION) / PRECISION;
}

/**
 * Convert an asset amount into shares given current vault totals.
 */
function assetsToShares(assets, totalAssets, totalShares) {
  if (totalShares === 0 || totalAssets === 0) {
    return round(assets);
  }
  return round((assets * totalShares) / totalAssets);
}

/**
 * Convert a share amount into the underlying asset amount.
 */
function sharesToAssets(shares, totalAssets, totalShares) {
  if (totalShares === 0) {
    return 0;
  }
  return round((shares * totalAssets) / totalShares);
}

/**
 * Price of a single share expressed in underlying assets.
 */
function pricePerShare(totalAssets, totalShares) {
  if (totalShares === 0) {
    return 1;
  }
  return round(totalAssets / totalShares);
}

module.exports = {
  PRECISION,
  round,
  assetsToShares,
  sharesToAssets,
  pricePerShare,
};
