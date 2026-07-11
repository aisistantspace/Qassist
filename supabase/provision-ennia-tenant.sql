-- Provision ENNIA as the primary demo tenant (run once in Supabase SQL editor)
-- Uses default tenant UUID where ENNIA KB/branding already lives.

UPDATE tenants
SET
  name = 'ENNIA',
  slug = 'ennia',
  subscription_plan = 'growth',
  status = 'active',
  settings = COALESCE(settings, '{}'::jsonb) || '{"demo": true, "industry": "insurance"}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Ensure branding reflects ENNIA (safe if already set via demo setup)
UPDATE branding_config
SET
  company_name = COALESCE(NULLIF(company_name, ''), 'ENNIA'),
  company_website = COALESCE(NULLIF(company_website, ''), 'https://www.ennia.com'),
  widget_title = COALESCE(NULLIF(widget_title, ''), 'ENNIA Chat'),
  agent_name = COALESCE(NULLIF(agent_name, ''), 'ENNIA Assistant'),
  welcome_message = COALESCE(NULLIF(welcome_message, ''), 'Welkom bij ENNIA! Waarmee kunnen we je helpen?'),
  primary_color = COALESCE(NULLIF(primary_color, ''), '#307E57'),
  logo_url = COALESCE(NULLIF(logo_url, ''), '/ennia/logo-green.webp'),
  favicon_url = COALESCE(NULLIF(favicon_url, ''), '/ennia/favicon-32x32.png'),
  updated_at = NOW()
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Password hash is set via: npm run saas:provision-user -- --slug ennia --username ennia-demo --password YOUR_PASSWORD
