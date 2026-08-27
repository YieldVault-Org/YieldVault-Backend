'use strict';

const { assertValid, validate } = require('../contracts/schema');
const { definitions, version } = require('../contracts/definitions');

/**
 * Runtime boundary for response contracts. Controllers can validate only the
 * response they own; this keeps a contract failure local and makes a breaking
 * change visible in tests before it reaches a client.
 */
function validateResponse(name, payload) {
  const schema = definitions[name];
  if (!schema) throw new Error(`Unknown response contract: ${name}`);
  return assertValid(payload, schema, `${version}.${name}`);
}

function inspectResponse(name, payload) {
  const schema = definitions[name];
  if (!schema) return { valid: false, errors: [{ path: '$', message: 'unknown contract' }] };
  return validate(payload, schema);
}

function listContracts() {
  return Object.keys(definitions).map((name) => ({ name, version }));
}

function validateFixtureSet(fixtureSet) {
  if (!fixtureSet || typeof fixtureSet !== 'object' || Array.isArray(fixtureSet)) {
    throw new TypeError('Fixture set must be an object');
  }
  return Object.entries(fixtureSet).map(([name, payload]) => {
    const result = inspectResponse(name, payload);
    return { name, ...result };
  });
}

module.exports = { inspectResponse, listContracts, validateFixtureSet, validateResponse };
