// routes/subscription.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const subscriptionController = require('../controllers/subscription.controller');

// Create checkout session (protected)
router.post('/create-checkout', verifyToken, subscriptionController.createCheckoutSession);

// Check subscription status (protected)
router.get('/status', verifyToken, subscriptionController.checkSubscription);

// Webhook endpoint (no auth required - Stripe will call this)
// Note: This needs to be BEFORE the body parser middleware
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);

module.exports = router;