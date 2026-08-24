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

// All user-facing amounts use six decimal places. Keeping the policy here
// means previews, validation, and execution cannot silently choose different
// rounding rules.
const PRECISION = 1e6;
const DECIMAL_PLACES = 6;
const MIN_UNIT = 1 / PRECISION;
const MAX_SUPPORTED_AMOUNT = 1e12;

function round(value) {
  return Math.round(value * PRECISION) / PRECISION;
}

/** Normalize an amount under the protocol's canonical precision policy. */
function canonicalizeAmount(value, { allowZero = true } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError('amount must be a finite number');
  }
  if (value < 0 || (!allowZero && value === 0)) {
    throw new RangeError('amount must be greater than zero');
  }
  if (value > MAX_SUPPORTED_AMOUNT) {
    throw new RangeError(`amount must not exceed ${MAX_SUPPORTED_AMOUNT}`);
  }

  const normalized = round(value);
  if (Math.abs(normalized - value) > Number.EPSILON * Math.max(1, Math.abs(value))) {
    throw new RangeError(`amount supports at most ${DECIMAL_PLACES} decimal places`);
  }
  return normalized;
}

function conversionMetadata() {
  return {
    decimalPlaces: DECIMAL_PLACES,
    minimumUnit: MIN_UNIT,
    rounding: 'nearest',
  };
}

/**
 * Convert an asset amount into shares given current vault totals.
 */
function assetsToShares(assets, totalAssets, totalShares) {
  assets = canonicalizeAmount(assets, { allowZero: false });
  totalAssets = canonicalizeAmount(totalAssets);
  totalShares = canonicalizeAmount(totalShares);
  if (totalShares === 0 || totalAssets === 0) {
    return round(assets);
  }
  return round((assets * totalShares) / totalAssets);
}

/**
 * Convert a share amount into the underlying asset amount.
 */
function sharesToAssets(shares, totalAssets, totalShares) {
  shares = canonicalizeAmount(shares, { allowZero: false });
  totalAssets = canonicalizeAmount(totalAssets);
  totalShares = canonicalizeAmount(totalShares);
  if (totalShares === 0) {
    return 0;
  }
  return round((shares * totalAssets) / totalShares);
}

/**
 * Price of a single share expressed in underlying assets.
 */
function pricePerShare(totalAssets, totalShares) {
  totalAssets = canonicalizeAmount(totalAssets);
  totalShares = canonicalizeAmount(totalShares);
  if (totalShares === 0) {
    return 1;
  }
  return round(totalAssets / totalShares);
}

function quoteAssetsToShares(assets, totalAssets, totalShares) {
  const normalizedAssets = canonicalizeAmount(assets, { allowZero: false });
  return {
    assets: normalizedAssets,
    shares: assetsToShares(normalizedAssets, totalAssets, totalShares),
    pricePerShare: pricePerShare(totalAssets, totalShares),
    policy: conversionMetadata(),
  };
}

function quoteSharesToAssets(shares, totalAssets, totalShares) {
  const normalizedShares = canonicalizeAmount(shares, { allowZero: false });
  return {
    shares: normalizedShares,
    assets: sharesToAssets(normalizedShares, totalAssets, totalShares),
    pricePerShare: pricePerShare(totalAssets, totalShares),
    policy: conversionMetadata(),
  };
}

module.exports = {
  PRECISION,
  DECIMAL_PLACES,
  MIN_UNIT,
  MAX_SUPPORTED_AMOUNT,
  round,
  canonicalizeAmount,
  conversionMetadata,
  assetsToShares,
  sharesToAssets,
  pricePerShare,
  quoteAssetsToShares,
  quoteSharesToAssets,
};
