'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const contactService = require('../services/contactService');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', contactLimiter, optionalAuth, async (req, res, next) => {
  try {
    const request = await contactService.createContactRequest(req.body, req.user?.id || null);
    res.status(201).json({
      success: true,
      data: {
        id: request.id,
        message: 'Contact request received. An agent will respond if appropriate.',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, requireRole('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const items = await contactService.listContactRequests(req.user);
    res.json({ success: true, data: { contactRequests: items } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, requireRole('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const updated = await contactService.updateContactStatus(req.params.id, req.body.status, req.user);
    res.json({ success: true, data: { contactRequest: updated } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
