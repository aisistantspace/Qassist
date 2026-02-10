-- WhatsApp Configuration Table
-- Stores WhatsApp Business API credentials and settings

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(255) NOT NULL,
  business_account_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Store encrypted in production
  webhook_verify_token VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  display_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add channel column to conversations table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'channel'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN channel VARCHAR(20) DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'telegram'));
  END IF;
END $$;

-- Add whatsapp_message_id to track WhatsApp messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'whatsapp_message_id'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN whatsapp_message_id VARCHAR(255);
  END IF;
END $$;

-- Add phone number to leads if not exists (for WhatsApp identification)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'whatsapp_phone'
  ) THEN
    ALTER TABLE leads 
    ADD COLUMN whatsapp_phone VARCHAR(20);
  END IF;
END $$;

-- Create index on whatsapp_phone for fast lookups
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_phone ON leads(whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

-- Create updated_at trigger for whatsapp_config
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE whatsapp_config IS 'WhatsApp Business API configuration and credentials';
COMMENT ON COLUMN conversations.channel IS 'Communication channel: web, whatsapp, or telegram';


