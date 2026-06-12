'use strict';

const analyticsService = require('../services/analyticsService');

/**
 * Analytics controller: aggregate protocol metrics.
 */
function getAnalytics(req, res) {
  const analytics = analyticsService.getAnalytics();
  res.json({ analytics });
}

module.exports = { getAnalytics };
