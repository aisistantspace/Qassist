-- Add bubble_position column to widget_config table
-- This allows choosing where the text bubble appears relative to the chat button
-- Options: 'left' (default), 'top', 'bottom', or 'right'

ALTER TABLE widget_config 
ADD COLUMN IF NOT EXISTS bubble_position TEXT DEFAULT 'left' 
CHECK (bubble_position IN ('left', 'top', 'bottom', 'right'));

COMMENT ON COLUMN widget_config.bubble_position IS 'Position of the text bubble relative to the chat button. Options: left (to the left), top (above), bottom (below), or right (to the right).';
