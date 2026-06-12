'use strict';

const { badRequest } = require('../utils/errors');

/**
 * Tiny schema validator. A schema maps field names to rule objects:
 *   { type: 'string'|'number', required: true, min: 0, positive: true,
 *     max, integer, minLength, maxLength, pattern, oneOf: [...] }
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
      if (rule.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
          return;
        }
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${field} must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} has an invalid format`);
        }
      }
      // Restrict the field to an explicit set of allowed values. Compared
      // against the (possibly coerced) value stored back on data.
      if (Array.isArray(rule.oneOf) && !rule.oneOf.includes(data[field])) {
        errors.push(`${field} must be one of: ${rule.oneOf.join(', ')}`);
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
