'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { definitions } = require('../src/contracts/definitions');
const { inspectResponse, listContracts, validateFixtureSet, validateResponse } = require('../src/services/contractValidationService');
const contractFacade = require('../src/contracts');
const { validate } = require('../src/contracts/schema');

const fixtureDirectory = path.join(__dirname, '..', 'src', 'contracts', 'fixtures');
const fixtures = fs.readdirSync(fixtureDirectory)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => [name, JSON.parse(fs.readFileSync(path.join(fixtureDirectory, name), 'utf8'))]);

test('the v1 registry exposes every consumer-facing response contract', () => {
  assert.deepEqual(listContracts().map((item) => item.name), [
    'vaultList', 'positionList', 'depositSuccess', 'withdrawSuccess', 'transactionPage', 'errorResponse',
  ]);
  assert.equal(listContracts().every((item) => item.version === 'v1'), true);
});

test('the public facade validates and freezes the contract registry', () => {
  assert.deepEqual(contractFacade.names(), listContracts().map((item) => item.name));
  assert.equal(Object.isFrozen(contractFacade.names()), true);
  const fixture = fixtures.find(([name]) => name === 'vault-list.json')[1];
  assert.equal(contractFacade.check('vaultList', fixture).valid, true);
  assert.doesNotThrow(() => contractFacade.enforce('vaultList', fixture));
  assert.throws(() => contractFacade.check('missing', {}), /Unknown v1 contract/);
});

test('success and failure fixtures are valid and deterministic', () => {
  validateResponse('vaultList', fixtures.find(([name]) => name === 'vault-list.json')[1]);
  validateResponse('positionList', fixtures.find(([name]) => name === 'position-list.json')[1]);
  validateResponse('depositSuccess', fixtures.find(([name]) => name === 'deposit-success.json')[1]);
  validateResponse('withdrawSuccess', fixtures.find(([name]) => name === 'withdraw-pending.json')[1]);
  for (const name of ['authorization-error.json', 'provider-failure.json', 'validation-error.json']) {
    validateResponse('errorResponse', fixtures.find(([fixture]) => fixture === name)[1]);
  }
  validateResponse('transactionPage', fixtures.find(([name]) => name === 'transactions-page.json')[1]);
});

test('fixture-set validation reports each named contract independently', () => {
  const result = validateFixtureSet({
    vaultList: fixtures.find(([name]) => name === 'vault-list.json')[1],
    positionList: fixtures.find(([name]) => name === 'position-list.json')[1],
  });
  assert.deepEqual(result.map((item) => item.name), ['vaultList', 'positionList']);
  assert.equal(result.every((item) => item.valid), true);
});

test('missing required fields produce actionable paths', () => {
  const result = inspectResponse('transactionPage', { count: 1, pagination: {} });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === '$.transactions'));
  assert.ok(result.errors.some((error) => error.path === '$.pagination.total'));
});

test('status, operation, pagination, and precision constraints are enforced', () => {
  const fixture = fixtures.find(([name]) => name === 'transactions-page.json')[1];
  const invalid = structuredClone(fixture);
  invalid.transactions[0].status = 'settled';
  invalid.transactions[0].amount = 1.1234567;
  invalid.pagination.limit = 0;
  const result = inspectResponse('transactionPage', invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === '$.transactions[0].status'));
  assert.ok(result.errors.some((error) => error.path === '$.transactions[0].amount'));
  assert.ok(result.errors.some((error) => error.path === '$.pagination.limit'));
});

test('unknown response contracts fail closed', () => {
  assert.throws(() => validateResponse('not-a-contract', {}), /Unknown response contract/);
  assert.deepEqual(inspectResponse('not-a-contract', {}), {
    valid: false,
    errors: [{ path: '$', message: 'unknown contract' }],
  });
});

test('schemas reject undocumented response fields', () => {
  const fixture = fixtures.find(([name]) => name === 'transactions-page.json')[1];
  const result = validate({ ...fixture, debug: true }, definitions.transactionPage);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path === '$.debug'));
});

test('assertion preserves the machine-readable validation code', () => {
  assert.throws(
    () => validateResponse('errorResponse', { error: { status: 700 } }),
    (error) => error.code === 'CONTRACT_VALIDATION_FAILED' && Array.isArray(error.details)
  );
});
