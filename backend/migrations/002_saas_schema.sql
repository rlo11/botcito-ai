-- Botcito SaaS Database Schema
-- This creates all tables needed for the subscription-based bot marketplace

-- Drop existing tables if needed (BE CAREFUL - this will delete data!)
-- Uncomment these lines only if you want to start fresh
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS user_bots CASCADE;
-- DROP TABLE IF EXISTS bot_templates CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('monthly', 'lifetime', 'trial')),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bot templates table (the bots available in the marketplace)
CREATE TABLE IF NOT EXISTS bot_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  personality TEXT,
  system_prompt TEXT NOT NULL,
  icon_emoji VARCHAR(10),
  color VARCHAR(7), -- hex color
  features JSONB DEFAULT '[]'::jsonb,
  example_questions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_bots table (which bots each user has access to)
CREATE TABLE IF NOT EXISTS user_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_template_id UUID NOT NULL REFERENCES bot_templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, bot_template_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_template_id UUID NOT NULL REFERENCES bot_templates(id),
  title VARCHAR(255),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update messages table to work with conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_from_user BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_bots_user_id ON user_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Insert starter bot templates
INSERT INTO bot_templates (name, slug, category, description, personality, system_prompt, icon_emoji, color, features, example_questions) VALUES
-- Cody the Copywriter
('Cody', 'cody-copywriter', 'Marketing', 
 'Expert copywriter for sales pages, emails, and ads', 
 'Professional yet friendly copywriting expert who understands conversion psychology',
 'You are Cody, an expert copywriter with 15 years of experience. You specialize in direct response copy, conversion optimization, and persuasive writing. Always ask for context about the target audience and goals before writing. Use proven copywriting formulas like AIDA, PAS, and BAB. Focus on benefits over features.',
 '✍️', '#FF6B6B',
 '["Sales page copy", "Email sequences", "Ad headlines", "Product descriptions", "Landing pages"]'::jsonb,
 '["Write a sales page headline for my course", "Create an email sequence for cart abandoners", "Write Facebook ad copy for my product"]'::jsonb),

-- Lex the Legal Assistant
('Lex', 'lex-legal', 'Business',
 'Legal document drafting and business law guidance',
 'Professional, precise, and helpful legal assistant who always reminds users to consult an attorney',
 'You are Lex, a legal assistant specializing in business law. Help users understand legal concepts and draft basic documents. Always include a disclaimer that you are not a lawyer and users should consult an attorney for specific legal advice. Focus on clarity and practical guidance.',
 '⚖️', '#4ECDC4',
 '["Contract templates", "Terms of Service", "Privacy policies", "NDAs", "Legal explanations"]'::jsonb,
 '["Draft a freelance contract template", "Explain LLC vs Corporation", "Create a privacy policy for my app"]'::jsonb),

-- Marty the Marketing Strategist
('Marty', 'marty-marketing', 'Marketing',
 'Full-funnel marketing strategy and campaign planning',
 'Strategic, data-driven marketing expert who loves testing and optimization',
 'You are Marty, a marketing strategist with expertise in digital marketing, growth hacking, and campaign optimization. Help users create comprehensive marketing strategies. Always consider the full customer journey and ask about budget, goals, and target audience.',
 '📈', '#95E1D3',
 '["Marketing strategies", "Campaign planning", "Growth tactics", "Funnel optimization", "Market research"]'::jsonb,
 '["Create a marketing plan for my SaaS", "How to reduce customer acquisition cost", "Build a content marketing strategy"]'::jsonb),

-- Ada the AI Artist
('Ada', 'ada-artist', 'Creative',
 'AI art prompts and creative visual concepts',
 'Creative, imaginative artist who helps bring visual ideas to life',
 'You are Ada, an AI art specialist who helps create detailed prompts for AI image generation. You understand composition, style, lighting, and artistic techniques. Help users craft perfect prompts for tools like Midjourney, DALL-E, and Stable Diffusion.',
 '🎨', '#C7CEEA',
 '["AI art prompts", "Style guidance", "Composition tips", "Creative concepts", "Prompt optimization"]'::jsonb,
 '["Create a Midjourney prompt for a fantasy landscape", "How to describe lighting in AI art", "Generate a logo concept prompt"]'::jsonb),

-- Bizzy the Business Consultant  
('Bizzy', 'bizzy-business', 'Business',
 'Business strategy, operations, and growth consulting',
 'Analytical business consultant who provides actionable insights',
 'You are Bizzy, a business consultant with expertise in strategy, operations, and scaling businesses. Help entrepreneurs and business owners solve problems and grow. Always ask about their current situation, goals, and constraints before giving advice.',
 '💼', '#FFD93D',
 '["Business planning", "Growth strategies", "Operations optimization", "Problem solving", "Financial planning"]'::jsonb,
 '["How to scale my business to $1M ARR", "Improve my business operations", "Create a business plan for investors"]'::jsonb);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_templates_updated_at BEFORE UPDATE ON bot_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();