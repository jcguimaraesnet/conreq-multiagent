-- ============================================================
-- Migration: Rename positive_impact -> business_need
-- Execute este script no Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Renomear coluna principal
ALTER TABLE conjectural_requirements
  RENAME COLUMN positive_impact TO business_need;

-- 2. Renomear coluna de embedding
ALTER TABLE conjectural_requirements
  RENAME COLUMN positive_impact_embedding TO business_need_embedding;

-- 3. Renomear função RPC de busca por embeddings
ALTER FUNCTION match_positive_impact_embeddings RENAME TO match_business_need_embeddings;
