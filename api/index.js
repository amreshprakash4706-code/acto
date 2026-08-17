'use strict';

/**
 * Vercel serverless entry point.
 * Mounts the Express application so all /api/* routes are handled here.
 * Static frontend files are served by Vercel directly (see vercel.json routes).
 */
const app = require('../server/app');

module.exports = app;
