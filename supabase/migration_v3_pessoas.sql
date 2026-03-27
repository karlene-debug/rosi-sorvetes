-- ============================================
-- ROSI SORVETES - MIGRACAO V3: MODULO PESSOAS
-- Rodar no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CARGOS
-- ============================================

CREATE TABLE IF NOT EXISTS cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao_atividades TEXT,
  departamento TEXT CHECK (departamento IN (
    'producao', 'atendimento', 'administrativo', 'limpeza', 'gestao'
  )),
  faixa_salarial_min DECIMAL(12,2),
  faixa_salarial_max DECIMAL(12,2),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON cargos FOR ALL USING (true) WITH CHECK (true);

INSERT INTO cargos (nome, departamento, descricao_atividades) VALUES
  ('Socio(a)', 'gestao', 'Gestao geral do negocio, tomada de decisoes estrategicas, financeiro'),
  ('Gerente', 'gestao', 'Coordenacao da equipe, controle de estoque, atendimento ao cliente, abertura/fechamento'),
  ('Fabricante Sorvete', 'producao', 'Producao de sorvetes, controle de qualidade, higienizacao de equipamentos'),
  ('Fabricante Bolo', 'producao', 'Montagem e finalizacao de bolos de sorvete, controle de estoque de bolos'),
  ('Caixa', 'atendimento', 'Operacao do caixa, recebimento de pagamentos, fechamento diario'),
  ('Balconista', 'atendimento', 'Atendimento ao cliente, montagem de pedidos, organizacao do balcao'),
  ('Auxiliar de Limpeza', 'limpeza', 'Limpeza e higienizacao do ambiente, reposicao de materiais'),
  ('Diarista', 'limpeza', 'Limpeza geral em dias especificos (cobertura de folgas)');

-- ============================================
-- 2. FUNCIONARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  cargo_id UUID REFERENCES cargos(id),
  unidade_id UUID REFERENCES unidades(id),
  data_admissao DATE,
  data_demissao DATE,
  salario DECIMAL(12,2),
  tipo_contrato TEXT CHECK (tipo_contrato IN ('clt', 'diarista', 'socio', 'pj', 'estagiario')),
  jornada TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'ferias', 'afastado')),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON funcionarios FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_funcionarios_unidade ON funcionarios(unidade_id);
CREATE INDEX idx_funcionarios_cargo ON funcionarios(cargo_id);
CREATE INDEX idx_funcionarios_status ON funcionarios(status);

-- ============================================
-- 3. OCORRENCIAS
-- ============================================

CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'falta', 'falta_justificada', 'atestado', 'atraso',
    'advertencia', 'suspensao', 'elogio', 'ferias', 'outros'
  )),
  descricao TEXT,
  dias INTEGER DEFAULT 1,
  documento_url TEXT,
  registrado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON ocorrencias FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_ocorrencias_funcionario ON ocorrencias(funcionario_id);
CREATE INDEX idx_ocorrencias_data ON ocorrencias(data);
CREATE INDEX idx_ocorrencias_tipo ON ocorrencias(tipo);

-- ============================================
-- 4. BENEFICIOS
-- ============================================

CREATE TABLE IF NOT EXISTS beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('vt', 'vr', 'va', 'plano_saude', 'cesta_basica', 'outros')),
  valor DECIMAL(12,2) NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE beneficios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON beneficios FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. VIEWS DE INDICADORES RH
-- ============================================

-- Absenteismo por funcionario (ultimos 30 dias)
CREATE OR REPLACE VIEW vw_absenteismo AS
SELECT
  f.id AS funcionario_id,
  f.nome,
  f.unidade_id,
  u.nome AS unidade_nome,
  COUNT(o.id) FILTER (WHERE o.tipo IN ('falta', 'falta_justificada', 'atestado') AND o.data >= CURRENT_DATE - INTERVAL '30 days') AS faltas_30d,
  COALESCE(SUM(o.dias) FILTER (WHERE o.tipo IN ('falta', 'falta_justificada', 'atestado') AND o.data >= CURRENT_DATE - INTERVAL '30 days'), 0) AS dias_ausentes_30d,
  COUNT(o.id) FILTER (WHERE o.tipo = 'atraso' AND o.data >= CURRENT_DATE - INTERVAL '30 days') AS atrasos_30d,
  COUNT(o.id) FILTER (WHERE o.tipo = 'advertencia') AS total_advertencias
FROM funcionarios f
LEFT JOIN ocorrencias o ON o.funcionario_id = f.id
LEFT JOIN unidades u ON u.id = f.unidade_id
WHERE f.status = 'ativo'
GROUP BY f.id, f.nome, f.unidade_id, u.nome
ORDER BY dias_ausentes_30d DESC;

-- ============================================
-- FIM DA MIGRACAO V3
-- ============================================
