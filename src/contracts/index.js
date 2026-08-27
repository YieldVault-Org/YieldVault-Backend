'use strict';

const { definitions, version } = require('./definitions');
const { assertValid, validate } = require('./schema');

/**
 * Public contract facade used by scripts and consumers. Keeping the registry
 * behind this module prevents callers from depending on the internal schema
 * representation and gives future versions a single compatibility boundary.
 */
function contractName(name) {
  if (!Object.prototype.hasOwnProperty.call(definitions, name)) {
    const error = new Error(`Unknown ${version} contract: ${name}`);
    error.code = 'UNKNOWN_CONTRACT';
    throw error;
  }
  return name;
}

function check(name, value) {
  return validate(value, definitions[contractName(name)]);
}

function enforce(name, value) {
  return assertValid(value, definitions[contractName(name)], `${version}.${name}`);
}

function names() {
  return Object.freeze(Object.keys(definitions));
}

module.exports = { check, enforce, names, version };
