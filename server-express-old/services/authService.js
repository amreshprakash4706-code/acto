'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../db/connection');
const config = require('../config');
const {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');
const logger = require('../logging/logger');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function register({ email, password, name, role = 'USER' }) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ValidationError('Invalid email format');
  }

  // Only allow USER or AGENT self-registration; ADMIN must be promoted
  const allowedRoles = ['USER', 'AGENT'];
  const finalRole = allowedRoles.includes(role) ? role : 'USER';

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name ? String(name).trim().slice(0, 120) : null,
      role: finalRole,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (finalRole === 'AGENT') {
    await prisma.agentProfile.create({
      data: { userId: user.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'USER_REGISTERED',
      resource: 'user',
      resourceId: user.id,
      metadata: { role: finalRole },
    },
  });

  logger.info({ userId: user.id, role: finalRole }, 'User registered');
  return user;
}

async function login({ email, password, userAgent, ip }) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
      agentProfile: { select: { id: true, verified: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new AuthenticationError('Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AuthenticationError('Invalid email or password');
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, type: 'access' },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpires }
  );

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshHash = hashToken(refreshToken);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: refreshExpires,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'USER_LOGIN',
      resource: 'user',
      resourceId: user.id,
      ip: ip || null,
      userAgent: userAgent || null,
    },
  });

  const { passwordHash, ...safeUser } = user;
  return {
    user: safeUser,
    accessToken,
    refreshToken,
    expiresIn: config.jwtAccessExpires,
  };
}

async function logout({ refreshToken, userId }) {
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  if (userId) {
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'USER_LOGOUT',
        resource: 'user',
        resourceId: userId,
      },
    });
  }
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }
  const hash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: { select: { id: true, role: true, isActive: true } } },
  });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  if (!record.user.isActive) {
    throw new AuthenticationError('Account inactive');
  }

  const accessToken = jwt.sign(
    { sub: record.user.id, role: record.user.role, type: 'access' },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpires }
  );

  return { accessToken, expiresIn: config.jwtAccessExpires };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      agentProfile: true,
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new AuthenticationError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      resource: 'user',
      resourceId: userId,
    },
  });
}

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  getMe,
  changePassword,
  hashToken,
};
