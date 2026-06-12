'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * ID generation helpers. Prefixing makes IDs self-describing in logs and
 * responses (e.g. "pos_1a2b...", "vault_9f8e...").
 */
function generateId(prefix) {
  const id = uuidv4();
  return prefix ? `${prefix}_${id}` : id;
}

const newVaultId = () => generateId('vault');
const newPositionId = () => generateId('pos');
const newTxId = () => generateId('tx');

module.exports = {
  generateId,
  newVaultId,
  newPositionId,
  newTxId,
};
