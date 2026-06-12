'use strict';

const store = require('../store');
const { badRequest, notFound } = require('../utils/errors');
const { newPositionId } = require('../utils/ids');
const {
  assetsToShares,
  sharesToAssets,
  round,
} = require('../utils/math');
const vaultService = require('./vaultService');
const stellarService = require('./stellarService');

/**
 * Position service: deposit/withdraw flows and user position queries.
 *
 * A position represents one user's stake in one vault, tracked in shares. The
 * underlying asset value of a position is derived from the vault's current
 * price per share, so it grows automatically as yield accrues.
 */

function serialize(position) {
  const vault = store.vaults.get(position.vaultId);
  vaultService.syncVault(vault);
  const assetValue = sharesToAssets(
    position.shares,
    vault.totalAssets,
    vault.totalShares
  );
  return {
    id: position.id,
    user: position.user,
    vaultId: position.vaultId,
    shares: position.shares,
    assetValue,
    earnings: round(assetValue - position.principal),
    principal: position.principal,
    createdAt: position.createdAt,
    updatedAt: position.updatedAt,
  };
}

function deposit({ user, vaultId, amount }) {
  const vault = vaultService.getVaultRecord(vaultId);
  const shares = assetsToShares(amount, vault.totalAssets, vault.totalShares);

  const tx = stellarService.submitInvocation('deposit', { user, vaultId, amount });
  store.transactions.set(tx.txHash, { ...tx, user, vaultId, amount });

  vault.totalAssets = round(vault.totalAssets + amount);
  vault.totalShares = round(vault.totalShares + shares);

  // Reuse an existing position for this user/vault pair when present.
  let position = Array.from(store.positions.values()).find(
    (p) => p.user === user && p.vaultId === vaultId
  );

  const now = Date.now();
  if (position) {
    position.shares = round(position.shares + shares);
    position.principal = round(position.principal + amount);
    position.updatedAt = now;
  } else {
    position = {
      id: newPositionId(),
      user,
      vaultId,
      shares,
      principal: amount,
      createdAt: now,
      updatedAt: now,
    };
    store.positions.set(position.id, position);
  }

  return { position: serialize(position), tx };
}

function withdraw({ user, vaultId, shares }) {
  const vault = vaultService.getVaultRecord(vaultId);
  const position = Array.from(store.positions.values()).find(
    (p) => p.user === user && p.vaultId === vaultId
  );

  if (!position) {
    throw notFound(`No position found for user ${user} in vault ${vaultId}`);
  }
  if (shares > position.shares) {
    throw badRequest('Withdraw amount exceeds position shares', {
      requested: shares,
      available: position.shares,
    });
  }

  const assets = sharesToAssets(shares, vault.totalAssets, vault.totalShares);
  const tx = stellarService.submitInvocation('withdraw', { user, vaultId, shares });
  store.transactions.set(tx.txHash, { ...tx, user, vaultId, shares, assets });

  vault.totalAssets = round(vault.totalAssets - assets);
  vault.totalShares = round(vault.totalShares - shares);

  position.shares = round(position.shares - shares);
  // Reduce principal proportionally to the shares being redeemed.
  const principalFraction =
    position.shares <= 0
      ? 0
      : round(position.principal * (position.shares / (position.shares + shares)));
  position.principal = position.shares <= 0 ? 0 : principalFraction;
  position.updatedAt = Date.now();

  if (position.shares <= 0) {
    store.positions.delete(position.id);
    return { withdrawnAssets: assets, tx, position: null };
  }

  return { withdrawnAssets: assets, tx, position: serialize(position) };
}

function getPosition(id) {
  const position = store.positions.get(id);
  if (!position) {
    throw notFound(`Position ${id} not found`);
  }
  return serialize(position);
}

function listPositions(user) {
  return Array.from(store.positions.values())
    .filter((p) => !user || p.user === user)
    .map(serialize);
}

function listByVault(vaultId) {
  return Array.from(store.positions.values())
    .filter((p) => p.vaultId === vaultId)
    .map(serialize);
}

module.exports = {
  serialize,
  deposit,
  withdraw,
  getPosition,
  listPositions,
  listByVault,
};
