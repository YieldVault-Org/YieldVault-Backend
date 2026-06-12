'use strict';

/**
 * Pagination helpers for list endpoints.
 *
 * Parses `limit` and `offset` query parameters into safe, bounded numbers and
 * applies them to an array, returning the page alongside metadata clients need
 * to render paging controls.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Coerce raw query values into a clean { limit, offset } pair. Invalid or
 * out-of-range inputs fall back to safe defaults rather than erroring.
 */
function parseParams(query = {}) {
  let limit = parseInt(query.limit, 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    limit = DEFAULT_LIMIT;
  }
  limit = Math.min(limit, MAX_LIMIT);

  let offset = parseInt(query.offset, 10);
  if (!Number.isInteger(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

/**
 * Slice an array into a page and attach pagination metadata.
 */
function paginate(items, query = {}) {
  const { limit, offset } = parseParams(query);
  const data = items.slice(offset, offset + limit);
  return {
    data,
    pagination: {
      total: items.length,
      limit,
      offset,
      hasMore: offset + limit < items.length,
    },
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parseParams,
  paginate,
};
