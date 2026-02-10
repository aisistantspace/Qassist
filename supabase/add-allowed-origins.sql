-- Add allowed_origins column to widget_config for embed origin validation.
-- When populated, only requests from listed origins will receive the embed script.
-- When empty/null, all origins are allowed (backward compatible).

ALTER TABLE widget_config
  ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] DEFAULT ARRAY[]::TEXT[];
