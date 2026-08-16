'use strict';

/**
 * Basic unit-style tests for validation schemas and error classes.
 * Full integration tests require a running PostgreSQL instance.
 * Run: npm test
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { registerSchema, loginSchema } = require('../validators/auth');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
} = require('../utils/errors');

describe('auth validators', () => {
  it('accepts valid registration payload', () => {
    const result = registerSchema.parse({
      email: 'test@example.com',
      password: 'securepass1',
      name: 'Test User',
    });
    assert.equal(result.email, 'test@example.com');
  });

  it('rejects short password', () => {
    assert.throws(() =>
      registerSchema.parse({ email: 'a@b.com', password: 'short' })
    );
  });

  it('rejects invalid email', () => {
    assert.throws(() =>
      registerSchema.parse({ email: 'not-an-email', password: 'longenough' })
    );
  });

  it('accepts login payload', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'anything',
    });
    assert.ok(result.email);
  });
});

describe('error classes', () => {
  it('AppError carries status and code', () => {
    const err = new AppError('msg', 400, 'CODE');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'CODE');
    assert.equal(err.isOperational, true);
  });

  it('ValidationError is 400', () => {
    const err = new ValidationError('bad');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'VALIDATION_ERROR');
  });

  it('AuthenticationError is 401', () => {
    assert.equal(new AuthenticationError().statusCode, 401);
  });

  it('AuthorizationError is 403', () => {
    assert.equal(new AuthorizationError().statusCode, 403);
  });
});
