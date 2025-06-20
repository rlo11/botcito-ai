// routes/chat.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

// All chat routes require authentication
router.use(authenticate);

// Start new conversation
router.post('/conversations/start', chatController.startConversation);

// Send message and get response
router.post('/messages/send', chatController.sendMessage);

// Get conversation messages
router.get('/conversations/:conversationId', chatController.getConversation);

// Get user's conversations for a bot
router.get('/conversations/bot/:botSlug', chatController.getUserConversations);

// Delete conversation
router.delete('/conversations/:conversationId', chatController.deleteConversation);

module.exports = router;