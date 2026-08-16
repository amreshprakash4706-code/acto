'use strict';

const authService = require('../services/authService');
const config = require('../config');

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = config.isProd;
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
    await authService.logout({
      refreshToken,
      userId: req.user?.id,
    });
    clearAuthCookies(res);
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
    const result = await authService.refreshAccessToken(refreshToken);
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    clearAuthCookies(res);
    res.json({ success: true, data: { message: 'Password changed. Please log in again.' } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  refresh,
  changePassword,
};
