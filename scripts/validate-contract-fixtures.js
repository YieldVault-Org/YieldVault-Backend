'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateResponse } = require('../src/services/contractValidationService');

const fixtureDirectory = path.join(__dirname, '..', 'src', 'contracts', 'fixtures');
const contractForFixture = {
  'deposit-success.json': 'depositSuccess',
  'withdraw-pending.json': 'withdrawSuccess',
  'transactions-page.json': 'transactionPage',
  'vault-list.json': 'vaultList',
  'position-list.json': 'positionList',
  'authorization-error.json': 'errorResponse',
  'provider-failure.json': 'errorResponse',
  'validation-error.json': 'errorResponse',
};

for (const [file, contract] of Object.entries(contractForFixture)) {
  const payload = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, file), 'utf8'));
  validateResponse(contract, payload);
  process.stdout.write(`validated ${file} against v1.${contract}\n`);
}
