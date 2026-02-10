-- Add form_mode column to form_definitions table
-- This allows forms to be configured as 'conversational' (step-by-step) or 'inline' (fillable card)
-- NULL means use global default from agent_settings

ALTER TABLE form_definitions 
ADD COLUMN IF NOT EXISTS form_mode TEXT 
CHECK (form_mode IS NULL OR form_mode IN ('conversational', 'inline'));

-- Add default_form_mode to agent_settings table
-- This is the global default that forms use when their form_mode is NULL

ALTER TABLE agent_settings 
ADD COLUMN IF NOT EXISTS default_form_mode TEXT 
DEFAULT 'conversational' 
CHECK (default_form_mode IN ('conversational', 'inline'));

-- Update existing agent_settings rows to have default_form_mode
UPDATE agent_settings 
SET default_form_mode = 'conversational' 
WHERE default_form_mode IS NULL;
