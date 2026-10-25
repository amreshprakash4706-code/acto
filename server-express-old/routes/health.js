'use strict';

const express = require('express');
const { prisma } = require('../db/connection');
const config = require('../config');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'atconiz',
    time: new Date().toISOString(),
    version: '4.0.0',
  });
});

router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'ok',
      aiConfigured: Boolean(config.geminiApiKey),
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'error',
      time: new Date().toISOString(),
    });
  }
});

module.exports = router;
