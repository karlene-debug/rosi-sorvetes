-- Migration v9: Folha de Pagamento Simplificada
-- Permite ao gerente registrar o custo mensal de cada funcionario

-- Tabela principal: 1 registro por funcionario por mes
CREATE TABLE IF NOT EXISTS folha_pagamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
  salario_bruto DECIMAL(10,2) NOT NULL DEFAULT 0,
  descontos DECIMAL(10,2) NOT NULL DEFAULT 0,
  vale_transporte DECIMAL(10,2) NOT NULL DEFAULT 0,
  vale_refeicao DECIMAL(10,2) NOT NULL DEFAULT 0,
  outros_beneficios DECIMAL(10,2) NOT NULL DEFAULT 0,
  encargos_empresa DECIMAL(10,2) NOT NULL DEFAULT 0,
  horas_extras DECIMAL(10,2) NOT NULL DEFAULT 0,
  custo_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(funcionario_id, mes, ano)
);

-- Index para consultas mensais
CREATE INDEX IF NOT EXISTS idx_folha_mes_ano ON folha_pagamento(ano, mes);
CREATE INDEX IF NOT EXISTS idx_folha_funcionario ON folha_pagamento(funcionario_id);

-- View: resumo mensal da folha por unidade
CREATE OR REPLACE VIEW vw_folha_mensal AS
SELECT
  fp.mes,
  fp.ano,
  f.unidade_id,
  u.nome AS unidade_nome,
  COUNT(DISTINCT fp.funcionario_id) AS qtd_funcionarios,
  SUM(fp.salario_bruto) AS total_salarios,
  SUM(fp.descontos) AS total_descontos,
  SUM(fp.vale_transporte + fp.vale_refeicao + fp.outros_beneficios) AS total_beneficios,
  SUM(fp.encargos_empresa) AS total_encargos,
  SUM(fp.horas_extras) AS total_horas_extras,
  SUM(fp.custo_total) AS total_custo
FROM folha_pagamento fp
JOIN funcionarios f ON f.id = fp.funcionario_id
LEFT JOIN unidades u ON u.id = f.unidade_id
GROUP BY fp.mes, fp.ano, f.unidade_id, u.nome;

-- View: indicadores de RH
CREATE OR REPLACE VIEW vw_indicadores_rh AS
SELECT
  f.id AS funcionario_id,
  f.nome,
  f.status,
  f.data_admissao,
  f.data_demissao,
  f.salario,
  f.tipo_contrato,
  f.unidade_id,
  u.nome AS unidade_nome,
  c.nome AS cargo_nome,
  c.departamento,
  -- Tempo de casa em meses
  CASE
    WHEN f.data_admissao IS NOT NULL THEN
      EXTRACT(YEAR FROM AGE(COALESCE(f.data_demissao::date, CURRENT_DATE), f.data_admissao::date)) * 12 +
      EXTRACT(MONTH FROM AGE(COALESCE(f.data_demissao::date, CURRENT_DATE), f.data_admissao::date))
    ELSE 0
  END AS tempo_casa_meses,
  -- Encargos estimados (CLT ~47%: INSS patronal 20% + RAT 3% + FGTS 8% + 13o 8.33% + Ferias+1/3 11.11%)
  CASE
    WHEN f.tipo_contrato = 'clt' THEN ROUND(f.salario * 0.4744, 2)
    ELSE 0
  END AS encargos_estimados,
  -- Custo estimado total (salario + encargos)
  CASE
    WHEN f.tipo_contrato = 'clt' THEN ROUND(f.salario * 1.4744, 2)
    ELSE f.salario
  END AS custo_estimado_total
FROM funcionarios f
LEFT JOIN unidades u ON u.id = f.unidade_id
LEFT JOIN cargos c ON c.id = f.cargo_id;

-- Habilitar RLS
ALTER TABLE folha_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folha_pagamento_full" ON folha_pagamento FOR ALL USING (true) WITH CHECK (true);
