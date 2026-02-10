-- Branding Configuration Table
-- Stores white-label branding and business settings

CREATE TABLE IF NOT EXISTS branding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Company Information
  company_name VARCHAR(255) NOT NULL DEFAULT 'My Company',
  company_description TEXT,
  company_website VARCHAR(500),
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  
  -- Chat Widget Branding
  widget_title VARCHAR(100) DEFAULT 'Chat with us',
  widget_subtitle VARCHAR(255),
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  
  -- Visual Branding
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Chat Behavior
  default_language VARCHAR(5) DEFAULT 'EN',
  enable_lead_capture BOOLEAN DEFAULT true,
  lead_capture_fields JSONB DEFAULT '["name", "email"]',
  
  -- External Integrations (Optional)
  booking_url TEXT,
  booking_cta_text VARCHAR(255),
  enable_booking_cta BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default branding
INSERT INTO branding_config (
  company_name,
  company_description,
  widget_title,
  welcome_message,
  primary_color
) VALUES (
  'My Company',
  'We provide excellent customer service and support.',
  'Chat Assistant',
  'Hello! How can I help you today?',
  '#3B82F6'
) ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_branding_config_updated_at
  BEFORE UPDATE ON branding_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE branding_config IS 'White-label branding and business configuration';


