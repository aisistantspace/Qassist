-- Widget Configuration Table
CREATE TABLE IF NOT EXISTS widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Appearance
  theme VARCHAR(10) DEFAULT 'light',
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  
  -- Position
  position VARCHAR(20) DEFAULT 'bottom-right',
  initial_state VARCHAR(20) DEFAULT 'minimized',
  
  -- Messages
  initial_messages TEXT[] DEFAULT ARRAY['Hi! 👋 How can I help you today?'],
  suggested_messages TEXT[] DEFAULT ARRAY[]::TEXT[],
  placeholder_text VARCHAR(200) DEFAULT 'Type your message...',
  
  -- Profile
  chat_icon_url TEXT,
  profile_picture_url TEXT,
  
  -- Disclaimers
  notice_text TEXT,
  disclaimer_text TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default config
INSERT INTO widget_config (theme, primary_color) 
VALUES ('light', '#3B82F6') 
ON CONFLICT DO NOTHING;

CREATE TRIGGER update_widget_config_updated_at
  BEFORE UPDATE ON widget_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


