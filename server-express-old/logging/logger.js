'use strict';

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProd ? 'info' : 'debug'),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: 'atconiz',
    env: config.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'GEMINI_API_KEY',
      'jwtSecret',
      'sessionSecret',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
