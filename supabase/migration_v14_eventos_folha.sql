-- Migration v14: Eventos da Folha de Pagamento (detalhamento por código de evento)
-- Rodar no Supabase SQL Editor

-- 1. Tabela de mapeamento: código de evento → descrição padrão, tipo, plano de contas
CREATE TABLE IF NOT EXISTS eventos_folha_mapa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  descricao_padrao TEXT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('provento', 'desconto')),
  plano_contas_id UUID REFERENCES plano_contas(id),
  grupo_ferias BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'ativo',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de eventos individuais de cada folha
CREATE TABLE IF NOT EXISTS eventos_folha (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_pagamento_id UUID NOT NULL REFERENCES folha_pagamento(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('provento', 'desconto')),
  referencia VARCHAR(30),
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_folha_pagamento ON eventos_folha(folha_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_folha_codigo ON eventos_folha(codigo);

-- 3. Adicionar codigo_func na folha_pagamento (código do funcionário no sistema contábil)
ALTER TABLE folha_pagamento ADD COLUMN IF NOT EXISTS codigo_func VARCHAR(10);

-- 4. Inserir mapeamento dos eventos conhecidos do SCI (baseado nos espelhos reais)
INSERT INTO eventos_folha_mapa (codigo, descricao_padrao, tipo, grupo_ferias) VALUES
  -- === PROVENTOS ===
  ('5',     'Salário mensalista',                    'provento',  false),
  ('22',    'Adicional de Função',                   'provento',  false),
  ('153',   'Adicional noturno rendimentos variáveis','provento', false),
  ('263',   'Triênio',                               'provento',  false),
  ('310',   'Quebra de caixa',                       'provento',  false),
  ('521',   'DSR rendimentos variáveis',             'provento',  false),
  ('541',   'DSR horas extras',                      'provento',  false),
  ('605',   'Horas extras 60%',                      'provento',  false),
  -- === PROVENTOS FÉRIAS ===
  ('10005', 'Demonstrativo de férias',               'provento',  true),
  ('10602', 'Demonstrativo férias média HE',         'provento',  true),
  ('10651', 'Demonstrativo férias média DSR HE',     'provento',  true),
  ('10993', 'Demonstrativo 1/3 férias',              'provento',  true),
  -- === DESCONTOS ===
  ('406',   'Contribuição Negocial',                 'desconto',  false),
  ('703',   'Faltas não justificadas dias',          'desconto',  false),
  ('704',   'Faltas Atraso Horas',                   'desconto',  false),
  ('782',   'DSR faltas dia',                        'desconto',  false),
  ('953',   'Adiantamento com ded. IR',              'desconto',  false),
  ('91005', 'INSS',                                  'desconto',  false),
  -- === DESCONTOS FÉRIAS ===
  ('14503', 'Desconto de férias',                    'desconto',  true),
  ('91025', 'INSS demonstrativo férias',             'desconto',  true)
ON CONFLICT (codigo) DO NOTHING;

-- 5. RLS
ALTER TABLE eventos_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_folha_mapa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos_folha_full" ON eventos_folha FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "eventos_folha_mapa_full" ON eventos_folha_mapa FOR ALL USING (true) WITH CHECK (true);
