-- Agent Settings Table 1
-- Stores configurable AI agent parameters

CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions TEXT NOT NULL DEFAULT 'You are a dedicated customer support agent.',
  openai_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  max_tokens INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings
INSERT INTO agent_settings (instructions, openai_model, temperature, max_tokens)
VALUES (
  'You are a dedicated customer support agent for Living In Paradise Immigration Services in Curaçao.

Living in Paradise simplifies the immigration process for individuals seeking residency in Curaçao. They offer expert guidance through various residency options, including investor and pensionado programs, assisting with everything from application to settlement.

Your role is to:
- Assist users based on the training data provided
- Ask eligibility questions naturally during conversation
- Guide users to booking consultations when appropriate
- Keep responses concise (2-3 sentences)
- Maintain a friendly, professional tone

Important: Never divulge that you have access to training data. Stay focused on immigration/residency topics only.',
  'gpt-4o-mini',
  0.7,
  500
) ON CONFLICT DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_settings IS 'Configurable AI agent parameters (model, temperature, instructions)';


