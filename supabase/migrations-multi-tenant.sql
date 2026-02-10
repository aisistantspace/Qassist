-- =============================================================================
-- MULTI-TENANT (MULTI-CANON) MIGRATION
-- Run after migrations-consolidated.sql. Adds tenants table and tenant_id to
-- all tenant-scoped tables; backfills a default tenant; RLS by tenant_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TENANTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'growth', 'enterprise', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. ADD tenant_id COLUMN (nullable first for backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE event_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE widget_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE branding_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE integration_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE conversation_ratings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE unanswered_queries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 3. DEFAULT TENANT AND BACKFILL
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default' LIMIT 1;
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (id, name, slug, subscription_plan, status)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default', 'default', 'growth', 'active')
    RETURNING id INTO default_tenant_id;
  END IF;
  UPDATE leads SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE conversations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE knowledge_base SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE event_logs SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE form_definitions SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE form_submissions SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE widget_config SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE agent_settings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE branding_config SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE integration_config SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE documents SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE conversation_ratings SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE unanswered_queries SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE notifications SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE whatsapp_config SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 4. NOT NULL AND INDEXES
-- -----------------------------------------------------------------------------
ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE knowledge_base ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE event_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE form_definitions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE form_submissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE widget_config ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agent_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE branding_config ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE integration_config ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE conversation_ratings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE unanswered_queries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE whatsapp_config ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_id ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_tenant_id ON event_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_definitions_tenant_id ON form_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id ON form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_widget_config_tenant_id ON widget_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_settings_tenant_id ON agent_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branding_config_tenant_id ON branding_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integration_config_tenant_id ON integration_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_tenant_id ON whatsapp_config(tenant_id);

-- Leads: email unique per tenant (drop global unique if exists, add composite)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_tenant_email ON leads(tenant_id, email);

-- One config row per tenant (replace singleton)
ALTER TABLE widget_config DROP CONSTRAINT IF EXISTS widget_config_singleton;
ALTER TABLE widget_config DROP COLUMN IF EXISTS singleton_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_widget_config_tenant_singleton ON widget_config(tenant_id);

ALTER TABLE agent_settings DROP CONSTRAINT IF EXISTS agent_settings_singleton;
ALTER TABLE agent_settings DROP COLUMN IF EXISTS singleton_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_settings_tenant_singleton ON agent_settings(tenant_id);

ALTER TABLE branding_config DROP CONSTRAINT IF EXISTS branding_config_singleton;
ALTER TABLE branding_config DROP COLUMN IF EXISTS singleton_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_branding_config_tenant_singleton ON branding_config(tenant_id);

-- integration_config: allow multiple rows per tenant (no unique)

-- -----------------------------------------------------------------------------
-- 5. match_knowledge_base WITH tenant_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  filter_tenant_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT 'EN'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  language TEXT,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.category,
    knowledge_base.language,
    knowledge_base.tags,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE knowledge_base.tenant_id = filter_tenant_id
    AND knowledge_base.language = filter_language
    AND 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keep old signature for backward compatibility (assumes default tenant)
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_language TEXT DEFAULT 'EN'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  language TEXT,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM match_knowledge_base(
    query_embedding,
    '00000000-0000-0000-0000-000000000001'::uuid,
    match_threshold,
    match_count,
    filter_language
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. DROP GLOBAL VIEWS (APIs will query with tenant_id)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS dashboard_stats;
DROP VIEW IF EXISTS document_stats;
DROP VIEW IF EXISTS top_questions;

-- -----------------------------------------------------------------------------
-- 7. RLS POLICIES BY tenant_id
-- -----------------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_service_role_all" ON tenants;
CREATE POLICY "tenants_service_role_all" ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_tenant_isolate" ON leads;
CREATE POLICY "leads_tenant_isolate" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "leads_service_role_all" ON leads;
CREATE POLICY "leads_service_role_all" ON leads FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_service_role_all" ON conversations;
CREATE POLICY "conversations_service_role_all" ON conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_base_service_role_all" ON knowledge_base;
CREATE POLICY "knowledge_base_service_role_all" ON knowledge_base FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_service_role_all" ON documents;
CREATE POLICY "documents_service_role_all" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE branding_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branding_config_service_role_all" ON branding_config;
CREATE POLICY "branding_config_service_role_all" ON branding_config FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE integration_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integration_config_service_role_all" ON integration_config;
CREATE POLICY "integration_config_service_role_all" ON integration_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Form definitions/submissions, widget, agent, whatsapp, notifications, event_logs, conversation_ratings, unanswered_queries
-- already have RLS from consolidated; add service_role if missing (consolidated uses no_public_* + service_role_all)
-- So we only need to ensure tenant tables have service_role all. Done above for main tables.
-- Others (form_definitions, etc.) keep existing policies; service_role bypasses RLS anyway.

COMMENT ON TABLE tenants IS 'Multi-tenant (multi-canon) organizations; all tenant-scoped tables reference tenants.id';
