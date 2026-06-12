'use strict';

/**
 * Shared application constants.
 */
module.exports = {
  API_VERSION: 'v1',
  SERVICE_NAME: 'yieldvault-backend',
  // Supported underlying assets for vaults in the mock environment.
  SUPPORTED_ASSETS: ['USDC', 'XLM', 'EURC'],
  // One hundred percent expressed in basis points (1 bp = 0.01%).
  BPS_PER_UNIT: 10000,
  // Default fees applied by the mock protocol, in basis points.
  DEFAULT_MANAGEMENT_FEE_BPS: 100,
  DEFAULT_PERFORMANCE_FEE_BPS: 1000,
  // Bounds for mock history series (days) used by chart endpoints.
  MIN_HISTORY_DAYS: 1,
  MAX_HISTORY_DAYS: 365,
};
