'use strict';

const store = require('../store');
const { generateId } = require('../utils/ids');

const MAX_METADATA_KEYS = 20;
const MAX_STRING_LENGTH = 256;
const SENSITIVE_KEY = /(secret|token|password|credential|private.?key|mnemonic)/i;

function redact(value, depth = 0) {
  if (depth > 3) return '[truncated]';
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, MAX_METADATA_KEYS).map((item) => redact(item, depth + 1));
  return Object.entries(value).slice(0, MAX_METADATA_KEYS).reduce((result, [key, item]) => {
    result[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(item, depth + 1);
    return result;
  }, {});
}

function record({ actor, action, target, correlationId, outcome, before, after }) {
  if (!store.auditEvents) store.auditEvents = new Map();
  const event = {
    id: generateId('audit'),
    version: 1,
    actor: String(actor || 'unknown').slice(0, MAX_STRING_LENGTH),
    action: String(action).slice(0, MAX_STRING_LENGTH),
    target: String(target).slice(0, MAX_STRING_LENGTH),
    correlationId: String(correlationId || 'unknown').slice(0, MAX_STRING_LENGTH),
    outcome: outcome === 'failure' ? 'failure' : 'success',
    before: redact(before || {}),
    after: redact(after || {}),
    timestamp: new Date().toISOString(),
  };
  store.auditEvents.set(event.id, event);
  return event;
}

function list({ actor, target, correlationId, limit = 100, offset = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 100));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const events = Array.from(store.auditEvents ? store.auditEvents.values() : [])
    .filter((event) => !actor || event.actor === actor)
    .filter((event) => !target || event.target === target)
    .filter((event) => !correlationId || event.correlationId === correlationId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const data = events.slice(safeOffset, safeOffset + safeLimit);
  return { data, pagination: { total: events.length, limit: safeLimit, offset: safeOffset, hasMore: safeOffset + safeLimit < events.length } };
}

module.exports = { record, list, redact };
