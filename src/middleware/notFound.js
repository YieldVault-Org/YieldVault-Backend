'use strict';

const { notFound } = require('../utils/errors');

/**
 * Catch-all for unmatched routes. Forwards a 404 AppError to the error handler.
 */
module.exports = function notFoundHandler(req, res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
