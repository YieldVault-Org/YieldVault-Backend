'use strict';

const { badRequest } = require('../utils/errors');

/**
 * Tiny schema validator. A schema maps field names to rule objects:
 *   { type: 'string'|'number', required: true, min: 0, positive: true }
 * Returns Express middleware that validates the chosen request part.
 */
function validateBody(schema) {
  return function validateMiddleware(req, res, next) {
    const data = req.body || {};
    const errors = [];

    Object.entries(schema).forEach(([field, rule]) => {
      const value = data[field];
      const present = value !== undefined && value !== null && value !== '';

      if (rule.required && !present) {
        errors.push(`${field} is required`);
        return;
      }
      if (!present) {
        return;
      }
      if (rule.type === 'number') {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors.push(`${field} must be a number`);
          return;
        }
        if (rule.positive && num <= 0) {
          errors.push(`${field} must be greater than 0`);
        }
        if (rule.min !== undefined && num < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push(`${field} must be at most ${rule.max}`);
        }
        if (rule.integer && !Number.isInteger(num)) {
          errors.push(`${field} must be an integer`);
        }
        data[field] = num;
      }
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
    });

    if (errors.length > 0) {
      return next(badRequest('Validation failed', errors));
    }
    req.body = data;
    next();
  };
}

module.exports = { validateBody };
