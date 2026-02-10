-- Add lead scoring configuration to integration_config
-- Configurable thresholds and weights for Hot Leads and scoring

ALTER TABLE integration_config
ADD COLUMN IF NOT EXISTS lead_scoring_config JSONB DEFAULT '{}';

COMMENT ON COLUMN integration_config.lead_scoring_config IS 'JSONB: hot_threshold, warm_threshold, include_human_contact_requests, weights (conversation_length, booking_clicks, etc.), ai_filtering_instructions';

-- Allow human_contact_requested in event_logs (used by chat and Hot Leads)
-- PostgreSQL: drop existing check and add new one including the value
DO $$
BEGIN
  ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_event_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL; -- constraint name may vary
END $$;

ALTER TABLE event_logs
ADD CONSTRAINT event_logs_event_type_check
CHECK (event_type IN (
  'wa_click',
  'assistant_open',
  'chat_started',
  'book_click',
  'form_submit',
  'human_contact_requested'
));
