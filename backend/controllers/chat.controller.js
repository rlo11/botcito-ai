// controllers/chatController.js
const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');

// Import your AI provider (choose one)
// const Groq = require('groq-sdk');
// const OpenAI = require('openai');

// For now, we'll use mock responses
const USE_MOCK_AI = true;

// Initialize AI provider (uncomment when you have API keys)
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const chatController = {
  // Start new conversation
  startConversation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { botSlug } = req.body;

      // Get bot template
      const botResult = await query(`
        SELECT bt.* 
        FROM bot_templates bt
        JOIN user_bots ub ON ub.bot_template_id = bt.id
        WHERE bt.slug = $1 AND ub.user_id = $2 AND ub.is_active = true
      `, [botSlug, userId]);

      if (botResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bot not found or access denied'
        });
      }

      const bot = botResult.rows[0];

      // Create new conversation
      const conversationResult = await query(`
        INSERT INTO conversations (user_id, bot_template_id, title)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [userId, bot.id, 'New conversation']);

      // Update last used
      await query(`
        UPDATE user_bots 
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND bot_template_id = $2
      `, [userId, bot.id]);

      res.json({
        success: true,
        data: {
          conversationId: conversationResult.rows[0].id,
          bot: {
            name: bot.name,
            personality: bot.personality,
            icon_emoji: bot.icon_emoji,
            color: bot.color
          }
        }
      });

    } catch (error) {
      logger.error('Start conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start conversation'
      });
    }
  },

  // Send message and get AI response
  sendMessage: async (req, res) => {
    try {
      const userId = req.user.id;
      const { conversationId, message } = req.body;

      // Verify conversation ownership
      const convResult = await query(`
        SELECT c.*, bt.system_prompt, bt.name, bt.personality
        FROM conversations c
        JOIN bot_templates bt ON bt.id = c.bot_template_id
        WHERE c.id = $1 AND c.user_id = $2
      `, [conversationId, userId]);

      if (convResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      const conversation = convResult.rows[0];

      // Save user message
      await query(`
        INSERT INTO messages (conversation_id, content, is_from_user)
        VALUES ($1, $2, true)
      `, [conversationId, message]);

      // Get conversation history (last 10 messages)
      const historyResult = await query(`
        SELECT content, is_from_user
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [conversationId]);

      // Prepare messages for AI
      const messages = historyResult.rows.reverse().map(msg => ({
        role: msg.is_from_user ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add system prompt
      messages.unshift({
        role: 'system',
        content: conversation.system_prompt
      });

      // Get AI response
      let aiResponse;
      
      if (USE_MOCK_AI) {
        // Mock responses for testing
        aiResponse = getMockResponse(conversation.name, message);
      } else {
        // Real AI call (uncomment when ready)
        /*
        // For Groq:
        const completion = await groq.chat.completions.create({
          messages: messages,
          model: "llama3-70b-8192",
          temperature: 0.7,
          max_tokens: 1000
        });
        aiResponse = completion.choices[0].message.content;

        // For OpenAI:
        const completion = await openai.chat.completions.create({
          messages: messages,
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          max_tokens: 1000
        });
        aiResponse = completion.choices[0].message.content;
        */
      }

      // Save AI response
      const responseResult = await query(`
        INSERT INTO messages (conversation_id, content, is_from_user)
        VALUES ($1, $2, false)
        RETURNING id, created_at
      `, [conversationId, aiResponse]);

      // Update conversation
      await query(`
        UPDATE conversations 
        SET last_message_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [conversationId]);

      // Update conversation title if it's the first exchange
      if (messages.length <= 3) {
        const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        await query(`
          UPDATE conversations 
          SET title = $2
          WHERE id = $1
        `, [conversationId, title]);
      }

      res.json({
        success: true,
        data: {
          messageId: responseResult.rows[0].id,
          response: aiResponse,
          timestamp: responseResult.rows[0].created_at
        }
      });

    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
  },

  // Get conversation messages
  getConversation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      // Verify ownership
      const convCheck = await query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Get messages
      const result = await query(`
        SELECT id, content, is_from_user, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [conversationId]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation'
      });
    }
  },

  // Get user's conversations for a bot
  getUserConversations: async (req, res) => {
    try {
      const userId = req.user.id;
      const { botSlug } = req.params;

      const result = await query(`
        SELECT 
          c.id, c.title, c.last_message_at, c.created_at,
          bt.name as bot_name, bt.icon_emoji
        FROM conversations c
        JOIN bot_templates bt ON bt.id = c.bot_template_id
        WHERE c.user_id = $1 AND bt.slug = $2
        ORDER BY c.last_message_at DESC
        LIMIT 20
      `, [userId, botSlug]);

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Get user conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversations'
      });
    }
  },

  // Delete conversation
  deleteConversation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;

      const result = await query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted'
      });

    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation'
      });
    }
  }
};

// Mock response function for testing
function getMockResponse(botName, message) {
  const responses = {
    'Cody': [
      "I'd be happy to help you write compelling copy! To give you the best results, could you tell me more about your target audience and what action you want them to take?",
      "Great question! For effective copywriting, I always recommend starting with a strong hook. What's the main benefit your product offers?",
      "Based on what you've told me, here's a draft that focuses on benefits over features. Remember, people buy transformations, not products!"
    ],
    'Lex': [
      "I can help you with that legal question. However, please remember that I provide general information only and this isn't legal advice. For your specific situation, consider consulting with an attorney.",
      "From a legal perspective, there are several important considerations here. Let me break them down for you...",
      "That's a common concern for businesses. Generally speaking, you'll want to ensure your contracts include..."
    ],
    'Marty': [
      "Excellent marketing question! Let's think about this strategically. What's your current customer acquisition cost and lifetime value?",
      "For your marketing campaign, I'd recommend a multi-channel approach. Have you considered testing these channels?",
      "Based on current market trends, here's what's working well in your industry..."
    ],
    'Ada': [
      "I love helping with AI art prompts! For best results, let's include details about style, lighting, composition, and mood. What aesthetic are you going for?",
      "Here's a detailed prompt that should work well with Midjourney: [detailed artistic description]. Try adding '--ar 16:9 --v 6' for best results!",
      "Great artistic vision! To enhance your prompt, consider adding these elements: lighting direction, color palette, and artistic style references."
    ],
    'Bizzy': [
      "Let's analyze this from a business strategy perspective. What are your current revenue streams and which is most profitable?",
      "For scaling your business, I recommend focusing on these three key areas: systematization, delegation, and strategic partnerships.",
      "That's a smart question. Based on your situation, here's a step-by-step plan to reach your growth goals..."
    ]
  };

  const botResponses = responses[botName] || responses['Cody'];
  return botResponses[Math.floor(Math.random() * botResponses.length)];
}

module.exports = chatController;