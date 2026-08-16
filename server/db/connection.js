'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../logging/logger');
const config = require('../config');

const prisma = new PrismaClient({
  log: config.isDev
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [{ emit: 'stdout', level: 'error' }],
});

if (config.isDev) {
  prisma.$on('query', (e) => {
    if (process.env.LOG_QUERIES === '1') {
      logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'prisma query');
    }
  });
}

async function connect() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    throw err;
  }
}

async function disconnect() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

module.exports = { prisma, connect, disconnect };
