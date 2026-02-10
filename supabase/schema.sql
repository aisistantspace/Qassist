-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Leads table: stores contact information from pre-chat form
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Conversations table: stores chat history and metadata
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

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Knowledge base table: stores content with vector embeddings for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('FAQ', 'Service', 'Blog', 'Policy')),
  language TEXT NOT NULL DEFAULT 'EN' CHECK (language IN ('EN', 'NL', 'ES', 'PA')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for knowledge base
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_language ON knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Event logs table: tracks user interactions for analytics
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('wa_click', 'assistant_open', 'chat_started', 'book_click', 'form_submit')),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for event logs
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_lead_id ON event_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vector similarity search function for RAG
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

-- Insert sample knowledge base entries (placeholders for admin to customize)
INSERT INTO knowledge_base (title, content, category, language, tags) VALUES
  -- English FAQ entries
  ('What is a pensionado permit?', 'A pensionado permit is a residence permit for retirees who receive a pension from abroad. Applicants must be 50+ years old and receive a minimum monthly pension of ANG 3,000 (approx USD 1,670). This permit allows you to live in Curaçao long-term. For personalized guidance on your specific situation, please book a consultation.', 'FAQ', 'EN', ARRAY['pensionado', 'permit', 'retirement']),
  
  ('What is an investor permit?', 'An investor permit allows foreign nationals to live in Curaçao by making a significant investment in the local economy. Options include buying real estate (minimum ANG 300,000), starting a business, or investing in local enterprises. Processing typically takes 3-6 months. Book a consultation to discuss your investment options.', 'FAQ', 'EN', ARRAY['investor', 'permit', 'business']),
  
  ('What documents do I need for a visa application?', 'Common documents include: valid passport, birth certificate, police clearance certificate, proof of income/pension, health insurance, and passport photos. Specific requirements vary by permit type. We provide a detailed checklist during your paid consultation based on your exact situation.', 'FAQ', 'EN', ARRAY['documents', 'visa', 'requirements']),
  
  ('How long does processing take?', 'Processing times vary: tourist visas (2-4 weeks), work permits (6-8 weeks), residence permits (3-6 months). These are estimates and can vary based on completeness of documents and government workload. We track your application and keep you updated throughout the process.', 'FAQ', 'EN', ARRAY['processing', 'timeline', 'duration']),
  
  ('What are your consultation fees?', 'Initial consultations start at ANG 150 (approx USD 85) for 30 minutes. Full service packages vary based on permit type and complexity. During your consultation, we provide a detailed quote for your specific case. Book now to get started.', 'FAQ', 'EN', ARRAY['fees', 'pricing', 'consultation']),
  
  -- Dutch FAQ entries
  ('Wat is een pensionado vergunning?', 'Een pensionado vergunning is een verblijfsvergunning voor gepensioneerden die een pensioen uit het buitenland ontvangen. Aanvragers moeten 50+ jaar oud zijn en een minimaal maandelijks pensioen van ANG 3.000 (ca. USD 1.670) ontvangen. Deze vergunning stelt u in staat om langdurig in Curaçao te wonen. Voor persoonlijk advies over uw specifieke situatie, boek een consultatie.', 'FAQ', 'NL', ARRAY['pensionado', 'vergunning', 'pensioen']),
  
  ('Wat is een investeerders vergunning?', 'Een investeerdersvergunning stelt buitenlandse staatsburgers in staat om in Curaçao te wonen door een aanzienlijke investering in de lokale economie te doen. Opties zijn onder andere het kopen van onroerend goed (minimum ANG 300.000), het starten van een bedrijf of investeren in lokale ondernemingen. Verwerking duurt meestal 3-6 maanden. Boek een consultatie om uw investeringsopties te bespreken.', 'FAQ', 'NL', ARRAY['investeerder', 'vergunning', 'bedrijf']),
  
  -- Spanish FAQ entries
  ('¿Qué es un permiso de pensionado?', 'Un permiso de pensionado es un permiso de residencia para jubilados que reciben una pensión del extranjero. Los solicitantes deben tener más de 50 años y recibir una pensión mensual mínima de ANG 3,000 (aprox. USD 1,670). Este permiso le permite vivir en Curaçao a largo plazo. Para orientación personalizada sobre su situación específica, reserve una consulta.', 'FAQ', 'ES', ARRAY['pensionado', 'permiso', 'jubilación']),
  
  ('¿Qué es un permiso de inversionista?', 'Un permiso de inversionista permite a extranjeros vivir en Curaçao mediante una inversión significativa en la economía local. Las opciones incluyen comprar bienes raíces (mínimo ANG 300,000), iniciar un negocio o invertir en empresas locales. El procesamiento suele tardar 3-6 meses. Reserve una consulta para discutir sus opciones de inversión.', 'FAQ', 'ES', ARRAY['inversionista', 'permiso', 'negocio']),
  
  -- Papiamento FAQ entries
  ('Kiko ta un permit di pensionado?', 'Un permit di pensionado ta un permit di residente pa hende pensiná ku ta risibí un pension for di otro pais. Aplikantenan mester ta 50+ aña i risibí un pension mensual mínimo di ANG 3.000 (aprox. USD 1.670). E permit aki ta pèrmitíbo biba na Curaçao largu tempu. Pa guia personalisá tokante bo situashon spesífiko, reservá un konsulta.', 'FAQ', 'PA', ARRAY['pensionado', 'permit', 'pension']),
  
  ('Kiko ta un permit di inversionista?', 'Un permit di inversionista ta pèrmití estrangernan biba na Curaçao via un inversion signifikante den e ekonomia lokal. Opshonnan ta: kumpra pròpi (mínimo ANG 300.000), kuminsá un negoshi, òf invertí den empresanan lokal. Prosesamentu normalmente ta tuma 3-6 luna. Reservá un konsulta pa diskutí bo opshonan di inversion.', 'FAQ', 'PA', ARRAY['inversionista', 'permit', 'negoshi'])

ON CONFLICT DO NOTHING;

-- Note: Embeddings will be generated and updated via the admin interface
-- when admin adds or edits content using the application



