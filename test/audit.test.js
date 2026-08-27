'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const store = require('../src/store');
const auditService = require('../src/services/auditService');

test('audit events have versioned structured fields and redact credentials', () => {
  store.auditEvents.clear();
  const event = auditService.record({
    actor: 'operator-1',
    action: 'vault.configure',
    target: 'vault-1',
    correlationId: 'req-1',
    before: { feeBps: 100 },
    after: { feeBps: 125, privateKey: 'do-not-store' },
  });

  assert.equal(event.version, 1);
  assert.equal(event.outcome, 'success');
  assert.equal(event.after.privateKey, '[REDACTED]');
  assert.equal(store.auditEvents.size, 1);
});

test('audit listing supports actor, target and correlation filters', () => {
  store.auditEvents.clear();
  auditService.record({ actor: 'a', action: 'x', target: 'vault-1', correlationId: 'r1' });
  auditService.record({ actor: 'b', action: 'y', target: 'vault-2', correlationId: 'r2' });

  const result = auditService.list({ actor: 'a', target: 'vault-1', correlationId: 'r1' });
  assert.equal(result.pagination.total, 1);
  assert.equal(result.data[0].actor, 'a');
});
