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
  const statusCode = isAppError ? err.statusCode : 500;

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, err.stack || err.message);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  }

  const body = {
    error: {
      message: isAppError ? err.message : 'Internal server error',
      status: statusCode,
    },
  };

  if (isAppError && err.details) {
    body.error.details = err.details;
  }

  res.status(statusCode).json(body);
};
