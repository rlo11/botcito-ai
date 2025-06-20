// config/database.js
const { Sequelize } = require('sequelize');
const logger = require('./logger');

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'botcito_db',
  process.env.DB_USER || 'postgres', 
  process.env.DB_PASSWORD || 'Snaked0911!!1!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    
    // Sync all models with database
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await sequelize.close();
    logger.info('PostgreSQL connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error closing PostgreSQL connection:', error);
    process.exit(1);
  }
});

module.exports = { sequelize, connectDB };