-- ============================================
-- MIGRATION V6 - Descricao no Plano de Contas
-- ============================================

ALTER TABLE plano_contas ADD COLUMN IF NOT EXISTS descricao TEXT;
