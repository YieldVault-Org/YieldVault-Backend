'use strict';

const analyticsService = require('../services/analyticsService');

/**
 * Analytics controller: aggregate protocol metrics.
 */
function getAnalytics(req, res) {
  const analytics = analyticsService.getAnalytics();
  res.json({ analytics });
}

function getTvlHistory(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const history = analyticsService.getTvlHistory(days);
  res.json({ count: history.length, history });
}

module.exports = { getAnalytics, getTvlHistory };
