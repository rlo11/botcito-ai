// controllers/bot.controller.js
const { query } = require('../config/database');
const logger = require('../config/logger');

// Get all bots with optional filtering
const getAllBots = async (req, res) => {
  try {
    const { category, search, limit = 20, offset = 0 } = req.query;
    
    let queryText = `
      SELECT 
        b.id,
        b.name,
        b.slug,
        b.category,
        b.description,
        b.icon,
        b.color_gradient,
        b.features,
        b.tags,
        b.is_featured,
        b.rating,
        COALESCE(r.review_count, 0) as review_count
      FROM bots b
      LEFT JOIN (
        SELECT bot_id, COUNT(*) as review_count
        FROM bot_reviews
        GROUP BY bot_id
      ) r ON b.id = r.bot_id
      WHERE b.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;

    // Add category filter
    if (category && category !== 'all') {
      queryText += ` AND b.category = $${++paramCount}`;
      params.push(category);
    }

    // Add search filter
    if (search) {
      queryText += ` AND (
        b.name ILIKE $${++paramCount} OR 
        b.description ILIKE $${paramCount} OR
        b.tags::text ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Add ordering
    queryText += ' ORDER BY b.is_featured DESC, b.rating DESC, b.created_at DESC';

    // Add pagination
    queryText += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM bots WHERE is_active = true';
    const countParams = [];
    
    if (category && category !== 'all') {
      countQuery += ' AND category = $1';
      countParams.push(category);
    }
    
    if (search) {
      countQuery += countParams.length > 0 
        ? ` AND (name ILIKE $2 OR description ILIKE $2 OR tags::text ILIKE $2)`
        : ` AND (name ILIKE $1 OR description ILIKE $1 OR tags::text ILIKE $1)`;
      countParams.push(`%${search}%`);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        bots: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching bots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bots'
    });
  }
};

// Get single bot by slug or ID
const getBot = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const queryText = `
      SELECT 
        b.*,
        COALESCE(r.review_count, 0) as review_count,
        COALESCE(r.avg_rating, 0) as avg_rating,
        CASE 
          WHEN up.user_id IS NOT NULL THEN true 
          ELSE false 
        END as user_has_access
      FROM bots b
      LEFT JOIN (
        SELECT 
          bot_id, 
          COUNT(*) as review_count,
          AVG(rating) as avg_rating
        FROM bot_reviews
        GROUP BY bot_id
      ) r ON b.id = r.bot_id
      LEFT JOIN user_purchases up ON b.id = up.bot_id 
        AND up.user_id = $2 
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
      WHERE b.${isUUID ? 'id' : 'slug'} = $1 AND b.is_active = true
    `;
    
    const params = [identifier, req.user?.id || null];
    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }

    const bot = result.rows[0];

    // Increment usage count
    await query(
      'UPDATE bots SET usage_count = usage_count + 1 WHERE id = $1',
      [bot.id]
    );

    // Log analytics event if user is logged in
    if (req.user) {
      await query(
        `INSERT INTO analytics_events (user_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [req.user.id, 'bot_viewed', { bot_id: bot.id, bot_name: bot.name }]
      );
    }

    res.json({
      success: true,
      data: bot
    });
  } catch (error) {
    logger.error('Error fetching bot:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bot details'
    });
  }
};

// Get bot reviews
const getBotReviews = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Get bot ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const botQuery = await query(
      `SELECT id FROM bots WHERE ${isUUID ? 'id' : 'slug'} = $1`,
      [identifier]
    );

    if (botQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }

    const botId = botQuery.rows[0].id;

    // Get reviews
    const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.review,
        r.created_at,
        r.is_verified_purchase,
        u.first_name,
        u.last_name
      FROM bot_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.bot_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(reviewsQuery, [botId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM bot_reviews WHERE bot_id = $1',
      [botId]
    );

    res.json({
      success: true,
      data: {
        reviews: result.rows.map(review => ({
          ...review,
          // Only show first letter of last name for privacy
          reviewer_name: `${review.first_name} ${review.last_name.charAt(0)}.`
        })),
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching bot reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews'
    });
  }
};

// Get user's purchased bots
const getUserBots = async (req, res) => {
  try {
    const userId = req.user.id;

    const queryText = `
      SELECT DISTINCT
        b.id,
        b.name,
        b.slug,
        b.category,
        b.description,
        b.icon,
        b.color_gradient,
        b.features,
        b.prompt_template,
        b.instructions,
        b.example_usage,
        up.created_at as purchased_at
      FROM user_purchases up
      JOIN bots b ON up.bot_id = b.id
      WHERE up.user_id = $1 
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
        AND b.is_active = true
      ORDER BY up.created_at DESC
    `;

    const result = await query(queryText, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching user bots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your bots'
    });
  }
};

// Add bot review
const addBotReview = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Get bot ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const botQuery = await query(
      `SELECT id FROM bots WHERE ${isUUID ? 'id' : 'slug'} = $1`,
      [identifier]
    );

    if (botQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bot not found'
      });
    }

    const botId = botQuery.rows[0].id;

    // Check if user has purchased this bot
    const purchaseCheck = await query(
      `SELECT 1 FROM user_purchases 
       WHERE user_id = $1 AND bot_id = $2`,
      [userId, botId]
    );

    const isVerifiedPurchase = purchaseCheck.rows.length > 0;

    // Insert or update review
    const reviewResult = await query(
      `INSERT INTO bot_reviews (user_id, bot_id, rating, review, is_verified_purchase)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, bot_id) 
       DO UPDATE SET rating = $3, review = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [userId, botId, rating, review, isVerifiedPurchase]
    );

    // Update bot rating
    const avgRatingResult = await query(
      'SELECT AVG(rating) as avg_rating FROM bot_reviews WHERE bot_id = $1',
      [botId]
    );

    await query(
      'UPDATE bots SET rating = $1 WHERE id = $2',
      [avgRatingResult.rows[0].avg_rating, botId]
    );

    logger.info('Bot review added', { userId, botId, rating });

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        reviewId: reviewResult.rows[0].id,
        isVerifiedPurchase
      }
    });
  } catch (error) {
    logger.error('Error adding bot review:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review'
    });
  }
};

module.exports = {
  getAllBots,
  getBot,
  getBotReviews,
  getUserBots,
  addBotReview
};