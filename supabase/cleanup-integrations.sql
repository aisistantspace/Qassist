-- Optional: Disable WhatsApp integration
-- You can run this if you want to keep the tables but disable functionality
UPDATE whatsapp_config SET is_active = false WHERE is_active = true;

-- Optional: Clean up integration-specific columns from leads
-- Keep the tables but add a note that these are optional
COMMENT ON COLUMN leads.synced_to_hubspot IS 'Optional: Set to true if using HubSpot integration';
COMMENT ON COLUMN leads.synced_to_mailchimp IS 'Optional: Set to true if using Mailchimp integration';
COMMENT ON COLUMN leads.whatsapp_phone IS 'Optional: Only used if WhatsApp integration is enabled';

-- Make conversations channel more generic
COMMENT ON COLUMN conversations.channel IS 'Communication channel: web (default), whatsapp (optional), or custom';

-- Note: We keep all tables intact for backward compatibility
-- Integrations can be re-enabled by configuring API keys


