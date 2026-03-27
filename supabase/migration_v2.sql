-- ============================================
-- ROSI SORVETES - MIGRACAO V2
-- Rodar no Supabase SQL Editor
-- IMPORTANTE: Rodar em ordem, bloco por bloco
-- ============================================

-- ============================================
-- BLOCO 1: TABELA DE UNIDADES
-- ============================================

CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('loja', 'fabrica', 'loja_fabrica')),
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  tem_fabrica_sorvete BOOLEAN DEFAULT FALSE,
  tem_fabrica_bolo BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON unidades FOR ALL USING (true) WITH CHECK (true);

INSERT INTO unidades (nome, tipo, cnpj, tem_fabrica_sorvete, tem_fabrica_bolo) VALUES
  ('Loja Centro', 'loja_fabrica', NULL, true, true),
  ('Loja Cristo', 'loja_fabrica', NULL, true, false);

-- ============================================
-- BLOCO 2: TABELA DE PRODUTOS (substitui sabores)
-- ============================================

CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'sorvete', 'bolo', 'acai', 'milkshake', 'taca',
    'calda', 'cobertura', 'complemento', 'descartavel',
    'bebida', 'insumo', 'embalagem', 'limpeza', 'outros'
  )),
  subcategoria TEXT CHECK (subcategoria IN (
    'tradicional', 'especial', 'zero_acucar',
    'montagem_caixa', 'montagem_massa',
    NULL
  )),
  tipo_producao TEXT CHECK (tipo_producao IN (
    'primario', 'derivado', 'processado', 'revenda', 'consumo_interno'
  )),
  unidade_medida TEXT NOT NULL DEFAULT 'unidade',
  custo_medio DECIMAL(12,2),
  preco_venda DECIMAL(12,2),
  peso_kg DECIMAL(10,3),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON produtos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_produtos_codigo ON produtos(codigo);
CREATE INDEX idx_produtos_tipo ON produtos(tipo_producao);

-- ============================================
-- BLOCO 3: MIGRAR SABORES → PRODUTOS
-- ============================================

-- Copia todos os sabores existentes pra tabela produtos
INSERT INTO produtos (id, nome, categoria, subcategoria, tipo_producao, unidade_medida, status, criado_em)
SELECT
  id,
  nome,
  'sorvete',
  categoria,
  CASE
    WHEN categoria IN ('montagem_caixa', 'montagem_massa') THEN 'derivado'
    ELSE 'primario'
  END,
  CASE
    WHEN categoria = 'montagem_caixa' THEN 'Caixa de 5 L'
    ELSE 'Balde'
  END,
  status,
  criado_em
FROM sabores;

-- Gerar codigos automaticos pra sorvetes migrados
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nome) AS rn
  FROM produtos
  WHERE categoria = 'sorvete'
)
UPDATE produtos SET codigo = 'SRV-' || LPAD(numbered.rn::TEXT, 3, '0')
FROM numbered
WHERE produtos.id = numbered.id;

-- ============================================
-- BLOCO 4: CADASTRAR BOLOS (do iFood)
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, peso_kg, preco_venda) VALUES
  ('BLO-001', 'Bolo Ferrero Rocher 800g', 'bolo', 'derivado', 'unidade', 0.8, 63.89),
  ('BLO-002', 'Bolo Ferrero Rocher 1.5kg', 'bolo', 'derivado', 'unidade', 1.5, 116.99),
  ('BLO-003', 'Bolo Ferrero Rocher 2.5kg', 'bolo', 'derivado', 'unidade', 2.5, 205.00),
  ('BLO-004', 'Bolo Leite Ninho c/ Morango 800g', 'bolo', 'derivado', 'unidade', 0.8, 63.99),
  ('BLO-005', 'Bolo Leite Ninho c/ Morango 1.5kg', 'bolo', 'derivado', 'unidade', 1.5, 116.99),
  ('BLO-006', 'Bolo Leite Ninho c/ Morango 2.5kg', 'bolo', 'derivado', 'unidade', 2.5, 205.00),
  ('BLO-007', 'Bolo Ninho Trufado 800g', 'bolo', 'derivado', 'unidade', 0.8, 63.99),
  ('BLO-008', 'Bolo Ninho Trufado 1.5kg', 'bolo', 'derivado', 'unidade', 1.5, 116.99),
  ('BLO-009', 'Bolo Ninho Trufado 2.5kg', 'bolo', 'derivado', 'unidade', 2.5, 205.00),
  ('BLO-010', 'Bolo Nutella 1.5kg', 'bolo', 'derivado', 'unidade', 1.5, 205.00),
  ('BLO-011', 'Bolo Sensacao 1.5kg', 'bolo', 'derivado', 'unidade', 1.5, 116.99),
  ('BLO-012', 'Bolo Sensacao 2.5kg', 'bolo', 'derivado', 'unidade', 2.5, 180.00);

-- ============================================
-- BLOCO 5: CADASTRAR ACAI
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, peso_kg, preco_venda) VALUES
  ('ACA-001', 'Acai 1kg', 'acai', 'processado', 'kg', 1.0, 39.90),
  ('ACA-002', 'Acai 1.5kg', 'acai', 'processado', 'kg', 1.5, 54.00),
  ('ACA-003', 'Barra de Acai', 'acai', 'processado', 'unidade', 1.0, 30.00),
  ('ACA-004', 'Acai Copo P 300ml', 'acai', 'processado', 'unidade', NULL, 15.00),
  ('ACA-005', 'Acai Copo M 400ml', 'acai', 'processado', 'unidade', NULL, 19.00);

-- ============================================
-- BLOCO 6: CADASTRAR MILKSHAKES E TACAS
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, preco_venda) VALUES
  ('MLK-001', 'Milk Shake P 300ml', 'milkshake', 'derivado', 'unidade', 15.00),
  ('MLK-002', 'Milk Shake M 500ml', 'milkshake', 'derivado', 'unidade', 18.00),
  ('MLK-003', 'Milk Shake G 700ml', 'milkshake', 'derivado', 'unidade', 24.00),
  ('TAC-001', 'Banana Split', 'taca', 'derivado', 'unidade', 30.00);

-- ============================================
-- BLOCO 7: CADASTRAR CALDAS E COBERTURAS
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, preco_venda) VALUES
  ('CLD-001', 'Calda Chocolate Branco c/ Flocos 100g', 'calda', 'revenda', 'unidade', 10.99),
  ('CLD-002', 'Calda Chocolate ao Leite 100g', 'calda', 'revenda', 'unidade', 9.99),
  ('CLD-003', 'Calda Chocolate Meio Amargo 100g', 'calda', 'revenda', 'unidade', 9.99),
  ('CLD-004', 'Calda Chocolate Ferrero Rocher 100g', 'calda', 'revenda', 'unidade', 10.99),
  ('COB-001', 'Cobertura Morango Marvi 190g', 'cobertura', 'revenda', 'unidade', 9.50),
  ('COB-002', 'Cobertura Chocolate Marvi 190g', 'cobertura', 'revenda', 'unidade', 9.50),
  ('COB-003', 'Cobertura Caramelo Marvi 190g', 'cobertura', 'revenda', 'unidade', 9.50);

-- ============================================
-- BLOCO 8: CADASTRAR COMPLEMENTOS E DESCARTAVEIS
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, preco_venda) VALUES
  ('CMP-001', 'Cascao 10 unidades', 'complemento', 'revenda', 'pacote', 10.00),
  ('CMP-002', 'Cestinha Baunilha 5 unidades', 'complemento', 'revenda', 'pacote', 5.50),
  ('DES-001', 'Colherzinha', 'descartavel', 'consumo_interno', 'unidade', 0.15),
  ('DES-002', 'Copo 250ml Sorvete', 'descartavel', 'consumo_interno', 'unidade', 0.15),
  ('DES-003', 'Pratinho Isopor Quadrado', 'descartavel', 'consumo_interno', 'unidade', 0.20),
  ('DES-004', 'Copo 180ml Bebida', 'descartavel', 'consumo_interno', 'unidade', 0.05);

-- ============================================
-- BLOCO 9: CADASTRAR BEBIDAS
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida, preco_venda) VALUES
  ('BEB-001', 'Coca-Cola Lata 350ml', 'bebida', 'revenda', 'unidade', 5.50),
  ('BEB-002', 'Coca-Cola Pet 600ml', 'bebida', 'revenda', 'unidade', 7.50),
  ('BEB-003', 'Coca-Cola Pet 2L', 'bebida', 'revenda', 'unidade', 15.00),
  ('BEB-004', 'Coca-Cola Pet 2L Zero', 'bebida', 'revenda', 'unidade', 15.00),
  ('BEB-005', 'Fanta Guarana 2L', 'bebida', 'revenda', 'unidade', 10.99),
  ('BEB-006', 'Agua Sem Gas 510ml', 'bebida', 'revenda', 'unidade', 4.00),
  ('BEB-007', 'Agua Com Gas 510ml', 'bebida', 'revenda', 'unidade', 5.00),
  ('BEB-008', 'Agua 1.5L Sem Gas', 'bebida', 'revenda', 'unidade', 6.00),
  ('BEB-009', 'Picole', 'bebida', 'revenda', 'unidade', 3.50);

-- ============================================
-- BLOCO 10: EXEMPLOS DE INSUMOS (materia-prima)
-- Rosi vai completar depois com todos os insumos reais
-- ============================================

INSERT INTO produtos (codigo, nome, categoria, tipo_producao, unidade_medida) VALUES
  ('MP-001', 'Barra de Acai (insumo)', 'insumo', 'consumo_interno', 'kg'),
  ('MP-002', 'Leite', 'insumo', 'consumo_interno', 'litro'),
  ('MP-003', 'Acucar', 'insumo', 'consumo_interno', 'kg'),
  ('MP-004', 'Cacau em Po', 'insumo', 'consumo_interno', 'kg'),
  ('MP-005', 'Leite Condensado', 'insumo', 'consumo_interno', 'kg'),
  ('MP-006', 'Creme de Leite', 'insumo', 'consumo_interno', 'litro'),
  ('MP-007', 'Chantilly', 'insumo', 'consumo_interno', 'litro'),
  ('MP-008', 'Polpa de Morango', 'insumo', 'consumo_interno', 'kg'),
  ('MP-009', 'Polpa de Maracuja', 'insumo', 'consumo_interno', 'kg'),
  ('MP-010', 'Nutella', 'insumo', 'consumo_interno', 'kg'),
  ('EMB-001', 'Balde Sorvete', 'embalagem', 'consumo_interno', 'unidade'),
  ('EMB-002', 'Caixa 5L', 'embalagem', 'consumo_interno', 'unidade'),
  ('EMB-003', 'Pote Sorvete 500g', 'embalagem', 'consumo_interno', 'unidade'),
  ('EMB-004', 'Pote Sorvete 1kg', 'embalagem', 'consumo_interno', 'unidade'),
  ('EMB-005', 'Pote Sorvete 1.5kg', 'embalagem', 'consumo_interno', 'unidade'),
  ('LIM-001', 'Saco de Lixo 50L', 'limpeza', 'consumo_interno', 'pacote'),
  ('LIM-002', 'Detergente', 'limpeza', 'consumo_interno', 'unidade'),
  ('LIM-003', 'Agua Sanitaria', 'limpeza', 'consumo_interno', 'unidade');

-- ============================================
-- BLOCO 11: TABELA DE RECEITAS
-- ============================================

CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_derivado_id UUID NOT NULL REFERENCES produtos(id),
  produto_ingrediente_id UUID NOT NULL REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON receitas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_receitas_derivado ON receitas(produto_derivado_id);

-- ============================================
-- BLOCO 12: ADICIONAR COLUNAS NA MOVIMENTACOES
-- (migrar pra nova estrutura sem quebrar dados)
-- ============================================

-- Adicionar referencia a produtos (novo) mantendo sabor_id (legado)
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id);
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS unidade_origem_id UUID REFERENCES unidades(id);
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS unidade_destino_id UUID REFERENCES unidades(id);

-- Copiar sabor_id → produto_id (mesmos UUIDs porque migramos com o mesmo ID)
UPDATE movimentacoes SET produto_id = sabor_id WHERE produto_id IS NULL;

-- Setar unidade_origem como Loja Centro pra todos os dados historicos
UPDATE movimentacoes
SET unidade_origem_id = (SELECT id FROM unidades WHERE nome = 'Loja Centro' LIMIT 1)
WHERE unidade_origem_id IS NULL;

-- Atualizar CHECK do tipo pra incluir novos valores
ALTER TABLE movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_tipo_check;
ALTER TABLE movimentacoes ADD CONSTRAINT movimentacoes_tipo_check
  CHECK (tipo IN ('saida', 'producao', 'ajuste', 'transferencia', 'perda', 'montagem_saida', 'montagem_entrada'));

-- Atualizar CHECK do destino
ALTER TABLE movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_destino_check;
ALTER TABLE movimentacoes ADD CONSTRAINT movimentacoes_destino_check
  CHECK (destino IN ('balcao', 'montagem_massa', 'montagem', 'transferencia', 'ifood'));

-- Atualizar CHECK da origem
ALTER TABLE movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_origem_check;
ALTER TABLE movimentacoes ADD CONSTRAINT movimentacoes_origem_check
  CHECK (origem IN ('plataforma', 'importado', 'api_pdv', 'api_ifood'));

-- ============================================
-- BLOCO 13: TABELA DE ORDENS DE PRODUCAO (bolos)
-- ============================================

CREATE TABLE ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  status TEXT NOT NULL DEFAULT 'em_producao' CHECK (status IN (
    'em_producao', 'endurecendo', 'finalizado', 'cancelado'
  )),
  responsavel TEXT NOT NULL,
  unidade_id UUID REFERENCES unidades(id),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ
);

ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON ordens_producao FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_ordens_producao_status ON ordens_producao(status);
CREATE INDEX idx_ordens_producao_data ON ordens_producao(data);

-- ============================================
-- BLOCO 14: ADICIONAR unidade_id NAS TABELAS FINANCEIRAS
-- ============================================

ALTER TABLE contas ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);
ALTER TABLE custos_fixos ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS unidade_id UUID REFERENCES unidades(id);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS canal TEXT;

-- ============================================
-- BLOCO 15: VIEW - ESTOQUE POR UNIDADE
-- ============================================

CREATE OR REPLACE VIEW vw_estoque_por_unidade AS
SELECT
  p.id AS produto_id,
  p.codigo,
  p.nome AS produto,
  p.categoria,
  p.subcategoria,
  m.unidade,
  m.unidade_origem_id AS unidade_id,
  u.nome AS unidade_nome,
  COALESCE(SUM(CASE WHEN m.tipo IN ('producao', 'montagem_entrada') THEN m.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN m.tipo IN ('saida', 'montagem_saida', 'perda') THEN m.quantidade ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN m.tipo = 'ajuste' THEN m.quantidade ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN m.tipo = 'transferencia' AND m.unidade_destino_id = m.unidade_origem_id THEN m.quantidade ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN m.tipo = 'transferencia' AND m.unidade_destino_id != m.unidade_origem_id THEN m.quantidade ELSE 0 END), 0)
  AS saldo
FROM produtos p
LEFT JOIN movimentacoes m ON m.produto_id = p.id
LEFT JOIN unidades u ON u.id = m.unidade_origem_id
WHERE p.status = 'ativo'
GROUP BY p.id, p.codigo, p.nome, p.categoria, p.subcategoria, m.unidade, m.unidade_origem_id, u.nome
ORDER BY p.categoria, p.nome;

-- ============================================
-- FIM DA MIGRACAO V2
-- ============================================
-- NOTA: A tabela 'sabores' e a coluna 'sabor_id' nas movimentacoes
-- NAO sao removidas nesta migracao pra manter compatibilidade.
-- Serao removidas na v3 quando o frontend estiver 100% migrado.
