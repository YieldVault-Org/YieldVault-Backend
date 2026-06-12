'use strict';

const { generateId } = require('../utils/ids');

/**
 * Attach a unique request id to every request for tracing and correlation.
 * Honours an inbound `X-Request-Id` header when present so ids can flow across
 * services, and echoes the id back on the response.
 */
module.exports = function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.trim() !== ''
    ? incoming.trim()
    : generateId('req');

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
