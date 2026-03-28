-- ============================================
-- MIGRATION V4 - Contas a Pagar: NF, Parcelamento, Centro de Custo
-- ============================================

-- Adicionar colunas novas na tabela contas
ALTER TABLE contas ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);
ALTER TABLE contas ADD COLUMN IF NOT EXISTS numero_nf VARCHAR(50);
ALTER TABLE contas ADD COLUMN IF NOT EXISTS total_parcelas INTEGER;

-- Indice para buscar contas por unidade (centro de custo)
CREATE INDEX IF NOT EXISTS idx_contas_unidade_id ON contas(unidade_id);

-- Indice para buscar por numero de NF
CREATE INDEX IF NOT EXISTS idx_contas_numero_nf ON contas(numero_nf) WHERE numero_nf IS NOT NULL;
