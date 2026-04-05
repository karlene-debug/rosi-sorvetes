-- Migration V7: Tabelas de Vendas (Upload de Relatorios DataCaixa)
-- Rodar no Supabase SQL Editor

-- 1. Tabela de uploads (historico de importacoes)
CREATE TABLE IF NOT EXISTS vendas_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('faturamento_diario', 'produtos_vendidos')),
  arquivo_nome TEXT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  unidade_id UUID REFERENCES unidades(id),
  total_geral NUMERIC(12,2) DEFAULT 0,
  qtd_registros INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Faturamento diario (receita por dia e forma de pagamento)
CREATE TABLE IF NOT EXISTS faturamento_diario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES vendas_uploads(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  vale_refeicao NUMERIC(10,2) DEFAULT 0,
  vale_alimentacao NUMERIC(10,2) DEFAULT 0,
  pag_instantaneo NUMERIC(10,2) DEFAULT 0,
  dinheiro NUMERIC(10,2) DEFAULT 0,
  cartao_debito NUMERIC(10,2) DEFAULT 0,
  cartao_credito NUMERIC(10,2) DEFAULT 0,
  multibeneficios NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  unidade_id UUID REFERENCES unidades(id),
  UNIQUE(data, unidade_id)
);

-- 3. Produtos vendidos (detalhamento por produto)
CREATE TABLE IF NOT EXISTS vendas_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES vendas_uploads(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,3) DEFAULT 0,
  unidade_medida TEXT DEFAULT 'UNID',
  custo_total NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(12,2) DEFAULT 0,
  lucro NUMERIC(12,2) DEFAULT 0,
  percentual NUMERIC(5,2) DEFAULT 0,
  periodo_inicio DATE,
  periodo_fim DATE,
  unidade_id UUID REFERENCES unidades(id)
);

-- 4. Habilitar RLS
ALTER TABLE vendas_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturamento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_uploads_all" ON vendas_uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "faturamento_diario_all" ON faturamento_diario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vendas_produtos_all" ON vendas_produtos FOR ALL USING (true) WITH CHECK (true);

-- 5. View: faturamento mensal por unidade (para DRE)
CREATE OR REPLACE VIEW vw_faturamento_mensal AS
SELECT
  EXTRACT(MONTH FROM data)::INT AS mes,
  EXTRACT(YEAR FROM data)::INT AS ano,
  unidade_id,
  SUM(vale_refeicao) AS vale_refeicao,
  SUM(vale_alimentacao) AS vale_alimentacao,
  SUM(pag_instantaneo) AS pag_instantaneo,
  SUM(dinheiro) AS dinheiro,
  SUM(cartao_debito) AS cartao_debito,
  SUM(cartao_credito) AS cartao_credito,
  SUM(multibeneficios) AS multibeneficios,
  SUM(total) AS total
FROM faturamento_diario
GROUP BY EXTRACT(MONTH FROM data), EXTRACT(YEAR FROM data), unidade_id;
