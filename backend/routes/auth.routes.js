// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// Register
router.post(
  '/register',
  [
    check('email').isEmail().normalizeEmail(),
    check('password').isLength({ min: 6 }),
    check('firstName').notEmpty().trim(),
    check('lastName').notEmpty().trim()
  ],
  validateRequest,
  authController.register
);

// Login
router.post(
  '/login',
  [
    check('email').isEmail().normalizeEmail(),
    check('password').notEmpty()
  ],
  validateRequest,
  authController.login
);

// Logout
router.post('/logout', authController.logout);

// Refresh token (no body validation needed - uses cookies)
router.post('/refresh-token', authController.refreshToken);

// Get current user profile (protected)
router.get('/profile', authenticate, authController.getProfile);

// Update profile (protected)
router.put(
  '/profile',
  authenticate,
  [
    check('firstName').optional().notEmpty().trim(),
    check('lastName').optional().notEmpty().trim()
  ],
  validateRequest,
  authController.updateProfile
);

// Change password (protected)
router.post(
  '/change-password',
  authenticate,
  [
    check('currentPassword').notEmpty(),
    check('newPassword').isLength({ min: 6 })
  ],
  validateRequest,
  authController.changePassword
);

// Forgot password
router.post(
  '/forgot-password',
  [
    check('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  [
    check('token').notEmpty(),
    check('newPassword').isLength({ min: 6 })
  ],
  validateRequest,
  authController.resetPassword
);

module.exports = router;