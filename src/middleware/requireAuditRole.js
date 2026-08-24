'use strict';

const { AppError } = require('../utils/errors');

module.exports = function requireAuditRole(req, _res, next) {
  const role = req.get('X-Audit-Role');
  if (role !== 'admin' && role !== 'auditor') {
    return next(new AppError('An admin or auditor role is required to read audit events', 403));
  }
  return next();
};
