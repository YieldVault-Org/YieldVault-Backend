'use strict';

const config = require('../config');

/**
 * Minimal level-aware logger. Avoids external dependencies so the app stays
 * lightweight. Levels in increasing severity: debug < info < warn < error.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(level) {
  const threshold = LEVELS[config.logLevel] || LEVELS.info;
  return LEVELS[level] >= threshold;
}

function format(level, args) {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level.toUpperCase()}]`, ...args];
}

const logger = {
  debug: (...args) => shouldLog('debug') && console.log(...format('debug', args)),
  info: (...args) => shouldLog('info') && console.log(...format('info', args)),
  warn: (...args) => shouldLog('warn') && console.warn(...format('warn', args)),
  error: (...args) => shouldLog('error') && console.error(...format('error', args)),
};

module.exports = logger;
