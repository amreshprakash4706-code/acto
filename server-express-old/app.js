'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./logging/logger');
const requestId = require('./middleware/requestId');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const favoritesRoutes = require('./routes/favorites');
const reviewRoutes = require('./routes/reviews');
const viewingRoutes = require('./routes/viewings');
const contactRoutes = require('./routes/contact');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');

const app = express();

app.set('trust proxy', 1);

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/api/health' || req.url === '/api/ready',
    },
    customProps: (req) => ({ requestId: req.id }),
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || config.corsOrigins.includes(origin) || config.isDev) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// API routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/viewings', viewingRoutes);
app.use('/api/contact-requests', contactRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Static frontend (vanilla SPA)
const rootDir = path.resolve(__dirname, '..');
app.use(express.static(rootDir, {
  index: false,
  maxAge: config.isProd ? '1d' : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
