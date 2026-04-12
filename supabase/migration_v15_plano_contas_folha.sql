-- Migration v15: Contas de folha no plano de contas + vínculo com eventos
-- Rodar no Supabase SQL Editor

-- 1. Criar contas específicas para a folha de pagamento
INSERT INTO plano_contas (nome, tipo_custo, grupo, condicao, descricao) VALUES
  ('Salários CLT',
    'fixo', 'gasto_pessoal', 'necessidade',
    'Salários mensalistas dos funcionários CLT (evento 5)'),
  ('Adicionais e Gratificações',
    'variavel', 'gasto_pessoal', 'necessidade',
    'Adicional de função, triênio, quebra de caixa, adicional noturno (eventos 22, 153, 263, 310)'),
  ('Horas Extras e DSR',
    'variavel', 'gasto_pessoal', 'necessidade',
    'Horas extras 60%/100%, DSR sobre horas extras e rendimentos variáveis (eventos 605, 541, 521)'),
  ('Férias e 1/3 Constitucional',
    'variavel', 'gasto_pessoal', 'necessidade',
    'Demonstrativo de férias, médias HE/DSR e 1/3 constitucional (eventos 10005, 10602, 10651, 10993)')
ON CONFLICT (nome) DO NOTHING;

-- 2. Vincular eventos de PROVENTO às contas criadas
UPDATE eventos_folha_mapa SET plano_contas_id = (
  SELECT id FROM plano_contas WHERE nome = 'Salários CLT'
) WHERE codigo = '5';

UPDATE eventos_folha_mapa SET plano_contas_id = (
  SELECT id FROM plano_contas WHERE nome = 'Adicionais e Gratificações'
) WHERE codigo IN ('22', '153', '263', '310');

UPDATE eventos_folha_mapa SET plano_contas_id = (
  SELECT id FROM plano_contas WHERE nome = 'Horas Extras e DSR'
) WHERE codigo IN ('605', '541', '521');

UPDATE eventos_folha_mapa SET plano_contas_id = (
  SELECT id FROM plano_contas WHERE nome = 'Férias e 1/3 Constitucional'
) WHERE codigo IN ('10005', '10602', '10651', '10993');

-- Nota: Eventos de DESCONTO (406, 703, 704, 782, 953, 91005, 14503, 91025)
-- ficam sem vínculo por enquanto — são deduções do funcionário, não custos da empresa.
-- O FGTS e GPS já existem como encargos calculados à parte (não são eventos da folha).
