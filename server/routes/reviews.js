'use strict';

const express = require('express');
const reviewService = require('../services/reviewService');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/property/:propertyId', async (req, res, next) => {
  try {
    const reviews = await reviewService.listReviewsForProperty(req.params.propertyId);
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { propertyId, rating, title, body } = req.body;
    const review = await reviewService.createReview(req.user.id, propertyId, { rating, title, body });
    res.status(201).json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/moderate', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const review = await reviewService.moderateReview(req.params.id, req.body.status, req.user.id);
    res.json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
