-- KB action metadata for informational → next-step guidance
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN knowledge_base.metadata IS 'Optional action guidance: { action_type: none|link|form, action_url, action_form_id }';
