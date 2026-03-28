-- ============================================
-- MIGRATION V5 - Rendimento de receitas
-- ============================================

-- Adicionar rendimento da receita ao produto
-- Ex: "esta receita produz 1 Balde" ou "esta receita produz 1 Kg"
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS rendimento DECIMAL(10,3);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS rendimento_unidade TEXT;
