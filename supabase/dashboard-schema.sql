-- Phase 1: Dashboard & Analytics Database Schema
-- Add this to your existing Supabase database

-- Conversation ratings table
CREATE TABLE IF NOT EXISTS conversation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 0, 1)), -- -1: bad, 0: neutral, 1: good
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_ratings_conversation_id ON conversation_ratings(conversation_id);

-- Unanswered queries table
CREATE TABLE IF NOT EXISTS unanswered_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  language TEXT,
  frequency INTEGER DEFAULT 1,
  first_asked TIMESTAMPTZ DEFAULT NOW(),
  last_asked TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_unanswered_queries_resolved ON unanswered_queries(resolved);
CREATE INDEX IF NOT EXISTS idx_unanswered_queries_frequency ON unanswered_queries(frequency DESC);

-- Add columns to existing leads table
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'closed', 'lost')),
  ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMPTZ;

-- Add columns to existing conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score DECIMAL;

-- Add columns to existing knowledge_base table
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ;

-- Function to increment knowledge base usage
CREATE OR REPLACE FUNCTION increment_kb_usage(kb_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base 
  SET usage_count = usage_count + 1,
      last_used = NOW()
  WHERE id = kb_id;
END;
$$ LANGUAGE plpgsql;

-- View for dashboard stats
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '24 hours') as leads_today,
  (SELECT COUNT(*) FROM conversations WHERE status = 'active') as active_conversations,
  (SELECT COUNT(*) FROM conversations WHERE status = 'escalated' AND created_at > NOW() - INTERVAL '7 days') as booking_requests_week,
  (SELECT COUNT(*) FROM leads WHERE synced_to_mailchimp = true) as mailchimp_synced,
  (SELECT COUNT(*) FROM leads WHERE synced_to_hubspot = true) as hubspot_synced,
  (SELECT AVG(turn_count) FROM conversations) as avg_conversation_length;

-- View for top questions
CREATE OR REPLACE VIEW top_questions AS
SELECT 
  messages->0->>'content' as first_question,
  COUNT(*) as frequency,
  language
FROM conversations
WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
GROUP BY first_question, language
ORDER BY frequency DESC
LIMIT 20;


