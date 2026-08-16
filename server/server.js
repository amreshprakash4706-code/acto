'use strict';

const app = require('./app');
const config = require('./config');
const logger = require('./logging/logger');
const { connect, disconnect } = require('./db/connection');

let server;

async function start() {
  try {
    await connect();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database — starting in degraded mode is not supported for production');
    if (config.isProd) {
      process.exit(1);
    }
    logger.warn('Continuing without DB in development (many routes will fail)');
  }

  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Atconiz server listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutting down gracefully');
    if (server) {
      server.close(async () => {
        await disconnect().catch(() => {});
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
