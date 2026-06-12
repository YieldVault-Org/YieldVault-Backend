'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

/**
 * Build and configure the Express application. Kept separate from server.js so
 * the app can be imported for testing without binding a port.
 */
function createApp() {
  const app = express();

  // Core middleware.
  app.use(cors());
  app.use(express.json());
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
  app.use(requestId);
  app.use(requestLogger);

  // API routes.
  app.use('/api', routes);

  // Root welcome message.
  app.get('/', (req, res) => {
    res.json({
      service: 'yieldvault-backend',
      message: 'YieldVault API. See /api/health',
    });
  });

  // 404 and error handling (must come last).
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
