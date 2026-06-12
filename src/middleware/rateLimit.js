'use strict';

const config = require('../config');
const { tooManyRequests } = require('../utils/errors');

/**
 * Minimal in-memory rate limiter using a fixed-window counter per client IP.
 * Avoids external dependencies, which suits the in-memory, single-process mock
 * backend. For multi-instance deployments a shared store would be required.
 */
function rateLimit(options = {}) {
  const windowMs = options.windowMs || config.rateLimit.windowMs;
  const max = options.max || config.rateLimit.max;
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (entry.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return next(
        tooManyRequests('Rate limit exceeded, slow down', { retryAfter: resetSeconds })
      );
    }

    next();
  };
}

module.exports = rateLimit;
