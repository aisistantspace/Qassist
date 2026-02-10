-- Add SMTP configuration columns to integration_config table
-- This allows users to configure SMTP settings through the dashboard UI
-- Settings are stored in the database with fallback to environment variables

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_host TEXT;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_user TEXT;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_password TEXT;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_from_email TEXT;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN DEFAULT false;

ALTER TABLE integration_config 
ADD COLUMN IF NOT EXISTS notification_recipient_email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN integration_config.smtp_host IS 'SMTP server hostname (e.g., smtp.gmail.com, smtp.yourdomain.com)';
COMMENT ON COLUMN integration_config.smtp_port IS 'SMTP port number (587 for TLS, 465 for SSL, 25 for unencrypted)';
COMMENT ON COLUMN integration_config.smtp_user IS 'SMTP username/email for authentication';
COMMENT ON COLUMN integration_config.smtp_password IS 'SMTP password or app password (stored securely)';
COMMENT ON COLUMN integration_config.smtp_from_email IS 'Sender email address (optional, defaults to smtp_user)';
COMMENT ON COLUMN integration_config.smtp_secure IS 'Use SSL connection (true for port 465, false for port 587 with TLS)';
COMMENT ON COLUMN integration_config.smtp_enabled IS 'Enable SMTP email sending for internal notifications';
COMMENT ON COLUMN integration_config.notification_recipient_email IS 'Email address to receive internal notifications (new leads, human contact requests, etc.)';
