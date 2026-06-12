'use strict';

const { round } = require('./math');

/**
 * Fee helpers expressed in basis points (1 bp = 0.01%). Vaults typically charge
 * a management fee on assets under management and a performance fee on profit.
 * These pure functions let endpoints quote fees without mutating any state.
 */

const BPS_DENOMINATOR = 10000;

/**
 * Convert a basis-point value into a decimal rate (e.g. 50 bps -> 0.005).
 */
function bpsToRate(bps) {
  if (!Number.isFinite(bps) || bps <= 0) {
    return 0;
  }
  return bps / BPS_DENOMINATOR;
}

/**
 * Annual management fee on assets under management, pro-rated for `days`.
 */
function managementFee(assets, bps, days = 365) {
  if (assets <= 0 || days <= 0) {
    return 0;
  }
  const annual = assets * bpsToRate(bps);
  return round((annual * days) / 365);
}

/**
 * Performance fee charged only on positive profit.
 */
function performanceFee(profit, bps) {
  if (profit <= 0) {
    return 0;
  }
  return round(profit * bpsToRate(bps));
}

/**
 * Net profit returned to a depositor after the performance fee is deducted.
 */
function netProfit(profit, bps) {
  return round(Math.max(0, profit) - performanceFee(profit, bps));
}

module.exports = {
  BPS_DENOMINATOR,
  bpsToRate,
  managementFee,
  performanceFee,
  netProfit,
};
