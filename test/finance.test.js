'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  compound,
  projectedYield,
  effectiveAnnualRate,
} = require('../src/utils/finance');

test('compound returns the principal for non-positive days', () => {
  assert.equal(compound(1000, 0.1, 0), 1000);
  assert.equal(compound(1000, 0.1, -5), 1000);
});

test('compound grows a principal over a full year', () => {
  // Daily compounding at 10% over a year exceeds simple 10% growth.
  const fv = compound(1000, 0.1, 365);
  assert.ok(fv > 1100);
  assert.ok(fv < 1106);
});

test('projectedYield is future value minus principal', () => {
  const principal = 5000;
  const fv = compound(principal, 0.08, 180);
  const earned = projectedYield(principal, 0.08, 180);
  // Allow for rounding: earned should match fv - principal within precision.
  assert.ok(Math.abs(earned - (fv - principal)) < 1e-6);
  assert.ok(earned > 0);
});

test('effectiveAnnualRate exceeds the nominal rate when compounding', () => {
  const ear = effectiveAnnualRate(0.1, 365);
  assert.ok(ear > 0.1);
  assert.ok(ear < 0.11);
});

test('effectiveAnnualRate guards invalid input', () => {
  assert.equal(effectiveAnnualRate(-0.1), 0);
  assert.equal(effectiveAnnualRate(0.1, 0), 0);
});
