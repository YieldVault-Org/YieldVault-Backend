'use strict';

/**
 * Apply a small set of conservative security headers to every response.
 * Implemented in-process to avoid pulling in a helmet-style dependency for what
 * the mock backend needs. These headers harden the API against a few common
 * client-side attack vectors without affecting JSON consumers.
 */
module.exports = function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  // The API only returns JSON, so a restrictive default policy is safe.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  // Remove the framework fingerprint that Express adds by default.
  res.removeHeader('X-Powered-By');
  next();
};
