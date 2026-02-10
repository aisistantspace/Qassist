-- Enable Row Level Security (RLS) on unanswered_queries table
-- This addresses Supabase security recommendations
-- All access is server-side via service_role, so we lock down public access

-- Enable RLS on the table
ALTER TABLE public.unanswered_queries ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (for server-side operations)
-- Note: service_role bypasses RLS anyway, but this makes it explicit
CREATE POLICY "unanswered_queries_service_role_all" 
ON public.unanswered_queries 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Explicitly deny anon and authenticated access
-- All access should go through server-side API routes using service_role
-- This protects analytics data from public access
CREATE POLICY "unanswered_queries_no_public_select" 
ON public.unanswered_queries 
FOR SELECT 
TO anon, authenticated 
USING (false);

CREATE POLICY "unanswered_queries_no_public_insert" 
ON public.unanswered_queries 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (false);

CREATE POLICY "unanswered_queries_no_public_update" 
ON public.unanswered_queries 
FOR UPDATE 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

CREATE POLICY "unanswered_queries_no_public_delete" 
ON public.unanswered_queries 
FOR DELETE 
TO anon, authenticated 
USING (false);



