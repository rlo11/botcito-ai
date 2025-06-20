// controllers/bot.controller.js
const User = require('../models/User');

// Get all available bot templates
exports.getBotTemplates = async (req, res) => {
  try {
    // This would come from a database in production
    const botTemplates = [
      {
        id: 'bot_001',
        slug: 'cody-copywriter',
        name: 'Cody',
        category: 'Marketing',
        description: 'Your AI copywriting assistant for compelling marketing content',
        icon_emoji: '✍️',
        prompt_template: 'You are Cody, an expert copywriting assistant...',
        features: ['Sales copy', 'Email campaigns', 'Ad copy', 'Headlines'],
        example_prompts: [
          'Write a product description for...',
          'Create an email subject line for...',
          'Generate ad copy for Facebook...'
        ]
      },
      {
        id: 'bot_002',
        slug: 'lex-legal',
        name: 'Lex',
        category: 'Legal',
        description: 'AI legal assistant for document drafting and legal research',
        icon_emoji: '⚖️',
        prompt_template: 'You are Lex, a knowledgeable legal assistant...',
        features: ['Contract drafting', 'Legal research', 'Document review', 'Compliance'],
        example_prompts: [
          'Draft a simple NDA for...',
          'What are the key points in...',
          'Review this contract clause...'
        ]
      },
      {
        id: 'bot_003',
        slug: 'marty-marketer',
        name: 'Marty',
        category: 'Marketing',
        description: 'Strategic marketing advisor for campaigns and growth',
        icon_emoji: '📈',
        prompt_template: 'You are Marty, a strategic marketing advisor...',
        features: ['Marketing strategy', 'Campaign planning', 'Market analysis', 'Growth hacking'],
        example_prompts: [
          'Create a marketing plan for...',
          'Analyze my competitor strategy...',
          'Suggest growth tactics for...'
        ]
      },
      {
        id: 'bot_004',
        slug: 'ada-analyst',
        name: 'Ada',
        category: 'Analytics',
        description: 'Data analysis expert for insights and reporting',
        icon_emoji: '📊',
        prompt_template: 'You are Ada, a data analysis expert...',
        features: ['Data interpretation', 'Report generation', 'Trend analysis', 'KPI tracking'],
        example_prompts: [
          'Analyze these sales metrics...',
          'What trends do you see in...',
          'Create a report summary for...'
        ]
      },
      {
        id: 'bot_005',
        slug: 'bizzy-business',
        name: 'Bizzy',
        category: 'Business',
        description: 'Business operations assistant for productivity and planning',
        icon_emoji: '💼',
        prompt_template: 'You are Bizzy, a business operations assistant...',
        features: ['Business planning', 'Process optimization', 'Meeting prep', 'Documentation'],
        example_prompts: [
          'Create an agenda for...',
          'Optimize our workflow for...',
          'Draft a business proposal...'
        ]
      }
    ];

    res.json({
      success: true,
      data: {
        bots: botTemplates,
        categories: ['Marketing', 'Legal', 'Analytics', 'Business'],
        total: botTemplates.length
      }
    });
  } catch (error) {
    console.error('Error fetching bot templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bot templates'
    });
  }
};

// Get user's active bots
exports.getUserBots = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('bots');
    
    res.json({
      success: true,
      data: {
        bots: user.bots || [],
        total: user.bots ? user.bots.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching user bots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bots'
    });
  }
};

// Add a bot to user's collection
exports.addUserBot = async (req, res) => {
  try {
    const { botTemplateId } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check if bot already added
    if (user.bots && user.bots.includes(botTemplateId)) {
      return res.status(400).json({
        success: false,
        message: 'Bot already added to your collection'
      });
    }
    
    // Add bot to user's collection
    user.bots = user.bots || [];
    user.bots.push(botTemplateId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Bot added successfully',
      data: {
        botId: botTemplateId
      }
    });
  } catch (error) {
    console.error('Error adding bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add bot'
    });
  }
};

// Remove a bot from user's collection
exports.removeUserBot = async (req, res) => {
  try {
    const { botTemplateId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (!user.bots || !user.bots.includes(botTemplateId)) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found in your collection'
      });
    }
    
    // Remove bot from user's collection
    user.bots = user.bots.filter(bot => bot !== botTemplateId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Bot removed successfully'
    });
  } catch (error) {
    console.error('Error removing bot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove bot'
    });
  }
};

// Get specific bot details
exports.getBotDetails = async (req, res) => {
  try {
    const { botSlug } = req.params;
    
    // Get bot templates (same as above)
    const botTemplates = [
      {
        id: 'bot_001',
        slug: 'cody-copywriter',
        name: 'Cody',
        category: 'Marketing',
        description: 'Your AI copywriting assistant for compelling marketing content',
        icon_emoji: '✍️',
        prompt_template: 'You are Cody, an expert copywriting assistant...',
        features: ['Sales copy', 'Email campaigns', 'Ad copy', 'Headlines'],
        example_prompts: [
          'Write a product description for...',
          'Create an email subject line for...',
          'Generate ad copy for Facebook...'
        ]
      },
      {
        id: 'bot_002',
        slug: 'lex-legal',
        name: 'Lex',
        category: 'Legal',
        description: 'AI legal assistant for document drafting and legal research',
        icon_emoji: '⚖️',
        prompt_template: 'You are Lex, a knowledgeable legal assistant...',
        features: ['Contract drafting', 'Legal research', 'Document review', 'Compliance'],
        example_prompts: [
          'Draft a simple NDA for...',
          'What are the key points in...',
          'Review this contract clause...'
        ]
      },
      {
        id: 'bot_003',
        slug: 'marty-marketer',
        name: 'Marty',
        category: 'Marketing',
        description: 'Strategic marketing advisor for campaigns and growth',
        icon_emoji: '📈',
        prompt_template: 'You are Marty, a strategic marketing advisor...',
        features: ['Marketing strategy', 'Campaign planning', 'Market analysis', 'Growth hacking'],
        example_prompts: [
          'Create a marketing plan for...',
          'Analyze my competitor strategy...',
          'Suggest growth tactics for...'
        ]
      },
      {
        id: 'bot_004',
        slug: 'ada-analyst',
        name: 'Ada',
        category: 'Analytics',
        description: 'Data analysis expert for insights and reporting',
        icon_emoji: '📊',
        prompt_template: 'You are Ada, a data analysis expert...',
        features: ['Data interpretation', 'Report generation', 'Trend analysis', 'KPI tracking'],
        example_prompts: [
          'Analyze these sales metrics...',
          'What trends do you see in...',
          'Create a report summary for...'
        ]
      },
      {
        id: 'bot_005',
        slug: 'bizzy-business',
        name: 'Bizzy',
        category: 'Business',
        description: 'Business operations assistant for productivity and planning',
        icon_emoji: '💼',
        prompt_template: 'You are Bizzy, a business operations assistant...',
        features: ['Business planning', 'Process optimization', 'Meeting prep', 'Documentation'],
        example_prompts: [
          'Create an agenda for...',
          'Optimize our workflow for...',
          'Draft a business proposal...'
        ]
      }
    ];
    
    // Find the specific bot
    const bot = botTemplates.find(b => b.slug === botSlug);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }
    
    // Check if user has access to this bot
    const user = await User.findById(req.user.id);
    const hasAccess = user.bots && user.bots.includes(bot.id);
    
    res.json({
      success: true,
      data: {
        bot: bot,
        hasAccess: hasAccess
      }
    });
  } catch (error) {
    console.error('Error fetching bot details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bot details'
    });
  }
};