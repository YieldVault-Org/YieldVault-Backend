'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  round,
  assetsToShares,
  sharesToAssets,
  pricePerShare,
} = require('../src/utils/math');

test('round trims floating point dust to six decimals', () => {
  assert.equal(round(1.23456789), 1.234568);
  assert.equal(round(0.1 + 0.2), 0.3);
});

test('assetsToShares mints 1:1 into an empty vault', () => {
  assert.equal(assetsToShares(100, 0, 0), 100);
});

test('assetsToShares scales by the current share/asset ratio', () => {
  // Vault worth 2 assets per share: depositing 200 assets mints 100 shares.
  assert.equal(assetsToShares(200, 2000, 1000), 100);
});

test('sharesToAssets is the inverse of assetsToShares', () => {
  const totalAssets = 2000;
  const totalShares = 1000;
  const shares = assetsToShares(200, totalAssets, totalShares);
  assert.equal(sharesToAssets(shares, totalAssets, totalShares), 200);
});

test('sharesToAssets returns 0 when there are no shares', () => {
  assert.equal(sharesToAssets(50, 1000, 0), 0);
});

test('pricePerShare defaults to 1 for an empty vault', () => {
  assert.equal(pricePerShare(0, 0), 1);
  assert.equal(pricePerShare(1500, 1000), 1.5);
});
