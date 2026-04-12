-- Migration v10: Cadastro dos funcionarios reais (Loja Centro)
-- Dados extraidos do espelho da folha de Janeiro/2026
-- Rodar no Supabase SQL Editor

-- Inserir funcionarios reais vinculados aos cargos existentes
-- Primeiro, pegar os IDs dos cargos e da unidade Loja Centro

DO $$
DECLARE
  v_unidade_centro UUID;
  v_cargo_confeiteira UUID;
  v_cargo_aux_producao UUID;
  v_cargo_balconista UUID;
  v_cargo_gerente UUID;
  v_cargo_aux_limpeza UUID;
  v_cargo_caixa UUID;
  v_cargo_socia UUID;
BEGIN
  -- Buscar unidade Loja Centro
  SELECT id INTO v_unidade_centro FROM unidades WHERE nome ILIKE '%Centro%' LIMIT 1;

  -- Buscar cargos (nomes atualizados pela migration v3b)
  SELECT id INTO v_cargo_confeiteira FROM cargos WHERE nome ILIKE '%Confeiteira%' OR nome ILIKE '%Bolo%' LIMIT 1;
  SELECT id INTO v_cargo_aux_producao FROM cargos WHERE nome ILIKE '%Producao%' OR nome ILIKE '%Operador%' LIMIT 1;
  SELECT id INTO v_cargo_balconista FROM cargos WHERE nome ILIKE '%Balconista%' LIMIT 1;
  SELECT id INTO v_cargo_gerente FROM cargos WHERE nome ILIKE '%Gerente%' LIMIT 1;
  SELECT id INTO v_cargo_aux_limpeza FROM cargos WHERE nome ILIKE '%Limpeza%' AND nome NOT ILIKE '%Diarista%' LIMIT 1;
  SELECT id INTO v_cargo_caixa FROM cargos WHERE nome ILIKE '%Caixa%' LIMIT 1;
  SELECT id INTO v_cargo_socia FROM cargos WHERE nome ILIKE '%Soci%' OR nome ILIKE '%Diretoria Geral%' LIMIT 1;

  -- Inserir funcionarios (ON CONFLICT DO NOTHING para nao duplicar se rodar novamente)
  INSERT INTO funcionarios (nome, cpf, cargo_id, unidade_id, data_admissao, salario, tipo_contrato, jornada, status)
  VALUES
    ('Deyse Barbosa de Jesus', '038.124.195-56', v_cargo_confeiteira, v_unidade_centro, '2021-08-12', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Joao Marcelo Barbosa Queiroz', '141.624.779-30', v_cargo_aux_producao, v_unidade_centro, '2021-11-01', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Josina Augusta de Queiroz Esteves', '980.590.768-68', v_cargo_balconista, v_unidade_centro, '2025-10-03', 1677.60, 'clt', '180h/mes', 'ativo'),
    ('Kenia de Lunas Nascimento', '524.635.498-90', v_cargo_aux_producao, v_unidade_centro, '2023-10-16', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Lais Maria dos Santos Ceu', '062.669.205-90', v_cargo_gerente, v_unidade_centro, '2019-01-08', 3900.00, 'clt', '220h/mes', 'ativo'),
    ('Maria Eduarda da Silva', '502.551.258-10', v_cargo_balconista, v_unidade_centro, '2025-05-13', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Maria Josiele dos Santos Moretti', '030.178.332-24', v_cargo_balconista, v_unidade_centro, '2025-12-12', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Marinalva Dias Santos', '126.841.698-37', v_cargo_aux_limpeza, v_unidade_centro, '2025-02-13', 2050.40, 'clt', '220h/mes', 'ativo'),
    ('Rosilania dos Santos', '075.401.424-05', v_cargo_caixa, v_unidade_centro, '2025-06-18', 1677.60, 'clt', '180h/mes', 'ativo'),
    ('Rosinei da Costa', '266.939.328-43', v_cargo_socia, v_unidade_centro, '1996-01-24', 1621.00, 'socio', NULL, 'ativo'),
    ('Valdirene Azevedo Lima', '090.425.485-25', v_cargo_caixa, v_unidade_centro, '2019-10-07', 2050.40, 'clt', '220h/mes', 'ativo')
  ON CONFLICT DO NOTHING;

END $$;
