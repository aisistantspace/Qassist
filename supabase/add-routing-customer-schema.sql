-- Routing, customer identity, and escalation schema
-- Run in Supabase SQL Editor after base migrations

-- -----------------------------------------------------------------------------
-- 1. CONVERSATIONS — routing & pickup fields
-- -----------------------------------------------------------------------------
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS department TEXT
  CHECK (department IS NULL OR department IN ('claims', 'support', 'sales', 'billing', 'general'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS intent TEXT
  CHECK (intent IS NULL OR intent IN ('inquiry', 'service'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_verified BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS routing_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_department ON conversations(department);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_status_dept ON conversations(status, department);

-- -----------------------------------------------------------------------------
-- 2. LEADS — customer identity fields
-- -----------------------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS policy_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS account_number TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_policy_number ON leads(policy_number) WHERE policy_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_account_number ON leads(account_number) WHERE account_number IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. NOTIFICATIONS — escalation types + conversation link
-- -----------------------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_department ON notifications(department);

-- Widen notification type CHECK to include escalation types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('form_submission', 'lead_capture', 'system', 'escalation', 'department_routing'));

-- -----------------------------------------------------------------------------
-- 4. EVENT_LOGS — department_routed event
-- -----------------------------------------------------------------------------
ALTER TABLE event_logs DROP CONSTRAINT IF EXISTS event_logs_event_type_check;
ALTER TABLE event_logs ADD CONSTRAINT event_logs_event_type_check
  CHECK (event_type IN (
    'wa_click', 'assistant_open', 'chat_started', 'book_click', 'form_submit',
    'human_contact_requested', 'department_routed'
  ));

-- -----------------------------------------------------------------------------
-- 5. INTEGRATION_CONFIG — routing & customer lookup
-- -----------------------------------------------------------------------------
ALTER TABLE integration_config ADD COLUMN IF NOT EXISTS department_routing JSONB DEFAULT '{
  "claims": {"email": "", "auto_route": true},
  "support": {"email": "", "auto_route": false},
  "sales": {"email": "", "auto_route": false},
  "billing": {"email": "", "auto_route": true},
  "general": {"email": "", "auto_route": false}
}'::jsonb;

ALTER TABLE integration_config ADD COLUMN IF NOT EXISTS customer_lookup_config JSONB DEFAULT '{
  "enabled": false,
  "api_url": "",
  "method": "POST",
  "auth_header": "",
  "auth_value": "",
  "request_field": "email",
  "response_name_field": "name",
  "response_policy_field": "policy_number",
  "timeout_ms": 5000
}'::jsonb;

ALTER TABLE integration_config ADD COLUMN IF NOT EXISTS routing_rules JSONB DEFAULT '{
  "auto_route_claims": true,
  "auto_route_sales_registration": false,
  "auto_route_billing_urgent": true,
  "knowledge_gap_route": false
}'::jsonb;

COMMENT ON COLUMN integration_config.department_routing IS 'Per-department email and auto_route toggles';
COMMENT ON COLUMN integration_config.customer_lookup_config IS 'External customer API lookup settings (on-demand)';
COMMENT ON COLUMN integration_config.routing_rules IS 'When to auto-escalate conversations to departments';
