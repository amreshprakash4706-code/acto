'use strict';

const express = require('express');
const propertyController = require('../controllers/propertyController');
const validate = require('../middleware/validate');
const {
  propertyCreateSchema,
  propertyUpdateSchema,
  propertyQuerySchema,
} = require('../validators/property');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, validate(propertyQuerySchema, 'query'), propertyController.list);
router.get('/:id', optionalAuth, propertyController.getById);
router.post('/', authenticate, requireRole('AGENT', 'ADMIN'), validate(propertyCreateSchema), propertyController.create);
router.patch('/:id', authenticate, requireRole('AGENT', 'ADMIN'), validate(propertyUpdateSchema), propertyController.update);
router.delete('/:id', authenticate, requireRole('AGENT', 'ADMIN'), propertyController.remove);

module.exports = router;
