'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const required = ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET'];

function loadConfig() {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  const config = {
    env,
    isProd,
    isDev: env === 'development',
    isTest: env === 'test',
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET || (isProd ? null : 'dev-session-secret-change-me'),
    jwtSecret: process.env.JWT_SECRET || (isProd ? null : 'dev-jwt-secret-change-me'),
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    geminiApiKey: process.env.GEMINI_API_KEY || null,
    redisUrl: process.env.REDIS_URL || null,
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'local',
      bucket: process.env.STORAGE_BUCKET || null,
      region: process.env.STORAGE_REGION || null,
      accessKey: process.env.STORAGE_ACCESS_KEY || null,
      secretKey: process.env.STORAGE_SECRET_KEY || null,
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || null,
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
      authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20', 10),
      aiMax: parseInt(process.env.RATE_LIMIT_AI_MAX || '18', 10),
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  };

  if (isProd) {
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(
        `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Set them in Vercel → Project → Settings → Environment Variables (or your host).'
      );
    }
  }

  return config;
}

module.exports = loadConfig();
