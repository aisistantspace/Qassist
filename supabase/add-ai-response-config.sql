-- Rename eligibility_criteria to ai_response_config and add enable_ai_response flag
-- This makes AI response configuration available for all forms, not just eligibility forms

-- Rename the column
ALTER TABLE form_definitions 
RENAME COLUMN eligibility_criteria TO ai_response_config;

-- Add enable_ai_response flag
ALTER TABLE form_definitions 
ADD COLUMN IF NOT EXISTS enable_ai_response BOOLEAN DEFAULT false;

-- Update comment to reflect generic usage
COMMENT ON COLUMN form_definitions.ai_response_config IS 'JSONB object containing AI response configuration. Structure: { thresholds: { minAge?: number, maxAge?: number, minIncome?: number, restrictedCountries?: string[] }, rules: [{ field: string, operator: string, value: any, message: string }], instructions?: string }';

COMMENT ON COLUMN form_definitions.enable_ai_response IS 'Enable AI to automatically generate a response when this form is submitted. When enabled, ai_response_config will be used to guide the AI response.';
