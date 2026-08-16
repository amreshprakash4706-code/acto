'use strict';

const express = require('express');
const viewingService = require('../services/viewingService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const items = await viewingService.listMyViewings(req.user.id);
    res.json({ success: true, data: { viewings: items } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const request = await viewingService.createViewingRequest(req.user.id, req.body);
    res.status(201).json({ success: true, data: { viewing: request } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await viewingService.updateViewingStatus(req.params.id, req.body.status, req.user);
    res.json({ success: true, data: { viewing: updated } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
