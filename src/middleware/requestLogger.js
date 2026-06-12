'use strict';

const logger = require('../utils/logger');

/**
 * Lightweight request logger that records method, path, status and duration.
 * Complements morgan with structured, level-aware output.
 */
module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const id = req.id ? ` [${req.id}]` : '';
    logger.info(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms${id}`
    );
  });

  next();
};
