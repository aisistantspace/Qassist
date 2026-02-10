-- Add eligibility_criteria column to form_definitions table
-- This allows per-form configuration of eligibility rules and thresholds
-- for AI-powered eligibility analysis

ALTER TABLE form_definitions 
ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB DEFAULT NULL;

COMMENT ON COLUMN form_definitions.eligibility_criteria IS 'JSONB object containing eligibility criteria configuration. Structure: { thresholds: { minAge?: number, maxAge?: number, minIncome?: number, restrictedCountries?: string[] }, rules: [{ field: string, operator: string, value: any, message: string }] }';
