-- Add bubble_text column to widget_config table
-- This allows showing a dismissible text bubble next to the chat button

ALTER TABLE widget_config 
ADD COLUMN IF NOT EXISTS bubble_text TEXT DEFAULT NULL;

COMMENT ON COLUMN widget_config.bubble_text IS 'Optional text to show in a dismissible bubble next to the chat button. Leave NULL or empty to hide the bubble.';
