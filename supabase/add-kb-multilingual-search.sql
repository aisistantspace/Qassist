-- Language-agnostic vector search: never miss chunks due to wrong language tag
CREATE OR REPLACE FUNCTION match_knowledge_base_all_languages(
  query_embedding vector(1536),
  filter_tenant_id UUID,
  match_threshold FLOAT DEFAULT 0.52,
  match_count INT DEFAULT 15
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
    AND knowledge_base.embedding IS NOT NULL
    AND 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_base_all_languages IS 'Vector KB search across all languages for a tenant (RAG primary path)';
