-- Enable Row Level Security (RLS) on whatsapp_config table
-- This addresses Supabase security recommendations
-- All access is server-side via service_role, so we lock down public access
-- This table contains sensitive API keys and tokens that must be protected

-- Enable RLS on the table
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for server-side operations)
-- Note: service_role bypasses RLS anyway, but this makes it explicit
CREATE POLICY "whatsapp_config_service_role_all" 
ON public.whatsapp_config 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Explicitly deny anon and authenticated access
-- All access should go through server-side API routes using service_role
-- This protects sensitive WhatsApp API configuration from public access
CREATE POLICY "whatsapp_config_no_public_select" 
ON public.whatsapp_config 
FOR SELECT 
TO anon, authenticated 
USING (false);

CREATE POLICY "whatsapp_config_no_public_insert" 
ON public.whatsapp_config 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (false);

CREATE POLICY "whatsapp_config_no_public_update" 
ON public.whatsapp_config 
FOR UPDATE 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

CREATE POLICY "whatsapp_config_no_public_delete" 
ON public.whatsapp_config 
FOR DELETE 
TO anon, authenticated 
USING (false);



