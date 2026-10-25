'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../db/connection');
const {
  AuthenticationError,
  AuthorizationError,
} = require('../utils/errors');

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  return null;
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError();
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }

    if (payload.type && payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        agentProfile: { select: { id: true, verified: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Account inactive or not found');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  return authenticate(req, res, next);
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Requires one of roles: ${roles.join(', ')}`));
    }
    next();
  };
}

function requireSelfOrRole(paramName = 'userId', ...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    const targetId = req.params[paramName];
    if (req.user.id === targetId || roles.includes(req.user.role)) {
      return next();
    }
    return next(new AuthorizationError());
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireSelfOrRole,
  extractToken,
};
