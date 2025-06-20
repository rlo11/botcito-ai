// routes/bot.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const botController = require('../controllers/bot.controller');

// Public routes - anyone can see available bot templates
router.get('/templates', botController.getBotTemplates);

// Protected routes - require authentication
router.get('/user', authenticate, botController.getUserBots);
router.post('/user/add', authenticate, botController.addUserBot);
router.delete('/user/:botTemplateId', authenticate, botController.removeUserBot);
router.get('/:botSlug', authenticate, botController.getBotDetails);

module.exports = router;