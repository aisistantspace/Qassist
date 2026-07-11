-- SaaS tenant accounts (dashboard + chat access per organization)
-- Run after migrations-multi-tenant.sql

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_username ON tenant_users(username);

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access tenant_users" ON tenant_users;
CREATE POLICY "Service role full access tenant_users" ON tenant_users
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE tenant_users IS 'Per-tenant login accounts for SaaS dashboard + chat access';
