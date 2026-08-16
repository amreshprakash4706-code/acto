'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const aiService = require('../services/aiService');
const { optionalAuth } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.aiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'AI rate limit exceeded' } },
});

router.post('/chat', aiLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { message, conversationId, propertyId } = req.body;
    const result = await aiService.chat({
      userId: req.user?.id || null,
      message,
      conversationId,
      propertyId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
