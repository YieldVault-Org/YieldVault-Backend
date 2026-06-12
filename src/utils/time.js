'use strict';

/**
 * Small time helpers shared by the mock history-series builders.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Return the YYYY-MM-DD date string for a point `daysAgo` before `from`.
 */
function dateDaysAgo(daysAgo, from = Date.now()) {
  return new Date(from - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

module.exports = {
  DAY_MS,
  dateDaysAgo,
};
