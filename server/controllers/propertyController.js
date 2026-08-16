'use strict';

const propertyService = require('../services/propertyService');

async function list(req, res, next) {
  try {
    const result = await propertyService.listProperties(req.query, req.user || null);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const property = await propertyService.getPropertyById(req.params.id, req.user || null);
    res.json({ success: true, data: { property } });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const property = await propertyService.createProperty(req.body, req.user);
    res.status(201).json({ success: true, data: { property } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.body, req.user);
    res.json({ success: true, data: { property } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await propertyService.deleteProperty(req.params.id, req.user);
    res.json({ success: true, data: { message: 'Property deleted' } });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };
