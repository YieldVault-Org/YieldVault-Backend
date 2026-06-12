'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  bpsToRate,
  managementFee,
  performanceFee,
  netProfit,
} = require('../src/utils/fees');

test('bpsToRate converts basis points to a decimal rate', () => {
  assert.equal(bpsToRate(50), 0.005);
  assert.equal(bpsToRate(10000), 1);
  assert.equal(bpsToRate(0), 0);
  assert.equal(bpsToRate(-5), 0);
});

test('managementFee pro-rates the annual fee for a period', () => {
  // 200 bps (2%) on 1000 over a full year is 20.
  assert.equal(managementFee(1000, 200, 365), 20);
  // Half a year is half the fee.
  assert.equal(managementFee(1000, 200, 182.5), 10);
  assert.equal(managementFee(0, 200), 0);
});

test('performanceFee only applies to positive profit', () => {
  assert.equal(performanceFee(100, 1000), 10);
  assert.equal(performanceFee(-50, 1000), 0);
  assert.equal(performanceFee(0, 1000), 0);
});

test('netProfit subtracts the performance fee from profit', () => {
  assert.equal(netProfit(100, 1000), 90);
  assert.equal(netProfit(-20, 1000), 0);
});
