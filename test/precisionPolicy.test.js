'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DECIMAL_PLACES,
  MIN_UNIT,
  MAX_SUPPORTED_AMOUNT,
  canonicalizeAmount,
  conversionMetadata,
  assetsToShares,
  sharesToAssets,
  quoteAssetsToShares,
  quoteSharesToAssets,
} = require('../src/utils/math');
const { bpsToRate, managementFee, performanceFee, netProfit } = require('../src/utils/fees');

test('the policy constants describe one supported unit', () => {
  assert.equal(DECIMAL_PLACES, 6);
  assert.equal(MIN_UNIT, 0.000001);
  assert.equal(MAX_SUPPORTED_AMOUNT, 1e12);
  assert.deepEqual(conversionMetadata(), {
    decimalPlaces: 6,
    minimumUnit: 0.000001,
    rounding: 'nearest',
  });
});

test('canonicalizeAmount accepts supported whole and fractional amounts', () => {
  const values = [0, 1, 1.1, 1.123456, 1000.000001, 1e12];
  for (const value of values) assert.equal(canonicalizeAmount(value), value);
});

test('canonicalizeAmount rejects non-number inputs', () => {
  for (const value of [undefined, null, '1', {}, [], NaN, Infinity, -Infinity]) {
    assert.throws(() => canonicalizeAmount(value), /finite number/);
  }
});

test('canonicalizeAmount rejects negative and forbidden zero values', () => {
  assert.throws(() => canonicalizeAmount(-1), /greater than zero/);
  assert.throws(() => canonicalizeAmount(0, { allowZero: false }), /greater than zero/);
  assert.equal(canonicalizeAmount(0), 0);
});

test('canonicalizeAmount rejects values larger than the supported maximum', () => {
  assert.throws(() => canonicalizeAmount(MAX_SUPPORTED_AMOUNT + 1), /must not exceed/);
  assert.throws(() => canonicalizeAmount(Number.MAX_SAFE_INTEGER), /must not exceed/);
});

test('canonicalizeAmount rejects values below the minimum unit', () => {
  assert.throws(() => canonicalizeAmount(0.0000001), /at most 6 decimal places/);
  assert.throws(() => canonicalizeAmount(10.0000009), /at most 6 decimal places/);
});

test('asset to share conversion is deterministic at one-to-one price', () => {
  for (const amount of [0.000001, 1, 10.5, 1000000.123456]) {
    assert.equal(assetsToShares(amount, 1000, 1000), amount);
  }
});

test('asset to share conversion scales down when the vault price rises', () => {
  assert.equal(assetsToShares(100, 2000, 1000), 50);
  assert.equal(assetsToShares(0.000001, 2000, 1000), 0.000001);
});

test('asset to share conversion uses one-to-one for an empty vault', () => {
  assert.equal(assetsToShares(123.456789, 0, 0), 123.456789);
  assert.equal(assetsToShares(123.456789, 0, 100), 123.456789);
});

test('share to asset conversion is deterministic at one-to-one price', () => {
  for (const shares of [0.000001, 1, 10.5, 1000000.123456]) {
    assert.equal(sharesToAssets(shares, 1000, 1000), shares);
  }
});

test('share to asset conversion scales up when yield accrues', () => {
  assert.equal(sharesToAssets(50, 2000, 1000), 100);
  assert.equal(sharesToAssets(0.000001, 2000, 1000), 0.000002);
});

test('share conversion has a safe empty-share result', () => {
  assert.equal(sharesToAssets(1, 1000, 0), 0);
  assert.equal(sharesToAssets(0.000001, 0, 0), 0);
});

test('asset and share round trips stay within the canonical unit', () => {
  const cases = [
    [1, 1000, 1000],
    [12.345678, 1000, 800],
    [999999.999999, 5000000, 2500000],
    [0.000001, 1, 3],
  ];
  for (const [amount, totalAssets, totalShares] of cases) {
    const shares = assetsToShares(amount, totalAssets, totalShares);
    const recovered = sharesToAssets(shares, totalAssets, totalShares);
    assert.ok(Math.abs(recovered - amount) <= 2 * MIN_UNIT);
  }
});

test('asset quote carries the normalized input, result and policy', () => {
  const quote = quoteAssetsToShares(125.5, 1000, 800);
  assert.equal(quote.assets, 125.5);
  assert.equal(quote.shares, 100.4);
  assert.equal(quote.pricePerShare, 1.25);
  assert.equal(quote.policy.decimalPlaces, DECIMAL_PLACES);
});

test('share quote carries the normalized input, result and policy', () => {
  const quote = quoteSharesToAssets(100.4, 1000, 800);
  assert.equal(quote.shares, 100.4);
  assert.equal(quote.assets, 125.5);
  assert.equal(quote.pricePerShare, 1.25);
  assert.equal(quote.policy.rounding, 'nearest');
});

test('quotes reject unsupported precision before calculating a result', () => {
  assert.throws(() => quoteAssetsToShares(1.0000001, 1000, 1000), /at most 6/);
  assert.throws(() => quoteSharesToAssets(1.0000001, 1000, 1000), /at most 6/);
});

test('quotes reject unsafe maximums before state mutation can occur', () => {
  assert.throws(() => quoteAssetsToShares(1e12 + 1, 1000, 1000), /must not exceed/);
  assert.throws(() => quoteSharesToAssets(1e12 + 1, 1000, 1000), /must not exceed/);
});

test('fee rates allow zero through the maximum supported basis points', () => {
  assert.equal(bpsToRate(0), 0);
  assert.equal(bpsToRate(10000), 1);
  assert.throws(() => bpsToRate(10001), /cannot exceed/);
});

test('management fees preserve the same amount precision policy', () => {
  assert.equal(managementFee(1000.123456, 200, 365), 20.002469);
  assert.equal(managementFee(1000, 200, 0), 0);
  assert.equal(managementFee(1000, 200, -1), 0);
});

test('performance and net profit never turn a loss into a fee', () => {
  assert.equal(performanceFee(-1, 1000), 0);
  assert.equal(performanceFee(0, 1000), 0);
  assert.equal(netProfit(-1, 1000), 0);
  assert.equal(netProfit(0, 1000), 0);
});

test('performance fee is bounded by the configured fee cap', () => {
  assert.equal(performanceFee(100, 10000), 100);
  assert.throws(() => performanceFee(100, 10001), /cannot exceed/);
});

test('policy metadata is safe to serialize for API clients', () => {
  const encoded = JSON.stringify(conversionMetadata());
  assert.equal(encoded, '{"decimalPlaces":6,"minimumUnit":0.000001,"rounding":"nearest"}');
  assert.deepEqual(JSON.parse(encoded), conversionMetadata());
});

test('repeated quotes are byte-equivalent for identical vault state', () => {
  const first = JSON.stringify(quoteAssetsToShares(42.123456, 1000, 777));
  const second = JSON.stringify(quoteAssetsToShares(42.123456, 1000, 777));
  assert.equal(first, second);
});

test('changing the vault price changes both quote value and metadata consistently', () => {
  const low = quoteAssetsToShares(100, 1000, 1000);
  const high = quoteAssetsToShares(100, 2000, 1000);
  assert.equal(low.shares, 100);
  assert.equal(high.shares, 50);
  assert.deepEqual(low.policy, high.policy);
});
