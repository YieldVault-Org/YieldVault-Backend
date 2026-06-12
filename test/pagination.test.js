'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parseParams,
  paginate,
} = require('../src/utils/pagination');

test('parseParams falls back to defaults for missing values', () => {
  assert.deepEqual(parseParams(), { limit: DEFAULT_LIMIT, offset: 0 });
  assert.deepEqual(parseParams({}), { limit: DEFAULT_LIMIT, offset: 0 });
});

test('parseParams clamps limit to MAX_LIMIT', () => {
  assert.equal(parseParams({ limit: '500' }).limit, MAX_LIMIT);
});

test('parseParams rejects invalid limit and offset', () => {
  assert.equal(parseParams({ limit: 'abc' }).limit, DEFAULT_LIMIT);
  assert.equal(parseParams({ limit: '0' }).limit, DEFAULT_LIMIT);
  assert.equal(parseParams({ offset: '-5' }).offset, 0);
  assert.equal(parseParams({ offset: 'xyz' }).offset, 0);
});

test('paginate slices the array and reports metadata', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const { data, pagination } = paginate(items, { limit: '10', offset: '0' });
  assert.equal(data.length, 10);
  assert.equal(data[0], 0);
  assert.deepEqual(pagination, {
    total: 25,
    limit: 10,
    offset: 0,
    hasMore: true,
  });
});

test('paginate reports hasMore false on the last page', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  const { data, pagination } = paginate(items, { limit: '10', offset: '20' });
  assert.equal(data.length, 5);
  assert.equal(pagination.hasMore, false);
});
