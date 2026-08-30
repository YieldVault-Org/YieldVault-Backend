'use strict';

const crypto = require('crypto');
const store = require('../store');
const { AppError, badRequest } = require('../utils/errors');

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function canonical(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonical(value[key]);
    return result;
  }, {});
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function assertKey(key) {
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    throw badRequest('idempotencyKey must contain 8-128 safe characters');
  }
}

function scope(user, operation, key) {
  return `${user}\u0000${operation}\u0000${key}`;
}

function ensureStore() {
  if (!store.idempotencyRecords) store.idempotencyRecords = new Map();
  return store.idempotencyRecords;
}

/** Begin one mutation, returning a completed result when this is a retry. */
function begin({ user, operation, key, payload }) {
  assertKey(key);
  const records = ensureStore();
  const scopedKey = scope(user, operation, key);
  const requestFingerprint = fingerprint(payload);
  const existing = records.get(scopedKey);
  if (existing) {
    if (existing.fingerprint !== requestFingerprint) {
      throw new AppError('Idempotency key was reused with a different payload', 409, {
        code: 'IDEMPOTENCY_CONFLICT',
      });
    }
    if (existing.status === 'completed') return { replay: true, result: existing.result };
    throw new AppError('Idempotent mutation is already in progress', 409, {
      code: 'IDEMPOTENCY_IN_PROGRESS',
    });
  }
  const record = {
    user,
    operation,
    key,
    fingerprint: requestFingerprint,
    status: 'processing',
    createdAt: new Date().toISOString(),
  };
  records.set(scopedKey, record);
  return { replay: false, record, scopedKey };
}

function complete(scopedKey, result) {
  const record = ensureStore().get(scopedKey);
  if (!record) throw new Error('Idempotency record not found');
  record.status = 'completed';
  record.result = result;
  record.completedAt = new Date().toISOString();
}

function abort(scopedKey) {
  ensureStore().delete(scopedKey);
}

module.exports = { begin, complete, abort, fingerprint };
