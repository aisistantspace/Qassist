-- Enable Row Level Security (RLS) on form_definitions table
-- This addresses Supabase security recommendations
-- All access is server-side via service_role, so we lock down public access

-- Enable RLS on the table
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for server-side operations)
-- Note: service_role bypasses RLS anyway, but this makes it explicit
CREATE POLICY "form_definitions_service_role_all" 
ON public.form_definitions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Explicitly deny anon and authenticated access
-- All access should go through server-side API routes using service_role
-- This protects form configuration from public access
CREATE POLICY "form_definitions_no_public_select" 
ON public.form_definitions 
FOR SELECT 
TO anon, authenticated 
USING (false);

CREATE POLICY "form_definitions_no_public_insert" 
ON public.form_definitions 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (false);

CREATE POLICY "form_definitions_no_public_update" 
ON public.form_definitions 
FOR UPDATE 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

CREATE POLICY "form_definitions_no_public_delete" 
ON public.form_definitions 
FOR DELETE 
TO anon, authenticated 
USING (false);



