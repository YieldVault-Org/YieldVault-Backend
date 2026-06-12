'use strict';

const { round } = require('./math');

/**
 * Finance helpers for projecting yield over time. These are pure functions kept
 * separate from the stateful yield engine so they can be unit tested and reused
 * by projection endpoints.
 */

const DAYS_PER_YEAR = 365;

/**
 * Future value of a principal compounded for a number of days at an annual rate.
 * `periodsPerYear` controls the compounding frequency (e.g. 365 for daily).
 */
function compound(principal, annualRate, days, periodsPerYear = DAYS_PER_YEAR) {
  if (principal <= 0 || annualRate < 0 || days <= 0 || periodsPerYear <= 0) {
    return round(Math.max(0, principal));
  }
  const periods = (days / DAYS_PER_YEAR) * periodsPerYear;
  const ratePerPeriod = annualRate / periodsPerYear;
  return round(principal * (1 + ratePerPeriod) ** periods);
}

/**
 * Yield earned (future value minus principal) over a period.
 */
function projectedYield(principal, annualRate, days, periodsPerYear = DAYS_PER_YEAR) {
  return round(compound(principal, annualRate, days, periodsPerYear) - principal);
}

/**
 * Effective annual yield given a nominal annual rate and compounding frequency.
 */
function effectiveAnnualRate(annualRate, periodsPerYear = DAYS_PER_YEAR) {
  if (annualRate < 0 || periodsPerYear <= 0) {
    return 0;
  }
  return round((1 + annualRate / periodsPerYear) ** periodsPerYear - 1);
}

module.exports = {
  DAYS_PER_YEAR,
  compound,
  projectedYield,
  effectiveAnnualRate,
};
