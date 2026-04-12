-- Migration v11: Pendências de RH e dados de rescisão
-- Rodar no Supabase SQL Editor

-- Tabela de pendências geradas automaticamente
CREATE TABLE IF NOT EXISTS pendencias_rh (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  tipo VARCHAR(50) NOT NULL, -- 'ausente_folha', 'documento_pendente', etc
  descricao TEXT NOT NULL,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, resolvida, descartada
  resposta TEXT, -- o que o usuario decidiu
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolvido_em TIMESTAMP WITH TIME ZONE,
  UNIQUE(funcionario_id, tipo, mes_referencia, ano_referencia)
);

-- Adicionar campos de rescisão na tabela funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS motivo_demissao TEXT;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS tipo_demissao VARCHAR(50); -- sem_justa_causa, justa_causa, pedido_demissao, acordo
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS aviso_previo VARCHAR(30); -- trabalhado, indenizado, dispensado
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS multa_fgts DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS valor_rescisao DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS saldo_fgts DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS observacao_rescisao TEXT;

-- Index
CREATE INDEX IF NOT EXISTS idx_pendencias_status ON pendencias_rh(status);
CREATE INDEX IF NOT EXISTS idx_pendencias_funcionario ON pendencias_rh(funcionario_id);

-- RLS
ALTER TABLE pendencias_rh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pendencias_rh_full" ON pendencias_rh FOR ALL USING (true) WITH CHECK (true);
