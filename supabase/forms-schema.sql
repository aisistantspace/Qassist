-- Form definitions table
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL, -- Used as trigger for AI
  fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {key, label, question, type}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(form_id, lead_id)
);

-- Add triggers for updated_at (assuming update_updated_at_column function exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_form_definitions_updated_at') THEN
        CREATE TRIGGER update_form_definitions_updated_at BEFORE UPDATE ON form_definitions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_form_submissions_updated_at') THEN
        CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

