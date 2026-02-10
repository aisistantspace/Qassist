-- =============================================================================
-- CONSOLIDATED MIGRATIONS - Chat Assistant Application
-- Run this file once in Supabase SQL Editor (Dashboard > SQL Editor) to set up
-- or update the database. Safe to run on fresh or existing databases (idempotent).
-- =============================================================================

-- Allow enough memory for index creation (e.g. vector ivfflat index). Session-only.
SET maintenance_work_mem = '128MB';

-- -----------------------------------------------------------------------------
-- 1. BASE SCHEMA (core tables, extensions, functions)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  source_page TEXT,
  utm_params JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  synced_to_mailchimp BOOLEAN DEFAULT false,
  synced_to_hubspot BOOLEAN DEFAULT false,
  service_interest TEXT,
  visa_type TEXT,
  num_applicants INTEGER,
  nationality TEXT,
  country_residence TEXT,
  applying_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  turn_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'escalated')),
  language TEXT NOT NULL DEFAULT 'EN' CHECK (language IN ('EN', 'NL', 'ES', 'PA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('FAQ', 'Service', 'Blog', 'Policy')),
  language TEXT NOT NULL DEFAULT 'EN' CHECK (language IN ('EN', 'NL', 'ES', 'PA')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_language ON knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'wa_click', 'assistant_open', 'chat_started', 'book_click', 'form_submit', 'human_contact_requested'
  )),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_lead_id ON event_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  SELECT
    knowledge_base.id,
    knowledge_base.title,
    knowledge_base.content,
    knowledge_base.category,
    knowledge_base.language,
    knowledge_base.tags,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE knowledge_base.language = filter_language
    AND 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

INSERT INTO knowledge_base (title, content, category, language, tags) VALUES
  ('What is a pensionado permit?', 'A pensionado permit is a residence permit for retirees who receive a pension from abroad. Applicants must be 50+ years old and receive a minimum monthly pension of ANG 3,000 (approx USD 1,670). This permit allows you to live in Curaçao long-term. For personalized guidance on your specific situation, please book a consultation.', 'FAQ', 'EN', ARRAY['pensionado', 'permit', 'retirement']),
  ('What is an investor permit?', 'An investor permit allows foreign nationals to live in Curaçao by making a significant investment in the local economy. Options include buying real estate (minimum ANG 300,000), starting a business, or investing in local enterprises. Processing typically takes 3-6 months. Book a consultation to discuss your investment options.', 'FAQ', 'EN', ARRAY['investor', 'permit', 'business']),
  ('What documents do I need for a visa application?', 'Common documents include: valid passport, birth certificate, police clearance certificate, proof of income/pension, health insurance, and passport photos. Specific requirements vary by permit type. We provide a detailed checklist during your paid consultation based on your exact situation.', 'FAQ', 'EN', ARRAY['documents', 'visa', 'requirements']),
  ('How long does processing take?', 'Processing times vary: tourist visas (2-4 weeks), work permits (6-8 weeks), residence permits (3-6 months). These are estimates and can vary based on completeness of documents and government workload. We track your application and keep you updated throughout the process.', 'FAQ', 'EN', ARRAY['processing', 'timeline', 'duration']),
  ('What are your consultation fees?', 'Initial consultations start at ANG 150 (approx USD 85) for 30 minutes. Full service packages vary based on permit type and complexity. During your consultation, we provide a detailed quote for your specific case. Book now to get started.', 'FAQ', 'EN', ARRAY['fees', 'pricing', 'consultation']),
  ('Wat is een pensionado vergunning?', 'Een pensionado vergunning is een verblijfsvergunning voor gepensioneerden die een pensioen uit het buitenland ontvangen. Aanvragers moeten 50+ jaar oud zijn en een minimaal maandelijks pensioen van ANG 3.000 (ca. USD 1.670) ontvangen. Deze vergunning stelt u in staat om langdurig in Curaçao te wonen. Voor persoonlijk advies over uw specifieke situatie, boek een consultatie.', 'FAQ', 'NL', ARRAY['pensionado', 'vergunning', 'pensioen']),
  ('Wat is een investeerders vergunning?', 'Een investeerdersvergunning stelt buitenlandse staatsburgers in staat om in Curaçao te wonen door een aanzienlijke investering in de lokale economie te doen. Opties zijn onder andere het kopen van onroerend goed (minimum ANG 300.000), het starten van een bedrijf of investeren in lokale ondernemingen. Verwerking duurt meestal 3-6 maanden. Boek een consultatie om uw investeringsopties te bespreken.', 'FAQ', 'NL', ARRAY['investeerder', 'vergunning', 'bedrijf']),
  ('¿Qué es un permiso de pensionado?', 'Un permiso de pensionado es un permiso de residencia para jubilados que reciben una pensión del extranjero. Los solicitantes deben tener más de 50 años y recibir una pensión mensual mínima de ANG 3,000 (aprox. USD 1,670). Este permiso le permite vivir en Curaçao a largo plazo. Para orientación personalizada sobre su situación específica, reserve una consulta.', 'FAQ', 'ES', ARRAY['pensionado', 'permiso', 'jubilación']),
  ('¿Qué es un permiso de inversionista?', 'Un permiso de inversionista permite a extranjeros vivir en Curaçao mediante una inversión significativa en la economía local. Las opciones incluyen comprar bienes raíces (mínimo ANG 300,000), iniciar un negocio o invertir en empresas locales. El procesamiento suele tardar 3-6 meses. Reserve una consulta para discutir sus opciones de inversión.', 'FAQ', 'ES', ARRAY['inversionista', 'permiso', 'negocio']),
  ('Kiko ta un permit di pensionado?', 'Un permit di pensionado ta un permit di residente pa hende pensiná ku ta risibí un pension for di otro pais. Aplikantenan mester ta 50+ aña i risibí un pension mensual mínimo di ANG 3.000 (aprox. USD 1.670). E permit aki ta pèrmitíbo biba na Curaçao largu tempu. Pa guia personalisá tokante bo situashon spesífiko, reservá un konsulta.', 'FAQ', 'PA', ARRAY['pensionado', 'permit', 'pension']),
  ('Kiko ta un permit di inversionista?', 'Un permit di inversionista ta pèrmití estrangernan biba na Curaçao via un inversion signifikante den e ekonomia lokal. Opshonnan ta: kumpra pròpi (mínimo ANG 300.000), kuminsá un negoshi, òf invertí den empresanan lokal. Prosesamentu normalmente ta tuma 3-6 luna. Reservá un konsulta pa diskutí bo opshonan di inversion.', 'FAQ', 'PA', ARRAY['inversionista', 'permit', 'negoshi'])
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. EVENT_LOGS: ensure human_contact_requested allowed (existing DBs that had old check)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_event_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE event_logs
ADD CONSTRAINT event_logs_event_type_check
CHECK (event_type IN (
  'wa_click', 'assistant_open', 'chat_started', 'book_click', 'form_submit', 'human_contact_requested'
));

-- -----------------------------------------------------------------------------
-- 3. FORMS SCHEMA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Form definitions: eligibility / AI response config (add then rename for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_definitions' AND column_name = 'ai_response_config') THEN
    ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB DEFAULT NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_definitions' AND column_name = 'eligibility_criteria') THEN
    ALTER TABLE form_definitions RENAME COLUMN eligibility_criteria TO ai_response_config;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_definitions' AND column_name = 'ai_response_config') THEN
    ALTER TABLE form_definitions ADD COLUMN ai_response_config JSONB DEFAULT NULL;
  END IF;
END $$;
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS enable_ai_response BOOLEAN DEFAULT false;
COMMENT ON COLUMN form_definitions.ai_response_config IS 'JSONB object containing AI response configuration. Structure: { thresholds: { minAge?: number, maxAge?: number, minIncome?: number, restrictedCountries?: string[] }, rules: [{ field: string, operator: string, value: any, message: string }], instructions?: string }';
COMMENT ON COLUMN form_definitions.enable_ai_response IS 'Enable AI to automatically generate a response when this form is submitted.';

-- Form mode (conversational vs inline)
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS form_mode TEXT CHECK (form_mode IS NULL OR form_mode IN ('conversational', 'inline'));

-- Form email automation: send completed submissions to external parties
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS email_automation_enabled BOOLEAN DEFAULT false;
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS email_automation_recipients TEXT;
COMMENT ON COLUMN form_definitions.email_automation_enabled IS 'When true, send an email to recipients when this form is completed (e.g. for external-party forms).';
COMMENT ON COLUMN form_definitions.email_automation_recipients IS 'Comma-separated email addresses to receive the submission when completed.';

-- Form behavior: inline (auto-trigger in chat), link (show external URL), or disabled
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS use_mode TEXT DEFAULT 'inline' CHECK (use_mode IN ('inline', 'link', 'disabled'));
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS external_url TEXT;
COMMENT ON COLUMN form_definitions.use_mode IS 'inline=auto-trigger form in chat, link=show external_url, disabled=form not used by chatbot';
COMMENT ON COLUMN form_definitions.external_url IS 'External URL to show when use_mode is link';
-- Set existing active forms to inline, inactive to disabled
UPDATE form_definitions SET use_mode = 'inline' WHERE use_mode IS NULL AND is_active = true;
UPDATE form_definitions SET use_mode = 'disabled' WHERE use_mode IS NULL AND is_active = false;

-- -----------------------------------------------------------------------------
-- 4. WIDGET CONFIG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS widget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme VARCHAR(10) DEFAULT 'light',
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  position VARCHAR(20) DEFAULT 'bottom-right',
  initial_state VARCHAR(20) DEFAULT 'minimized',
  initial_messages TEXT[] DEFAULT ARRAY['Hi! 👋 How can I help you today?'],
  suggested_messages TEXT[] DEFAULT ARRAY[]::TEXT[],
  placeholder_text VARCHAR(200) DEFAULT 'Type your message...',
  chat_icon_url TEXT,
  profile_picture_url TEXT,
  notice_text TEXT,
  disclaimer_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Singleton constraint: ensure only one widget_config row exists
ALTER TABLE widget_config ADD COLUMN IF NOT EXISTS singleton_key INT DEFAULT 1;
UPDATE widget_config SET singleton_key = 1 WHERE singleton_key IS NULL;
ALTER TABLE widget_config DROP CONSTRAINT IF EXISTS widget_config_singleton;
ALTER TABLE widget_config ADD CONSTRAINT widget_config_singleton UNIQUE (singleton_key);

-- Only insert if no row exists (singleton_key=1 will conflict if row exists)
INSERT INTO widget_config (singleton_key, theme, primary_color) VALUES (1, 'light', '#3B82F6') 
ON CONFLICT (singleton_key) DO NOTHING;

DROP TRIGGER IF EXISTS update_widget_config_updated_at ON widget_config;
CREATE TRIGGER update_widget_config_updated_at BEFORE UPDATE ON widget_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE widget_config ADD COLUMN IF NOT EXISTS bubble_text TEXT DEFAULT NULL;
ALTER TABLE widget_config ADD COLUMN IF NOT EXISTS bubble_position TEXT DEFAULT 'left' CHECK (bubble_position IN ('left', 'top', 'bottom', 'right'));
COMMENT ON COLUMN widget_config.bubble_text IS 'Optional text to show in a dismissible bubble next to the chat button.';
COMMENT ON COLUMN widget_config.bubble_position IS 'Position of the text bubble relative to the chat button.';

-- -----------------------------------------------------------------------------
-- 5. AGENT SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions TEXT NOT NULL DEFAULT 'You are a dedicated customer support agent.',
  openai_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.70,
  max_tokens INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS default_form_mode TEXT DEFAULT 'conversational' CHECK (default_form_mode IN ('conversational', 'inline'));

-- Singleton constraint: ensure only one agent_settings row exists
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS singleton_key INT DEFAULT 1;
UPDATE agent_settings SET singleton_key = 1 WHERE singleton_key IS NULL;
ALTER TABLE agent_settings DROP CONSTRAINT IF EXISTS agent_settings_singleton;
ALTER TABLE agent_settings ADD CONSTRAINT agent_settings_singleton UNIQUE (singleton_key);

-- Only insert if no row exists (singleton_key=1 will conflict if row exists)
INSERT INTO agent_settings (singleton_key, instructions, openai_model, temperature, max_tokens)
VALUES (
  1,
  'You are a dedicated customer support agent for Living In Paradise Immigration Services in Curaçao.',
  'gpt-4o-mini', 0.7, 500
) ON CONFLICT (singleton_key) DO NOTHING;
UPDATE agent_settings SET default_form_mode = 'conversational' WHERE default_form_mode IS NULL;

DROP TRIGGER IF EXISTS update_agent_settings_updated_at ON agent_settings;
CREATE TRIGGER update_agent_settings_updated_at BEFORE UPDATE ON agent_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
COMMENT ON TABLE agent_settings IS 'Configurable AI agent parameters (model, temperature, instructions)';

-- -----------------------------------------------------------------------------
-- 6. DASHBOARD & PHASE2 SCHEMAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 0, 1)),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversation_ratings_conversation_id ON conversation_ratings(conversation_id);

CREATE TABLE IF NOT EXISTS unanswered_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  language TEXT,
  frequency INTEGER DEFAULT 1,
  first_asked TIMESTAMPTZ DEFAULT NOW(),
  last_asked TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_unanswered_queries_resolved ON unanswered_queries(resolved);
CREATE INDEX IF NOT EXISTS idx_unanswered_queries_frequency ON unanswered_queries(frequency DESC);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
DO $$
BEGIN
  ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
  ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'closed', 'lost'));
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMPTZ;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS confidence_score DECIMAL;

ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS last_used TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION increment_kb_usage(kb_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE knowledge_base SET usage_count = usage_count + 1, last_used = NOW() WHERE id = kb_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '24 hours') as leads_today,
  (SELECT COUNT(*) FROM conversations WHERE status = 'active') as active_conversations,
  (SELECT COUNT(*) FROM conversations WHERE status = 'escalated' AND created_at > NOW() - INTERVAL '7 days') as booking_requests_week,
  (SELECT COUNT(*) FROM leads WHERE synced_to_mailchimp = true) as mailchimp_synced,
  (SELECT COUNT(*) FROM leads WHERE synced_to_hubspot = true) as hubspot_synced,
  (SELECT AVG(turn_count) FROM conversations) as avg_conversation_length;

CREATE OR REPLACE VIEW top_questions AS
SELECT messages->0->>'content' as first_question, COUNT(*) as frequency, language
FROM conversations
WHERE messages IS NOT NULL AND jsonb_array_length(messages) > 0
GROUP BY first_question, language
ORDER BY frequency DESC LIMIT 20;

-- Documents (Phase 2)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  content_text TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_document ON knowledge_base(source_document_id);

CREATE OR REPLACE VIEW document_stats AS
SELECT COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_documents,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_documents,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_documents,
  SUM(file_size) as total_size_bytes, SUM(chunk_count) as total_chunks
FROM documents;

-- -----------------------------------------------------------------------------
-- 7. BRANDING & WHITE-LABEL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL DEFAULT 'My Company',
  company_description TEXT,
  company_website VARCHAR(500),
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  widget_title VARCHAR(100) DEFAULT 'Chat with us',
  widget_subtitle VARCHAR(255),
  welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  logo_url TEXT,
  favicon_url TEXT,
  default_language VARCHAR(5) DEFAULT 'EN',
  enable_lead_capture BOOLEAN DEFAULT true,
  lead_capture_fields JSONB DEFAULT '["name", "email"]',
  booking_url TEXT,
  booking_cta_text VARCHAR(255),
  enable_booking_cta BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Singleton constraint: ensure only one branding_config row exists
ALTER TABLE branding_config ADD COLUMN IF NOT EXISTS singleton_key INT DEFAULT 1;
UPDATE branding_config SET singleton_key = 1 WHERE singleton_key IS NULL;
ALTER TABLE branding_config DROP CONSTRAINT IF EXISTS branding_config_singleton;
ALTER TABLE branding_config ADD CONSTRAINT branding_config_singleton UNIQUE (singleton_key);

-- Only insert if no row exists (singleton_key=1 will conflict if row exists)
INSERT INTO branding_config (singleton_key, company_name, company_description, widget_title, welcome_message, primary_color)
VALUES (1, 'My Company', 'We provide excellent customer service and support.', 'Chat Assistant', 'Hello! How can I help you today?', '#3B82F6')
ON CONFLICT (singleton_key) DO NOTHING;

DROP TRIGGER IF EXISTS update_branding_config_updated_at ON branding_config;
CREATE TRIGGER update_branding_config_updated_at BEFORE UPDATE ON branding_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE branding_config
  ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Liv',
  ADD COLUMN IF NOT EXISTS agent_avatar_url TEXT DEFAULT 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50',
  ADD COLUMN IF NOT EXISTS developer_branding_enabled BOOLEAN DEFAULT true;
UPDATE branding_config SET agent_name = COALESCE(agent_name, 'Liv'), agent_avatar_url = COALESCE(agent_avatar_url, 'https://backend.chatbase.co/storage/v1/object/public/chatbots-profile-pictures/82428ef0-b36b-48e1-bf3f-9a94f7fac629/P4HvZfc4t5WKWkbDOEwcm.ico?width=40&height=40&quality=50'), developer_branding_enabled = COALESCE(developer_branding_enabled, true);

-- -----------------------------------------------------------------------------
-- 8. WHATSAPP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(255) NOT NULL,
  business_account_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  webhook_verify_token VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  display_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'channel') THEN
    ALTER TABLE conversations ADD COLUMN channel VARCHAR(20) DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp', 'telegram'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'whatsapp_message_id') THEN
    ALTER TABLE conversations ADD COLUMN whatsapp_message_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'whatsapp_phone') THEN
    ALTER TABLE leads ADD COLUMN whatsapp_phone VARCHAR(20);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_phone ON leads(whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9. INTEGRATION CONFIG (Mailchimp, HubSpot, SMTP, Lead scoring)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mailchimp_api_key TEXT,
  mailchimp_server_prefix TEXT,
  mailchimp_audience_id TEXT,
  mailchimp_enabled BOOLEAN DEFAULT false,
  hubspot_access_token TEXT,
  hubspot_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_secure BOOLEAN DEFAULT false,
  smtp_enabled BOOLEAN DEFAULT false,
  notification_recipient_email TEXT,
  lead_scoring_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE integration_config ADD COLUMN IF NOT EXISTS lead_scoring_config JSONB DEFAULT '{}';
COMMENT ON COLUMN integration_config.lead_scoring_config IS 'JSONB: hot_threshold, warm_threshold, include_human_contact_requests, weights, ai_filtering_instructions';

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "form_definitions_service_role_all" ON public.form_definitions;
DROP POLICY IF EXISTS "form_definitions_no_public_select" ON public.form_definitions;
DROP POLICY IF EXISTS "form_definitions_no_public_insert" ON public.form_definitions;
DROP POLICY IF EXISTS "form_definitions_no_public_update" ON public.form_definitions;
DROP POLICY IF EXISTS "form_definitions_no_public_delete" ON public.form_definitions;
CREATE POLICY "form_definitions_service_role_all" ON public.form_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "form_definitions_no_public_select" ON public.form_definitions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "form_definitions_no_public_insert" ON public.form_definitions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "form_definitions_no_public_update" ON public.form_definitions FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "form_definitions_no_public_delete" ON public.form_definitions FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "form_submissions_service_role_all" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_no_public_select" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_no_public_insert" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_no_public_update" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions_no_public_delete" ON public.form_submissions;
CREATE POLICY "form_submissions_service_role_all" ON public.form_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "form_submissions_no_public_select" ON public.form_submissions FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "form_submissions_no_public_insert" ON public.form_submissions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "form_submissions_no_public_update" ON public.form_submissions FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "form_submissions_no_public_delete" ON public.form_submissions FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE public.widget_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "widget_config_service_role_all" ON public.widget_config;
DROP POLICY IF EXISTS "widget_config_no_public_select" ON public.widget_config;
DROP POLICY IF EXISTS "widget_config_no_public_insert" ON public.widget_config;
DROP POLICY IF EXISTS "widget_config_no_public_update" ON public.widget_config;
DROP POLICY IF EXISTS "widget_config_no_public_delete" ON public.widget_config;
CREATE POLICY "widget_config_service_role_all" ON public.widget_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "widget_config_no_public_select" ON public.widget_config FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "widget_config_no_public_insert" ON public.widget_config FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "widget_config_no_public_update" ON public.widget_config FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "widget_config_no_public_delete" ON public.widget_config FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_config_service_role_all" ON public.whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_no_public_select" ON public.whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_no_public_insert" ON public.whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_no_public_update" ON public.whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_no_public_delete" ON public.whatsapp_config;
CREATE POLICY "whatsapp_config_service_role_all" ON public.whatsapp_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "whatsapp_config_no_public_select" ON public.whatsapp_config FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "whatsapp_config_no_public_insert" ON public.whatsapp_config FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "whatsapp_config_no_public_update" ON public.whatsapp_config FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "whatsapp_config_no_public_delete" ON public.whatsapp_config FOR DELETE TO anon, authenticated USING (false);

ALTER TABLE public.unanswered_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unanswered_queries_service_role_all" ON public.unanswered_queries;
DROP POLICY IF EXISTS "unanswered_queries_no_public_select" ON public.unanswered_queries;
DROP POLICY IF EXISTS "unanswered_queries_no_public_insert" ON public.unanswered_queries;
DROP POLICY IF EXISTS "unanswered_queries_no_public_update" ON public.unanswered_queries;
DROP POLICY IF EXISTS "unanswered_queries_no_public_delete" ON public.unanswered_queries;
CREATE POLICY "unanswered_queries_service_role_all" ON public.unanswered_queries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "unanswered_queries_no_public_select" ON public.unanswered_queries FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "unanswered_queries_no_public_insert" ON public.unanswered_queries FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "unanswered_queries_no_public_update" ON public.unanswered_queries FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "unanswered_queries_no_public_delete" ON public.unanswered_queries FOR DELETE TO anon, authenticated USING (false);

-- -----------------------------------------------------------------------------
-- 12. NOTIFICATIONS SYSTEM
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('form_submission', 'lead_capture', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add notification_emails column to form_definitions (for alert-only notifications)
ALTER TABLE form_definitions ADD COLUMN IF NOT EXISTS notification_emails TEXT;
COMMENT ON COLUMN form_definitions.notification_emails IS 'Comma-separated emails to notify when form is submitted (no form data included, just alert)';

-- -----------------------------------------------------------------------------
-- DONE
-- -----------------------------------------------------------------------------
