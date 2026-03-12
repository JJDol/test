-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create document_chunks table for storing embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'public',
  source_type TEXT NOT NULL CHECK (source_type IN ('br18', 'upload', 'template')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding extensions.vector(1536),
  chunk_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_document_chunks_company_id ON public.document_chunks (company_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_source_type ON public.document_chunks (source_type);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks (document_id);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

-- RPC function for similarity search with company filtering
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding extensions.vector(1536),
  match_company_id TEXT,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  document_id TEXT,
  company_id TEXT,
  source_type TEXT,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.company_id,
    dc.source_type,
    dc.content,
    dc.metadata,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.company_id IN (match_company_id, 'public')
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
