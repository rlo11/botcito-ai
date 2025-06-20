// routes/bot.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const botController = require('../controllers/bot.controller');

// Public routes - anyone can see available bot templates
router.get('/templates', botController.getBotTemplates);

// Protected routes - require authentication
router.get('/user', verifyToken, botController.getUserBots);
router.post('/user/add', verifyToken, botController.addUserBot);
router.delete('/user/:botTemplateId', verifyToken, botController.removeUserBot);
router.get('/:botSlug', verifyToken, botController.getBotDetails);

module.exports = router;