// models/index.js
const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');

// Define associations
User.hasMany(Conversation, { 
  foreignKey: 'userId',
  as: 'conversations' 
});

Conversation.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user' 
});

Conversation.hasMany(Message, { 
  foreignKey: 'conversationId',
  as: 'messages' 
});

Message.belongsTo(Conversation, { 
  foreignKey: 'conversationId',
  as: 'conversation' 
});

module.exports = {
  User,
  Conversation,
  Message
};