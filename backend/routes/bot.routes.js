const express = require('express');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const botController = require('../controllers/bot.controller');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, botController.getAllBots);
router.get('/:identifier', optionalAuth, botController.getBot);
router.get('/:identifier/reviews', botController.getBotReviews);

// Protected routes
router.get('/user/purchased', verifyToken, botController.getUserBots);
router.post('/:identifier/reviews', verifyToken, botController.addBotReview);

module.exports = router;