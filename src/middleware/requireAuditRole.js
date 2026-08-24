'use strict';

const { forbidden } = require('../utils/errors');

module.exports = function requireAuditRole(req, _res, next) {
  const role = req.get('X-Audit-Role');
  if (role !== 'admin' && role !== 'auditor') {
    return next(forbidden('An admin or auditor role is required to read audit events'));
  }
  return next();
};
