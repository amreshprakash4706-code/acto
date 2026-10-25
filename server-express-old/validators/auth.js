'use strict';

const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['USER', 'AGENT']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
