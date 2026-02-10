-- Phase 2: File Upload & Document Management Database Schema

-- Documents table: stores uploaded files and their metadata
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

-- Update knowledge_base to link to source documents
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_document ON knowledge_base(source_document_id);

-- View for document statistics
CREATE OR REPLACE VIEW document_stats AS
SELECT
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_documents,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_documents,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_documents,
  SUM(file_size) as total_size_bytes,
  SUM(chunk_count) as total_chunks
FROM documents;


