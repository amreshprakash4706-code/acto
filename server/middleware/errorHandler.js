'use strict';

const logger = require('../logging/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404, 'NOT_FOUND'));
}

function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || null;

  if (err instanceof AppError && err.isOperational) {
    logger.warn(
      {
        err: { message: err.message, code: err.code, statusCode: err.statusCode },
        requestId,
        path: req.path,
        method: req.method,
      },
      'Operational error'
    );

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      requestId,
    });
  }

  // Unexpected
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled error'
  );

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProd ? 'An unexpected error occurred' : err.message,
    },
    requestId,
  });
}

module.exports = { notFoundHandler, errorHandler };
