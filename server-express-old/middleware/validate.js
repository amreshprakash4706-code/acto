'use strict';

const { ValidationError } = require('../utils/errors');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
      const parsed = schema.parse(data);
      if (source === 'query') req.query = parsed;
      else if (source === 'params') req.params = parsed;
      else req.body = parsed;
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(
          new ValidationError('Invalid request', err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })))
        );
      }
      next(err);
    }
  };
}

module.exports = validate;
