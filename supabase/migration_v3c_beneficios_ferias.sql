-- ============================================
-- ROSI SORVETES - MIGRACAO V3C: BENEFICIOS E FERIAS
-- Rodar no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. MELHORAR TABELA DE BENEFICIOS
-- ============================================

-- Dropar e recriar com estrutura melhor
DROP TABLE IF EXISTS beneficios;

CREATE TABLE beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('vt', 'vr', 'va', 'plano_saude', 'cesta_basica', 'outros')),
  valor_empresa DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_colaborador DECIMAL(12,2) NOT NULL DEFAULT 0,
  percentual_colaborador DECIMAL(5,2),
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE beneficios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON beneficios FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_beneficios_funcionario ON beneficios(funcionario_id);

-- ============================================
-- 2. TABELA DE FERIAS
-- ============================================

CREATE TABLE IF NOT EXISTS ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  data_limite DATE NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  dias INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'programada', 'em_andamento', 'concluida', 'vencida'
  )),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ferias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total temporario" ON ferias FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_ferias_funcionario ON ferias(funcionario_id);
CREATE INDEX idx_ferias_status ON ferias(status);

-- ============================================
-- 3. ADICIONAR CAMPOS NA OCORRENCIA
-- ============================================

ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS data_fim DATE;

-- ============================================
-- 4. VIEW DE FERIAS COM VENCIMENTOS
-- ============================================

CREATE OR REPLACE VIEW vw_ferias_vencimentos AS
SELECT
  f.id,
  func.id AS funcionario_id,
  func.nome AS funcionario_nome,
  func.unidade_id,
  u.nome AS unidade_nome,
  f.periodo_aquisitivo_inicio,
  f.periodo_aquisitivo_fim,
  f.data_limite,
  f.data_inicio,
  f.data_fim,
  f.dias,
  f.status,
  f.observacao,
  CASE
    WHEN f.status = 'concluida' THEN 'ok'
    WHEN f.data_limite < CURRENT_DATE AND f.status IN ('pendente', 'programada') THEN 'vencida'
    WHEN f.data_limite < CURRENT_DATE + INTERVAL '60 days' AND f.status = 'pendente' THEN 'urgente'
    WHEN f.data_limite < CURRENT_DATE + INTERVAL '120 days' AND f.status = 'pendente' THEN 'atencao'
    ELSE 'ok'
  END AS alerta
FROM ferias f
JOIN funcionarios func ON func.id = f.funcionario_id
LEFT JOIN unidades u ON u.id = func.unidade_id
ORDER BY f.data_limite ASC;

-- ============================================
-- FIM
-- ============================================
