'use strict';

const express = require('express');
const dashboardService = require('../services/dashboardService');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/user', authenticate, async (req, res, next) => {
  try {
    const data = await dashboardService.getUserDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/agent', authenticate, requireRole('AGENT', 'ADMIN'), async (req, res, next) => {
  try {
    const data = await dashboardService.getAgentDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/admin', authenticate, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboard(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
