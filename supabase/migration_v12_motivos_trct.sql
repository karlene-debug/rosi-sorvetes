-- Migration v12: Motivos de desligamento + campos TRCT
-- Rodar no Supabase SQL Editor

-- Tabela de motivos de desligamento (cadastravel pelo usuario)
CREATE TABLE IF NOT EXISTS motivos_desligamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL UNIQUE,
  categoria VARCHAR(50) DEFAULT 'voluntario', -- voluntario, involuntario, acordo
  status VARCHAR(20) DEFAULT 'ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Motivos iniciais
INSERT INTO motivos_desligamento (descricao, categoria) VALUES
  ('Outro emprego (melhor salário)', 'voluntario'),
  ('Outro emprego (área de estudo)', 'voluntario'),
  ('Distância do trabalho', 'voluntario'),
  ('Insatisfação com gestão', 'voluntario'),
  ('Problemas pessoais/família', 'voluntario'),
  ('Mudança de cidade', 'voluntario'),
  ('Baixo desempenho', 'involuntario'),
  ('Indisciplina/insubordinação', 'involuntario'),
  ('Abandono de emprego', 'involuntario'),
  ('Término de contrato', 'involuntario'),
  ('Redução de quadro', 'involuntario'),
  ('Justa causa', 'involuntario'),
  ('Acordo mútuo (reforma trabalhista)', 'acordo'),
  ('Outros', 'voluntario')
ON CONFLICT (descricao) DO NOTHING;

-- Campos do TRCT no funcionario
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS motivo_desligamento_id UUID REFERENCES motivos_desligamento(id);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS causa_afastamento TEXT;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cod_afastamento VARCHAR(10);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_aviso_previo DATE;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS remuneracao_mes_anterior DECIMAL(10,2);
-- Verbas rescisorias
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_saldo_salario DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_13_proporcional DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_ferias_proporcionais DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_ferias_vencidas DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_terco_ferias DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_aviso_indenizado DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_multa_477 DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_multa_479 DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_horas_extras DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_outros_proventos DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_total_bruto DECIMAL(10,2) DEFAULT 0;
-- Deducoes
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_inss DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_irrf DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_adiantamento DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_pensao DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_outras_deducoes DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_total_deducoes DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_valor_liquido DECIMAL(10,2) DEFAULT 0;
-- Status do TRCT
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_status VARCHAR(30) DEFAULT NULL; -- null=nao aplicavel, pendente, importado
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS trct_importado_em TIMESTAMP WITH TIME ZONE;

-- RLS
ALTER TABLE motivos_desligamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motivos_desligamento_full" ON motivos_desligamento FOR ALL USING (true) WITH CHECK (true);
