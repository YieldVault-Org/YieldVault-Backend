'use strict';

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Central error handler. Converts thrown errors into consistent JSON responses
 * and hides internal details for unexpected (non-AppError) failures.
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  // Body-parser (express.json) errors carry their own client-facing status
  // (e.g. 413 for oversized payloads, 400 for malformed JSON). Honour those so
  // callers see an accurate code instead of a generic 500.
  const parserStatus =
    !isAppError && err.type ? err.status || err.statusCode : undefined;
  const statusCode = isAppError ? err.statusCode : parserStatus || 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err.stack || err.message);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  }

  // Expose the message for known client errors (AppError or body-parser),
  // but never leak details of unexpected 5xx failures.
  const safeToExpose = isAppError || (parserStatus && statusCode < 500);
  const body = {
    error: {
      message: safeToExpose ? err.message : 'Internal server error',
      status: statusCode,
    },
  };

  if (isAppError && err.details) {
    body.error.details = err.details;
  }

  res.status(statusCode).json(body);
};
