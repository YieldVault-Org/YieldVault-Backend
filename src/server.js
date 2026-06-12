'use strict';

const createApp = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const seed = require('./store/seed');

/**
 * Server entrypoint: seed demo data, start listening and handle shutdown.
 */
function start() {
  seed();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(
      `YieldVault backend listening on port ${config.port} (${config.env})`
    );
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

start();
