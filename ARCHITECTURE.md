# Rosi Sorvetes — Arquitetura do Sistema

## 1. Visao Geral

Plataforma de gestao completa para industria artesanal + varejo multi-loja.
Primeiro cliente: Rosi Sorvetes. Objetivo: virar produto SaaS replicavel.

**Stack:** React + TypeScript + Vite + Supabase + Vercel

---

## 2. Modulos Implementados

### Dashboard Executivo
- KPIs reais: despesas do mes, variacao vs anterior, produtos ativos, producao/saida do dia
- Grafico de barras: despesas dos ultimos 6 meses
- Grafico pizza: despesas por categoria do plano de contas
- Lista de proximas contas pendentes/atrasadas
- Resumo do negocio (produtos, funcionarios, unidades)

### Estoque (10 abas)
| Aba | Funcao |
|-----|--------|
| Indicadores | Dashboard de estoque com graficos, saldos por produto, top produtos |
| Vitrine | Grid visual pro balconista ver sabores disponiveis (verde/amarelo/vermelho) |
| Alertas | Produtos em risco com dias restantes calculados pela media de saida |
| Saida p/ Balcao | Registrar saida de produtos para o balcao |
| Producao | Registrar producao (desconta ingredientes automaticamente pela receita) |
| Montagem | 1 clique: saida ingredientes + entrada produto derivado |
| Transferencia | Movimentacao entre unidades (Fabrica -> Loja) |
| Receitas | Cadastro de ingredientes com rendimento e unidade livre |
| Inventario | Contagem fisica com calculo de divergencia |
| Historico | Todas movimentacoes com filtro por tipo (producao, saida, montagem, transferencia) |
| Produtos | Catalogo com cadastro, edicao, exclusao protegida, codigo automatico |

### Financeiro (7 abas)
| Aba | Funcao |
|-----|--------|
| Contas a Pagar | CRUD com parcelamento automatico, NF, centro de custo por unidade |
| Entrada NF | Lancar NF de fornecedor: itens com produto/qtd/valor -> estoque + conta a pagar |
| DRE | Demonstrativo de resultado por mes e por loja, comparativo |
| Custo Producao | Custo por produto baseado na receita, margem de lucro |
| Custos Fixos | Despesas recorrentes mensais |
| Fornecedores | Cadastro de fornecedores |
| Plano de Contas | Categorias de despesa (pessoal, custo direto, ocupacao, admin, impostos) |

### Pessoas (4 abas)
| Aba | Funcao |
|-----|--------|
| Funcionarios | Cadastro completo com cargo, unidade, salario, beneficios |
| Cargos | 10 cargos com descricao de atividades editavel |
| Ocorrencias | Registro com periodo inicio/fim (ferias, atestado, advertencia) |
| Ferias | Controle de vencimento e programacao |

---

## 3. Estrutura do Banco (Supabase)

### Tabelas principais
- `unidades` — Loja Centro, Loja Cristo (ambas com fabrica)
- `produtos` — catalogo unificado (sorvetes, bolos, acai, insumos, embalagens, etc.)
- `receitas` — ingredientes de cada produto (quantidade + unidade)
- `movimentacoes` — producao, saida, montagem, transferencia, ajuste
- `ordens_producao` — fluxo de bolos (em_producao -> endurecendo -> finalizado)
- `contas` — contas a pagar com NF, parcelas, centro de custo
- `custos_fixos` — despesas recorrentes
- `plano_contas` — categorias de despesa
- `fornecedores` — cadastro de fornecedores
- `funcionarios` — equipe com cargo, unidade, beneficios
- `cargos` — funcoes com descricao de atividades
- `ocorrencias` — registro de eventos (ferias, atestado, etc.)

### Migrations executadas
- `schema.sql` — tabelas originais (sabores, movimentacoes, colaboradores)
- `migration_v2.sql` — produtos, unidades, receitas, catalogo completo
- `migration_v3_pessoas.sql` — funcionarios, cargos, ocorrencias
- `migration_v3b_cargos.sql` — descricoes de cargo
- `migration_v3c_beneficios_ferias.sql` — beneficios e ferias
- `migration_v4_contas_nf.sql` — NF e centro de custo em contas
- `migration_v5_rendimento.sql` — rendimento de receitas em produtos

---

## 4. Arquivos Chave

```
src/
├── App.tsx                           — roteamento principal + header + seletor unidade
├── components/
│   ├── DashboardExecutivo.tsx        — dashboard com dados reais do Supabase
│   ├── Sidebar.tsx                   — navegacao lateral
│   ├── estoque/
│   │   ├── EstoqueSection.tsx        — hub do estoque (10 abas)
│   │   ├── ProductionForm.tsx        — formulario de producao
│   │   ├── StockExitForm.tsx         — formulario de saida
│   │   ├── MontagemForm.tsx          — montagem automatizada
│   │   ├── TransferenciaForm.tsx     — transferencia entre unidades
│   │   ├── ReceitasManager.tsx       — cadastro de receitas
│   │   ├── VitrineDigital.tsx        — vitrine pro balconista
│   │   ├── AlertasEstoque.tsx        — alertas de estoque baixo
│   │   ├── StockDashboard.tsx        — indicadores de estoque
│   │   ├── InventoryModule.tsx       — inventario fisico
│   │   ├── ProductManager.tsx        — catalogo de produtos
│   │   └── StockMovements.tsx        — historico de movimentacoes
│   ├── financeiro/
│   │   ├── FinanceiroSection.tsx     — hub financeiro (7 abas)
│   │   ├── ContasManager.tsx         — contas a pagar
│   │   ├── EntradaNFManager.tsx      — entrada de nota fiscal
│   │   ├── DREReport.tsx             — DRE por loja
│   │   ├── CustoProducao.tsx         — custo de producao
│   │   ├── CustoFixoManager.tsx      — custos fixos
│   │   ├── FornecedorManager.tsx     — fornecedores
│   │   └── PlanoContasView.tsx       — plano de contas
│   └── pessoas/
│       ├── PessoasSection.tsx        — hub de RH (4 abas)
│       ├── FuncionarioManager.tsx    — funcionarios
│       ├── CargoManager.tsx          — cargos
│       ├── OcorrenciaManager.tsx     — ocorrencias
│       └── FeriasManager.tsx         — ferias
├── data/
│   ├── productTypes.ts              — tipos Produto, Unidade, Movimentacao, etc.
│   ├── financeData.ts               — tipos financeiros + helpers
│   └── stockData.ts                 — tipos legados (StockMovement) + dados historicos
└── lib/
    ├── database.ts                   — funcoes Supabase legadas (sabores)
    ├── database_v2.ts                — funcoes Supabase v2 (produtos, receitas, movimentacoes)
    └── supabase.ts                   — cliente Supabase
```

---

## 5. Pendencias Futuras

### Integracoes
- [ ] Importar vendas do DataCaixa (CSV) — completa receita no DRE
- [ ] Integrar iFood (catalogo + vendas)
- [ ] Leitura de NF por chave de acesso (QR Code)

### Seguranca
- [ ] Perfis de acesso por usuario (admin, gerente, balconista, producao)
- [ ] Login com autenticacao Supabase

### Escala
- [ ] Onboarding/guia interativo
- [ ] Dominio proprio
