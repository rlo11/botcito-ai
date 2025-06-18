// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.'
  });
};

// Check if user has purchased a specific bot or bundle
const hasPurchased = (type = 'bot') => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let queryText;
      if (type === 'bot') {
        queryText = `
          SELECT 1 FROM user_purchases 
          WHERE user_id = $1 AND bot_id = $2 
          AND (expires_at IS NULL OR expires_at > NOW())
        `;
      } else {
        queryText = `
          SELECT 1 FROM user_purchases 
          WHERE user_id = $1 AND bundle_id = $2 
          AND (expires_at IS NULL OR expires_at > NOW())
        `;
      }

      const result = await query(queryText, [userId, id]);

      if (result.rows.length > 0) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. Purchase required.'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error checking purchase status.'
      });
    }
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role
      };
    }
  } catch (error) {
    // Silently continue without authentication
  }
  
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  hasPurchased,
  optionalAuth
};