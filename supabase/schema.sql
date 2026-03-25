-- ============================================
-- ROSI SORVETES - Schema do Banco de Dados
-- Rodar no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COLABORADORES
-- ============================================
CREATE TABLE colaboradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  desativado_em TIMESTAMPTZ
);

-- Dados iniciais
INSERT INTO colaboradores (nome) VALUES
  ('Rose'), ('Bernardo'), ('Valdirene'), ('Joao'), ('Yago'), ('Rosi'), ('Kenia');

-- ============================================
-- 2. SABORES
-- ============================================
CREATE TABLE sabores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL CHECK (categoria IN ('tradicional', 'especial', 'zero_acucar', 'montagem_caixa', 'montagem_massa')),
  unidades TEXT[] NOT NULL DEFAULT '{"Balde"}',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Sabores iniciais (todos os reais do Google Forms)
INSERT INTO sabores (nome, categoria, unidades) VALUES
  -- Tradicionais
  ('Acai', 'tradicional', '{"Balde"}'),
  ('Abacaxi ao Vinho', 'tradicional', '{"Balde"}'),
  ('Ameixa', 'tradicional', '{"Balde"}'),
  ('Amendoim', 'tradicional', '{"Balde"}'),
  ('Blue Ice', 'tradicional', '{"Balde"}'),
  ('Chocolate', 'tradicional', '{"Balde"}'),
  ('Chocomenta', 'tradicional', '{"Balde"}'),
  ('Coco', 'tradicional', '{"Balde"}'),
  ('Creme', 'tradicional', '{"Balde"}'),
  ('Cupuacu', 'tradicional', '{"Balde"}'),
  ('Danone', 'tradicional', '{"Balde"}'),
  ('Flocos', 'tradicional', '{"Balde"}'),
  ('Iogurte c/ Frutas Vermelhas', 'tradicional', '{"Balde"}'),
  ('Iogurte s/ Recheio', 'tradicional', '{"Balde"}'),
  ('Leite Ninho', 'tradicional', '{"Balde"}'),
  ('Limao', 'tradicional', '{"Balde"}'),
  ('Milho Verde', 'tradicional', '{"Balde"}'),
  ('Morango', 'tradicional', '{"Balde"}'),
  ('Uva', 'tradicional', '{"Balde"}'),
  -- Especiais
  ('Chocolate 70%', 'especial', '{"Balde"}'),
  ('Ferrero Rocher', 'especial', '{"Balde"}'),
  ('Folhado Doce de Leite', 'especial', '{"Balde"}'),
  ('Kinder Ovo', 'especial', '{"Balde"}'),
  ('Kit Kat', 'especial', '{"Balde"}'),
  ('Laka', 'especial', '{"Balde"}'),
  ('Leite Ninho Trufado', 'especial', '{"Balde"}'),
  ('Merengue de Morango', 'especial', '{"Balde"}'),
  ('Mousse Choc. c/ Amendoa', 'especial', '{"Balde"}'),
  ('Mousse Maracuja', 'especial', '{"Balde"}'),
  ('Nozes', 'especial', '{"Balde"}'),
  ('Nutella', 'especial', '{"Balde"}'),
  ('Ovomaltine', 'especial', '{"Balde"}'),
  ('Passas ao Rum', 'especial', '{"Balde"}'),
  ('Pistache', 'especial', '{"Balde"}'),
  ('Sensacao', 'especial', '{"Balde"}'),
  ('Sonho de Moca', 'especial', '{"Balde"}'),
  ('Torta de Limao', 'especial', '{"Balde"}'),
  -- Zero acucar
  ('Zero Acucar - Chocolate', 'zero_acucar', '{"Balde"}'),
  ('Zero Acucar - Morango', 'zero_acucar', '{"Balde"}'),
  ('Zero Acucar - Mousse de Maracuja', 'zero_acucar', '{"Balde"}'),
  ('Zero Acucar - Torta de Limao', 'zero_acucar', '{"Balde"}'),
  -- Montagem Caixa 5L
  ('Chocolate com Laka', 'montagem_caixa', '{"Caixa de 5 L"}'),
  ('Ferrero Rocher / Leite Ninho Trufado', 'montagem_caixa', '{"Caixa de 5 L"}'),
  ('Iogurte Frutas Verm. / Leite Ninho Trufado', 'montagem_caixa', '{"Caixa de 5 L"}'),
  ('Napolitano', 'montagem_caixa', '{"Caixa de 5 L"}'),
  ('Sensacao com Flocos', 'montagem_caixa', '{"Caixa de 5 L"}'),
  -- Montagem Massa
  ('Acai / Leite Ninho', 'montagem_massa', '{"Balde"}'),
  ('Charge', 'montagem_massa', '{"Balde"}'),
  ('Nata / Pave', 'montagem_massa', '{"Balde"}'),
  ('Nutella (Massa)', 'montagem_massa', '{"Balde"}'),
  ('Sorvete de Bolo', 'montagem_massa', '{"Balde"}'),
  ('Pave', 'montagem_massa', '{"Balde"}'),
  -- Novos tradicionais (identificados na planilha)
  ('Abacaxi sem Vinho', 'tradicional', '{"Balde"}'),
  ('Acai com Banana', 'tradicional', '{"Balde"}'),
  ('Cafe', 'tradicional', '{"Balde"}'),
  ('Cafe com Avela', 'especial', '{"Balde"}'),
  ('Iogurte', 'tradicional', '{"Balde"}'),
  ('Iogurte Grego', 'especial', '{"Balde"}'),
  ('Iogurte com Frutas Silvestres', 'especial', '{"Balde"}'),
  ('Iogurte com Nutella', 'especial', '{"Balde"}'),
  -- Novos zero acucar
  ('Zero Acucar - Amendoim', 'zero_acucar', '{"Balde"}'),
  ('Zero Acucar - Iogurte com Frutas Silvestres', 'zero_acucar', '{"Balde"}'),
  ('Zero Acucar - Iogurte', 'zero_acucar', '{"Balde"}');

-- ============================================
-- 3. MOVIMENTACOES DE ESTOQUE
-- ============================================
CREATE TABLE movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data TIMESTAMPTZ DEFAULT NOW(),
  sabor_id UUID NOT NULL REFERENCES sabores(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  unidade TEXT NOT NULL CHECK (unidade IN ('Balde', 'Caixa de 5 L', 'Pote de Creme')),
  tipo TEXT NOT NULL CHECK (tipo IN ('saida', 'producao', 'ajuste')),
  destino TEXT CHECK (destino IN ('balcao', 'montagem_massa')),
  responsavel TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'plataforma' CHECK (origem IN ('plataforma', 'importado')),
  observacao TEXT
);

-- Index para consultas rapidas
CREATE INDEX idx_movimentacoes_sabor ON movimentacoes(sabor_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes(tipo);

-- ============================================
-- 4. INVENTARIOS
-- ============================================
CREATE TABLE inventarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data TIMESTAMPTZ DEFAULT NOW(),
  responsavel TEXT NOT NULL,
  observacao TEXT
);

CREATE TABLE inventario_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  sabor_id UUID NOT NULL REFERENCES sabores(id),
  unidade TEXT NOT NULL CHECK (unidade IN ('Balde', 'Caixa de 5 L', 'Pote de Creme')),
  contagem INTEGER NOT NULL DEFAULT 0,
  esperado INTEGER NOT NULL DEFAULT 0,
  divergencia INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_inventario_itens_inventario ON inventario_itens(inventario_id);

-- ============================================
-- 5. PLANO DE CONTAS
-- ============================================
CREATE TABLE plano_contas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  tipo_custo TEXT NOT NULL CHECK (tipo_custo IN ('fixo', 'variavel', 'percentual')),
  grupo TEXT NOT NULL CHECK (grupo IN (
    'gasto_pessoal', 'custo_direto', 'ocupacao', 'administrativo', 'impostos_financeiro'
  )),
  condicao TEXT NOT NULL DEFAULT 'necessidade' CHECK (condicao IN ('necessidade', 'desejo', 'financeiro')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Plano de contas baseado na planilha real
INSERT INTO plano_contas (nome, tipo_custo, grupo, condicao) VALUES
  -- Gasto com Pessoal
  ('Salario Pro-Labore (Socios)', 'fixo', 'gasto_pessoal', 'necessidade'),
  ('Diaristas/Extras', 'fixo', 'gasto_pessoal', 'necessidade'),
  ('Beneficios e VT', 'variavel', 'gasto_pessoal', 'necessidade'),
  ('Encargos e Provisoes', 'fixo', 'gasto_pessoal', 'necessidade'),
  ('Outros Custos Pessoal', 'fixo', 'gasto_pessoal', 'necessidade'),
  ('Uniformes/EPIs', 'variavel', 'gasto_pessoal', 'necessidade'),
  ('Treinamento', 'variavel', 'gasto_pessoal', 'desejo'),
  -- Custos Diretos
  ('Fornecedores (Materia Prima)', 'variavel', 'custo_direto', 'necessidade'),
  ('Embalagens e Descartaveis', 'variavel', 'custo_direto', 'necessidade'),
  ('Mercadoria p/ Revenda', 'variavel', 'custo_direto', 'necessidade'),
  ('Fretes de Compra', 'fixo', 'custo_direto', 'necessidade'),
  ('Perdas/Quebras', 'variavel', 'custo_direto', 'necessidade'),
  -- Ocupacao
  ('Aluguel', 'fixo', 'ocupacao', 'necessidade'),
  ('Energia Eletrica', 'variavel', 'ocupacao', 'necessidade'),
  ('Condominio/Agua', 'fixo', 'ocupacao', 'necessidade'),
  ('Manut. Equipam. e Freezers', 'fixo', 'ocupacao', 'necessidade'),
  ('Manut. Predial e Limpeza', 'fixo', 'ocupacao', 'necessidade'),
  ('Seguro', 'fixo', 'ocupacao', 'necessidade'),
  -- Administrativo
  ('Consultorias', 'fixo', 'administrativo', 'necessidade'),
  ('Contabilidade e Juridico', 'fixo', 'administrativo', 'necessidade'),
  ('Sistemas e Marketing', 'fixo', 'administrativo', 'desejo'),
  ('Telecom e Escritorio', 'fixo', 'administrativo', 'necessidade'),
  ('Veiculos', 'fixo', 'administrativo', 'necessidade'),
  ('Material de Escritorio', 'variavel', 'administrativo', 'necessidade'),
  ('Taxas e Licencas', 'variavel', 'administrativo', 'necessidade'),
  -- Impostos e Financeiro
  ('Impostos s/ Venda (Simples)', 'variavel', 'impostos_financeiro', 'necessidade'),
  ('Taxas de Cartao (MDR)', 'fixo', 'impostos_financeiro', 'necessidade'),
  ('Tarifas Bancarias', 'fixo', 'impostos_financeiro', 'necessidade'),
  ('Emprestimos/Consorcios', 'percentual', 'impostos_financeiro', 'financeiro'),
  ('FGTS', 'variavel', 'impostos_financeiro', 'necessidade');

-- ============================================
-- 6. FORNECEDORES
-- ============================================
CREATE TABLE fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. CONTAS (SAIDAS FINANCEIRAS)
-- ============================================
CREATE TABLE contas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_documento DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  plano_contas_id UUID REFERENCES plano_contas(id),
  fornecedor_id UUID REFERENCES fornecedores(id),
  tipo_pagamento TEXT,
  parcela TEXT,
  situacao TEXT NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  recorrente BOOLEAN DEFAULT FALSE,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  origem TEXT NOT NULL DEFAULT 'plataforma' CHECK (origem IN ('plataforma', 'importado')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contas_vencimento ON contas(data_vencimento);
CREATE INDEX idx_contas_situacao ON contas(situacao);
CREATE INDEX idx_contas_plano ON contas(plano_contas_id);
CREATE INDEX idx_contas_mes_ano ON contas(mes_referencia, ano_referencia);

-- ============================================
-- 8. CUSTOS FIXOS RECORRENTES (template mensal)
-- ============================================
CREATE TABLE custos_fixos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  plano_contas_id UUID REFERENCES plano_contas(id),
  fornecedor_id UUID REFERENCES fornecedores(id),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ENTRADAS (RECEITAS) - preparado para API do caixa
-- ============================================
CREATE TABLE entradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  tipo_pagamento TEXT,
  valor DECIMAL(12,2) NOT NULL,
  categoria TEXT,
  fonte TEXT,
  situacao TEXT NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'recebido', 'cancelado')),
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  origem TEXT NOT NULL DEFAULT 'plataforma' CHECK (origem IN ('plataforma', 'importado', 'api_caixa')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entradas_data ON entradas(data);
CREATE INDEX idx_entradas_mes_ano ON entradas(mes_referencia, ano_referencia);

-- ============================================
-- 10. VIEW: SALDO DE ESTOQUE POR SABOR
-- ============================================
CREATE OR REPLACE VIEW vw_saldo_estoque AS
SELECT
  s.id AS sabor_id,
  s.nome AS sabor,
  s.categoria,
  m.unidade,
  COALESCE(SUM(CASE WHEN m.tipo = 'producao' THEN m.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN m.tipo = 'ajuste' THEN m.quantidade ELSE 0 END), 0)
  AS saldo
FROM sabores s
LEFT JOIN movimentacoes m ON m.sabor_id = s.id
WHERE s.status = 'ativo'
GROUP BY s.id, s.nome, s.categoria, m.unidade
ORDER BY s.nome;

-- ============================================
-- 11. VIEW: RESUMO FINANCEIRO MENSAL
-- ============================================
CREATE OR REPLACE VIEW vw_resumo_financeiro AS
SELECT
  ano_referencia AS ano,
  mes_referencia AS mes,
  situacao,
  COUNT(*) AS total_contas,
  SUM(valor) AS total_valor
FROM contas
WHERE situacao != 'cancelado'
GROUP BY ano_referencia, mes_referencia, situacao
ORDER BY ano_referencia, mes_referencia;

-- ============================================
-- 12. POLITICAS DE SEGURANCA (RLS)
-- Por enquanto, acesso total. Depois restringimos por perfil.
-- ============================================
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabores ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_fixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas ENABLE ROW LEVEL SECURITY;

-- Politica temporaria: permite tudo para usuarios autenticados e anonimos
-- Depois vamos restringir por perfil (colaborador vs diretor)
CREATE POLICY "Acesso total temporario" ON colaboradores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON sabores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON movimentacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON inventarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON inventario_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON plano_contas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON fornecedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON contas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON custos_fixos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total temporario" ON entradas FOR ALL USING (true) WITH CHECK (true);
