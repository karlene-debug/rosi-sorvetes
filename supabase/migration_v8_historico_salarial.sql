-- Migration V8: Historico Salarial + Melhorias Ferias
-- Rodar no Supabase SQL Editor

-- 1. Historico de reajustes salariais
CREATE TABLE IF NOT EXISTS historico_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  salario_anterior DECIMAL(12,2) NOT NULL,
  salario_novo DECIMAL(12,2) NOT NULL,
  data_reajuste DATE NOT NULL,
  motivo TEXT,
  registrado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historico_salarial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico_salarial_all" ON historico_salarial FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_historico_salarial_func ON historico_salarial(funcionario_id);

-- 2. Adicionar campo venda_ferias na tabela ferias
ALTER TABLE ferias ADD COLUMN IF NOT EXISTS vender_dias INTEGER DEFAULT 0;
ALTER TABLE ferias ADD COLUMN IF NOT EXISTS data_confirmacao DATE;

-- 3. Atualizar view de ferias para incluir novos campos
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
  f.vender_dias,
  f.data_confirmacao,
  f.status,
  f.observacao,
  CASE
    WHEN f.status = 'concluida' THEN 'ok'
    WHEN f.status = 'em_andamento' THEN 'ok'
    WHEN f.data_limite < CURRENT_DATE AND f.status IN ('pendente', 'programada') THEN 'vencida'
    WHEN f.data_limite < CURRENT_DATE + INTERVAL '60 days' AND f.status = 'pendente' THEN 'urgente'
    WHEN f.data_limite < CURRENT_DATE + INTERVAL '120 days' AND f.status = 'pendente' THEN 'atencao'
    ELSE 'ok'
  END AS alerta
FROM ferias f
JOIN funcionarios func ON func.id = f.funcionario_id
LEFT JOIN unidades u ON u.id = func.unidade_id
ORDER BY f.data_limite ASC;
