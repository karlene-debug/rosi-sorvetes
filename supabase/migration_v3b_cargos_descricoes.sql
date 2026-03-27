-- ============================================
-- ROSI SORVETES - ATUALIZAR DESCRICOES DE CARGO
-- Rodar no Supabase SQL Editor
-- ============================================

-- Atualizar cargos existentes com descricoes completas
UPDATE cargos SET
  descricao_atividades = 'O Balconista é o rosto da Sorveteria Rosi. Responsável pelo atendimento direto, preparo dos pedidos e conservação da área de balcão.

REGRA FUNDAMENTAL: quando há cliente na loja ou pedido pendente, o balconista para o que estiver fazendo e atende. Reposição e limpeza são feitas somente em momentos de baixo movimento.

ATENDIMENTO AO CLIENTE
• Cumprimentar e recepcionar clientes com cordialidade
• Acompanhar o cliente até o caixa após a montagem do pedido
• Preparar pedidos seguindo padrões de montagem e qualidade
• Nunca deixar o balcão sem atendimento
• Limpar mesa imediatamente após saída do cliente
• Monitorar pedidos de delivery, conferindo e enviando os produtos

OPERAÇÃO DO BALCÃO (baixo movimento)
• Reabastecer sorvetes quando balde estiver na metade, dar baixa no estoque ao abrir novo
• Identificar sorvetes com nome legível - nenhum balde sem identificação
• Retirar sorvetes inaptos para venda (moles ou fora do padrão)
• Cada colaborador repõe seu próprio sorvete, sem delegar
• Reabastecer bebidas nos freezers (item novo no fundo)
• Abastecer e organizar geladeira de bolos
• Repor chantilly antes de acabar
• Verificar bandejas de doces: limpar e repor
• Repor guardanapos, sacolas, descartáveis
• Manter suportes de milk shake preparados
• Organizar picolés e realizar pedido às segundas

GESTÃO DE RESERVAS DE BOLOS
• Registrar reserva com: nome do cliente, telefone, data/horário de retirada
• Acompanhar diariamente se pedidos foram retirados
• Cliente não retirou: remover da reserva e ligar (enviar para gerente)
• Manter geladeira organizada por data de retirada

HIGIENE (baixo movimento)
• Lavar louças: taças, copos, colheres e acessórios
• Lavar máquina de açaí e manter casqueira limpa e abastecida
• Regra: sujou, limpou - qualquer respingo é limpo na hora

CONTROLE DE VALIDADE
• Verificar validade de todos os produtos a cada 10 dias
• Incluir na lista de compras insumos acabando
• Seguir normas de armazenagem da nutricionista

ABERTURA E FECHAMENTO
• Abertura: verificar freezers, chantilly, casqueira, montar bandejas
• Fechamento: desligar equipamentos, esvaziar bandejas, repor insumos
• Reportar ocorrências por escrito à Gerência',
  departamento = 'atendimento'
WHERE nome = 'Balconista';

UPDATE cargos SET
  descricao_atividades = 'O Caixa é responsável pela gestão do fluxo de vendas, controle financeiro do turno e operação dos canais de delivery. Atua como suporte ao balcão nos momentos de pico.

REGRA FUNDAMENTAL: o caixa para qualquer atividade administrativa quando há cliente aguardando ou pedido de delivery pendente.

OPERAÇÃO DE CAIXA (diário)
• Registrar todas as vendas no sistema, conferindo valores
• Verificar no início: bobina das maquininhas, papel da impressora, troco mínimo
• Monitorar bobinas de impressão e repor antes que acabem
• Colocar maquininhas para carregar ao final do turno
• Realizar fechamento diário, reportando diferenças à Gerência
• Marcar na lista as contas não pagas no dia

GESTÃO DE DELIVERY
• Monitorar e confirmar pedidos iFood em tempo real
• Garantir fluxo entre balcão/fábrica e entregador sem atraso
• Verificar se plataformas digitais estão atualizadas (fotos, valores, disponibilidade)

APOIO OPERACIONAL (momentos de pico)
• Suporte na montagem de pedidos simples
• Lavagem de utensílios urgentes
• Limpeza rápida de mesas
• Reposição pontual de produtos

RECEBIMENTO DE MERCADORIAS
• Receber e conferir entregas de insumos do balcão
• Comunicar divergências à Gerência

ABERTURA E FECHAMENTO
• Abertura: conferir troco, ligar equipamentos, verificar maquininhas
• Fechamento: fechar caixa, reportar movimento, deixar maquininhas carregando',
  departamento = 'atendimento'
WHERE nome = 'Caixa';

UPDATE cargos SET
  nome = 'Operador de Producao - Sorvetes',
  descricao_atividades = 'Responsável pela fabricação de todos os sorvetes, garantindo padrão de qualidade, conservação dos equipamentos e controle de insumos. É o único responsável pela produção — a loja depende deste cargo.

PRIORIDADE: a fábrica abastece a loja. Quando o balcão sinaliza falta, a produção é prioridade.

PRODUÇÃO (diário)
• Preparar massas conforme receitas padrão da empresa
• Controlar as máquinas durante todo o processo
• Pesar caldas e recheios com precisão
• Garantir padrão de textura, sabor e temperatura
• Registrar diariamente no sistema os sabores e quantidades produzidos (OBRIGATÓRIO)

CONTROLE DE ESTOQUE DA FÁBRICA (diário)
• Monitorar insumos: leite, açúcar, bases, recheios, embalagens, caixas 5L, baldes
• Informar à Gerência com antecedência quando insumo atingir nível mínimo
• Organizar pelo método PEPS (primeiro que vence, primeiro que usa)
• Manter reserva de caixas e baldes organizada

HIGIENE E LIMPEZA (diário)
• Higienizar equipamentos, máquinas, batedores, cubas e utensílios após cada uso
• Manter bancadas, chão e área de trabalho sempre limpos
• Usar obrigatoriamente touca, avental e calçado fechado

SEGURANÇA DOS EQUIPAMENTOS
• Verificar no início do turno se refrigeração está funcionando
• Proibido mover equipamentos ligados
• Reportar anomalias à Gerência imediatamente',
  departamento = 'producao'
WHERE nome = 'Fabricante Sorvete';

UPDATE cargos SET
  nome = 'Confeiteira - Bolos',
  descricao_atividades = 'Responsável pelo preparo completo dos bolos: massas, recheios e decoração final. É a gestora técnica da confeitaria, responsável pela qualidade visual e gastronômica dos produtos.

PRIORIDADE: a confeitaria abastece a geladeira de bolos. Deve planejar produção com antecedência para nunca faltar bolo no balcão.

PRODUÇÃO (diário)
• Preparar massas, recheios e decorações conforme receitas da empresa
• Registrar diariamente no sistema: bolos produzidos, decorados e retirados (OBRIGATÓRIO)
• Monitorar estoque de bolos decorados e sem decorar
• Planejar produção necessária para o dia seguinte
• Garantir produto visualmente impecável e dentro do padrão de sabor

CONTROLE DE INSUMOS (diário)
• Monitorar matérias-primas: farinha, chantilly, frutas, recheios, embalagens, gás
• Reportar à Gerência com antecedência itens atingindo nível mínimo
• Organizar pelo método PEPS

HIGIENE E CONSERVAÇÃO (diário)
• Lavar e higienizar bowls, batedeiras, espátulas, formas após cada uso
• Manter bancada, fornos e área de manipulação limpos e organizados
• Ao terminar, setor deve estar pronto para o próximo turno
• Reportar utensílio danificado imediatamente

SEGURANÇA DOS EQUIPAMENTOS
• Verificar refrigeração no início do turno
• Proibido movimentar equipamentos ligados
• Reportar anomalias imediatamente',
  departamento = 'producao'
WHERE nome = 'Fabricante Bolo';

UPDATE cargos SET
  nome = 'Auxiliar de Limpeza e Higienizacao',
  descricao_atividades = 'Responsável por garantir que a sorveteria esteja sempre limpa, organizada e higienizada. A limpeza pesada é sua responsabilidade — a manutenção do posto durante o turno é de cada colaborador.

PRIORIDADE: limpezas pesadas em áreas de clientes devem ser feitas antes da abertura ou após o fechamento. Durante o funcionamento, foco em manutenção discreta.

ROTINA DE ABERTURA (antes de abrir)
• Limpar fachada, calçada e frente da loja
• Higienizar salão, mesas e cadeiras
• Verificar e repor papel, sabonete e lixeiras dos banheiros

DURANTE O FUNCIONAMENTO
• Manter banheiros limpos e abastecidos ao longo do dia
• Recolher lixo das áreas comuns
• Realizar limpezas discretas sem interferir no atendimento

ROTINA SEMANAL
• Limpeza completa do estoque (pó, caixas, embalagens)
• Limpeza externa dos freezers e geladeiras (cuidado com cabos)
• Lavar todas as lixeiras

FECHAMENTO
• Manutenção geral: salão, banheiros, áreas de apoio
• Colocar lixo para fora nos horários determinados
• Guardar produtos de limpeza — nunca deixar sobre áreas de self-service

SEGURANÇA
• Proibido mover ou tocar cabos de força dos equipamentos
• Cabo solto ou equipamento estranho: reportar à Gerência
• Limpezas pesadas somente com loja vazia',
  departamento = 'limpeza'
WHERE nome = 'Auxiliar de Limpeza';

UPDATE cargos SET
  descricao_atividades = 'Cobertura de folgas da Auxiliar de Limpeza fixa. Segue as mesmas rotinas e padrões de higienização definidos para o cargo de Auxiliar de Limpeza e Higienização.',
  departamento = 'limpeza'
WHERE nome = 'Diarista';

UPDATE cargos SET
  nome = 'Gerente de Loja',
  descricao_atividades = 'O Gerente é a autoridade máxima na operação da loja. Responde pela equipe, processos, qualidade e manutenção. É o elo entre a Diretoria e a equipe operacional.

GESTÃO DE PESSOAS
• Elaborar escalas com pelo menos uma semana de antecedência antes do mês
• Controlar ponto, faltas e atestados, registrando no sistema
• Conduzir triagem inicial de candidatos e coletar documentos
• Zelar pelo cumprimento das normas de conduta
• Abrir a loja nos horários definidos e garantir cobertura em todos os turnos

GESTÃO OPERACIONAL
• Fiscalizar rotinas de abertura, fechamento, limpeza e organização
• Receber e acompanhar prestadores de serviço
• Conferir entregas de grande volume e direcionar para setores corretos
• Identificar necessidades de manutenção, orçar e submeter à Diretoria
• Organizar contas com pagamentos recorrentes

GESTÃO DE QUALIDADE
• Garantir cumprimento das normas de segurança alimentar
• Primeiro ponto de contato para reclamações de clientes
• Enviar relatório diário de ocorrências para a Diretoria

AUTONOMIA: gerir equipe e fluxo operacional. Decisões com custos, contratações finais ou mudanças estruturais devem ser submetidas à Diretoria.',
  departamento = 'gestao'
WHERE nome = 'Gerente';

UPDATE cargos SET
  nome = 'Diretoria Geral - Socia-Fundadora',
  descricao_atividades = 'Responsável pela liderança estratégica, definição da cultura organizacional, padrão de atendimento e decisão final sobre os rumos do negócio. Autoridade máxima.

ESTRATÉGIA E MARCA
• Definição de cardápio, preços, estratégias de venda e posicionamento
• Fiscalização da excelência dos produtos e experiência do cliente
• Contato com fornecedores estratégicos, validando orçamentos
• Representar a marca com cordialidade e carisma

GESTÃO DE PESSOAS (estratégico)
• Definição das regras de conduta, ética e comportamento
• Aprovação final de novos colaboradores após triagem da Gerência
• Palavra final em desligamentos ou faltas graves

GOVERNANÇA
• Orientação contínua à Gerência para atingir metas
• Análise mensal de relatórios de desempenho e resultados financeiros

REGRA: correções operacionais devem ser feitas em particular com o Gerente, para preservar autoridade da Gerência perante a equipe.',
  departamento = 'gestao'
WHERE nome = 'Socio(a)';

-- Criar novos cargos que não existiam
INSERT INTO cargos (nome, departamento, descricao_atividades) VALUES
(
  'Diretoria Financeira e de Processos',
  'administrativo',
  'Responsável pela organização financeira, controle de custos e estruturação dos processos. Atua como apoio estratégico na análise de dados.

GESTÃO FINANCEIRA E ADMINISTRATIVA
• Organização do fluxo de caixa, apuração de resultados e monitoramento de custos
• Validação de notas fiscais, boletos e despesas antes da autorização
• Gerenciamento do sistema de vendas
• Estruturar procedimentos administrativos: compras, pagamentos e arquivos

SUPORTE À GESTÃO E ANÁLISE DE DADOS
• Consolidar dados em indicadores para apresentação à Diretoria Geral
• Supervisionar e direcionar o trabalho da Assistente Administrativa
• Monitorar envio de documentos à contabilidade externa

SEGURANÇA E GOVERNANÇA
• Garantir sigilo das informações financeiras e dados estratégicos
• Manter base de documentos organizada e acessível
• Postura profissional com fornecedores e parceiros

Palavra final em assuntos financeiros e administrativos. Integração direta com a Diretoria Geral.'
),
(
  'Assistente Administrativo',
  'administrativo',
  'Responsável pela organização financeira e documental da empresa. É o braço operacional da gestão — executa, organiza e alimenta os sistemas.

LANÇAMENTOS FINANCEIROS (diário)
• Lançar todas as entradas e saídas na planilha de gestão
• Organizar notas fiscais e boletos por data de vencimento
• Preparar contas a pagar para autorização da Diretoria
• NUNCA realizar pagamentos sem autorização expressa da Diretoria Financeira

CONTROLE DE PESSOAL
• Manter quadro de funcionários atualizado com ocorrências da Gerência
• Sinalizar inconsistências nos dados à Gerência

ORGANIZAÇÃO DOCUMENTAL
• Manter arquivos digitais organizados (notas, contratos, documentos)
• Enviar documentos para contabilidade dentro dos prazos

Subordinação: Diretoria Financeira (Átila). Trabalho autônomo conforme cronograma.'
)
ON CONFLICT (nome) DO NOTHING;
