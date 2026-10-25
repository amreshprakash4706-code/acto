'use strict';

const express = require('express');
const favoritesService = require('../services/favoritesService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const items = await favoritesService.listFavorites(req.user.id);
    res.json({ success: true, data: { favorites: items } });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'propertyId required' } });
    }
    await favoritesService.addFavorite(req.user.id, propertyId);
    res.status(201).json({ success: true, data: { message: 'Added to favorites' } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:propertyId', async (req, res, next) => {
  try {
    await favoritesService.removeFavorite(req.user.id, req.params.propertyId);
    res.json({ success: true, data: { message: 'Removed from favorites' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
