'use strict';

const config = require('../config');
const { serviceUnavailable } = require('../utils/errors');

/**
 * Abort requests that run longer than a configured budget. Guards the
 * single-process mock backend against a slow or stuck handler holding a
 * connection open indefinitely. When the timer fires before the response has
 * been sent, a 503 is forwarded to the error handler.
 */
function requestTimeout(ms = config.requestTimeoutMs) {
  return function requestTimeoutMiddleware(req, res, next) {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(serviceUnavailable('Request timed out', { timeoutMs: ms }));
      }
    }, ms);

    // Always clear the timer once the response finishes or the socket closes.
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = requestTimeout;
