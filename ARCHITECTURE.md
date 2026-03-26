# Rosi Sorvetes — Arquitetura do Sistema

## 1. Visao Geral

Plataforma de gestao completa para industria artesanal + varejo multi-loja.
Primeiro cliente: Rosi Sorvetes. Objetivo: virar produto SaaS replicavel.

### Contexto do Negocio

- **Donos:** Rosi e Atila (centralizam tudo, sobrecarregados)
- **Objetivo:** Descentralizar gestao, dar clareza nos numeros, permitir expansao
- **Problema atual:** Nenhum controle real. Planilhas soltas, sem processos definidos
- **Meta futura:** Manter fabrica unica + expandir pra N lojas

---

## 2. Estrutura Operacional

```
FABRICA (central de producao - dentro da Loja 1)
│
├── Producao de Sorvete
│     ├── Sabores primarios (Chocolate, Morango, Creme...)
│     └── Sabores derivados/montagem (Napolitano, Acai/Leite Ninho...)
│
├── Producao de Bolo de Sorvete
│     ├── Bolo pre-pronto (montado, endurecendo ~1 dia)
│     └── Bolo finalizado (pronto pra venda)
│
├── Transferencia → Loja 1 (mesmo local)
└── Transferencia → Loja 2 (Cristo) + futuras lojas

LOJA 1 (principal)
├── ~10 funcionarios (gerente, caixa, balconistas, limpeza)
├── Venda: balcao self-service (peso), milkshake, bolo, bebidas
├── Canais: PDV + iFood
└── Fabrica fica aqui dentro

LOJA 2 (Cristo)
├── ~1 funcionario
├── Recebe sorvete/bolo da fabrica
├── Canais: PDV (mesmo sistema) + iFood
└── CNPJ diferente, estoque separado

LOJAS FUTURAS (N lojas)
└── Mesmo modelo da Loja 2
```

### Equipe Atual (12 pessoas + diarista)

| Funcao | Unidade | Qtd |
|--------|---------|-----|
| Dono(a) | Geral | 2 (Rosi, Atila) |
| Gerente | Loja 1 | 1 (Lais - pode trocar) |
| Fabricante sorvete | Fabrica | 1 |
| Fabricante bolo | Fabrica | 1 |
| Caixa/Balconista | Loja 1 | ~7 |
| Limpeza | Loja 1 | 1 fixa + diarista |
| Atendente | Loja 2 | 1 |

---

## 3. Produtos e Fluxos

### 3.1 Sorvete

**Tipos de sabor:**

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| Primario | Produzido do zero na fabrica | Chocolate, Morango, Creme |
| Derivado (montagem) | Montado a partir de primarios | Napolitano = Creme+Morango+Chocolate |
| Zero acucar | Variante especial | Zero Acucar - Chocolate |

**Fluxo de producao - Sabor Primario:**
```
Insumos → Producao → Balde no estoque → Saida (balcao/montagem/transferencia)
```

**Fluxo de producao - Sabor Derivado:**
```
1. Saida de primarios (destino: montagem)
2. Montagem do derivado
3. Entrada do derivado no estoque (caixa/balde)
4. Saida pra balcao ou transferencia
```

**Unidades de medida:**
- Balde (padrao)
- Caixa de 5L (montagens)
- Pote de Creme

### 3.2 Bolo de Sorvete

**Fluxo de producao:**
```
DIA 1 - MONTAGEM
  Saida sorvete do estoque → Monta bolo → Status: PRE-PRONTO (endurecendo)

DIA 2 - FINALIZACAO
  Bolo pre-pronto → Bolo FINALIZADO (pronto pra venda)

VENDA
  Bolo finalizado → Cliente (balcao ou encomenda)
```

**Tipos:**
- Bolo pronto (vitrine, venda direta)
- Bolo pre-pronto (monta quando cliente compra)

**Precificacao:**
- Custo: sorvete usado (R$/kg) + insumos + mao de obra
- Venda: R$/kg ou preco fixo por tamanho

### 3.3 Outros Produtos

- Milkshake (usa sorvete do estoque)
- Agua, refrigerante (revenda)
- Acai, sundae, casquinha (confirmar com Rosi)

### 3.4 Canais de Venda

| Canal | Loja 1 | Loja 2 |
|-------|--------|--------|
| Balcao (PDV) | Sim | Sim (mesmo sistema) |
| Self-service (peso) | Sim | Confirmar |
| iFood | Sim | Sim |

**Obs sobre self-service:** O PDV registra valor por peso, nao por sabor.
A saida de estoque do self-service sera por inventario/estimativa, nao por lancamento individual.

---

## 4. Modulos do Sistema

### 4.1 CORE — Unidades e Configuracao

Base de tudo. Sem isso nada funciona direito.

```sql
-- Unidades/locais do negocio
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,              -- 'Fabrica', 'Loja Centro', 'Loja Cristo'
  tipo TEXT NOT NULL,              -- 'fabrica', 'loja'
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais
-- Fabrica, Loja 1 (Centro), Loja 2 (Cristo)
```

### 4.2 PRODUTOS — Sabores, Bolos e Receitas

```sql
-- Produtos (sorvete, bolo, bebida, etc)
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,         -- 'sorvete', 'bolo', 'bebida', 'outros'
  tipo_producao TEXT,              -- 'primario', 'derivado', 'revenda'
  unidade_medida TEXT,             -- 'Balde', 'Caixa de 5L', 'kg', 'unidade'
  custo_medio DECIMAL(12,2),      -- custo medio de producao
  preco_venda DECIMAL(12,2),      -- preco de venda sugerido
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Receitas de montagem / ficha tecnica
CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_derivado_id UUID REFERENCES produtos(id),  -- Napolitano
  produto_ingrediente_id UUID REFERENCES produtos(id), -- Chocolate
  quantidade DECIMAL(10,3) NOT NULL,                   -- 1 balde, 0.5kg, etc
  unidade TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplo: Napolitano = 1 Creme + 1 Morango + 1 Chocolate
```

### 4.3 ESTOQUE

```sql
-- Movimentacoes de estoque (tabela central)
CREATE TABLE movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TIMESTAMPTZ DEFAULT NOW(),
  produto_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  tipo TEXT NOT NULL,               -- 'producao', 'saida', 'transferencia', 'ajuste', 'perda'
  destino TEXT,                     -- 'balcao', 'montagem', 'transferencia'
  unidade_origem_id UUID REFERENCES unidades(id),   -- de onde sai
  unidade_destino_id UUID REFERENCES unidades(id),  -- pra onde vai
  responsavel_id UUID REFERENCES funcionarios(id),
  origem TEXT DEFAULT 'plataforma', -- 'plataforma', 'importado', 'api_pdv', 'api_ifood'
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Estoque atual por unidade (view calculada)
CREATE VIEW vw_estoque_por_unidade AS
  -- Saldo = producao + transferencias_entrada - saidas - transferencias_saida +/- ajustes
  -- Agrupado por produto + unidade
```

**Fluxos de movimentacao:**

| Tipo | Origem | Destino | Exemplo |
|------|--------|---------|---------|
| producao | Fabrica | Fabrica | Produziu 5 baldes de Chocolate |
| saida | Loja | - | Vendeu no balcao |
| transferencia | Fabrica | Loja 2 | Enviou 10 baldes pra Cristo |
| ajuste | Unidade | - | Correcao de inventario |
| perda | Unidade | - | Sorvete estragou |
| montagem_saida | Fabrica | - | Saiu Creme pra montar Napolitano |
| montagem_entrada | Fabrica | - | Entrou Napolitano montado |

### 4.4 PRODUCAO

```sql
-- Ordens de producao (opcional, pra rastrear lotes)
CREATE TABLE ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  produto_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3),
  unidade TEXT,
  status TEXT DEFAULT 'em_producao', -- 'em_producao', 'endurecendo', 'finalizado'
  responsavel_id UUID REFERENCES funcionarios(id),
  unidade_id UUID REFERENCES unidades(id),           -- sempre Fabrica
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ
);

-- Util especialmente pro bolo que tem etapas (montagem → endurecendo → pronto)
```

### 4.5 FINANCEIRO

```sql
-- Plano de contas (ja existe)
-- Fornecedores (ja existe)
-- Custos fixos (ja existe)

-- Contas a pagar - agora com unidade
CREATE TABLE contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  plano_contas_id UUID REFERENCES plano_contas(id),
  fornecedor_id UUID REFERENCES fornecedores(id),
  unidade_id UUID REFERENCES unidades(id),           -- NOVO: centro de custo
  situacao TEXT DEFAULT 'pendente',
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Entradas/Receitas - agora com unidade e canal
CREATE TABLE entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  unidade_id UUID REFERENCES unidades(id),           -- qual loja
  canal TEXT,                                         -- 'balcao', 'ifood'
  tipo_pagamento TEXT,                                -- 'dinheiro', 'pix', 'credito', 'debito'
  origem TEXT DEFAULT 'plataforma',                   -- 'plataforma', 'api_pdv', 'api_ifood'
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- DRE por unidade (view)
CREATE VIEW vw_dre_por_unidade AS
  -- Receita - Custos = Lucro, agrupado por unidade + mes
```

### 4.6 PESSOAS (RH)

```sql
-- Funcionarios
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo_id UUID REFERENCES cargos(id),
  unidade_id UUID REFERENCES unidades(id),           -- onde trabalha
  data_admissao DATE,
  data_demissao DATE,
  salario DECIMAL(12,2),
  tipo_contrato TEXT,              -- 'clt', 'diarista', 'socio', 'pj'
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Cargos e descricao de atividades
CREATE TABLE cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,              -- 'Balconista', 'Caixa', 'Fabricante', 'Gerente'
  descricao_atividades TEXT,       -- texto livre com as atividades do cargo
  faixa_salarial_min DECIMAL(12,2),
  faixa_salarial_max DECIMAL(12,2),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Ocorrencias (faltas, atestados, advertencias)
CREATE TABLE ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  data DATE NOT NULL,
  tipo TEXT NOT NULL,              -- 'falta', 'atestado', 'advertencia', 'atraso', 'outros'
  descricao TEXT,
  documento_url TEXT,              -- foto do atestado, etc
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Beneficios
CREATE TABLE beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  tipo TEXT NOT NULL,              -- 'vt', 'vr', 'plano_saude', 'outros'
  valor DECIMAL(12,2),
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Folha de pagamento mensal
CREATE TABLE folha_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  salario_base DECIMAL(12,2),
  descontos DECIMAL(12,2) DEFAULT 0,    -- faltas, adiantamentos
  beneficios DECIMAL(12,2) DEFAULT 0,   -- VT, VR
  encargos DECIMAL(12,2) DEFAULT 0,     -- FGTS, INSS patronal
  provisoes DECIMAL(12,2) DEFAULT 0,    -- ferias, 13o
  total_custo DECIMAL(12,2),            -- custo total pra empresa
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Indicadores de RH:**
- **Turnover:** admissoes e demissoes / total funcionarios
- **Absenteismo:** dias ausentes / dias uteis
- **Custo de pessoal por unidade**

### 4.7 INTEGRACOES

```
API PDV (sistema de caixa)
├── Puxar vendas automaticamente
├── Receita por forma de pagamento
└── Ambas as lojas (mesmo sistema)

API iFood
├── Pedidos e valores
├── Taxas e comissoes do iFood
├── Ambas as lojas
```

---

## 5. Perfis de Acesso

| Perfil | Acesso | Quem |
|--------|--------|------|
| Dono/Diretor | Tudo. DRE, custos, RH, config | Rosi, Atila |
| Gerente | Estoque, producao, equipe da unidade, vendas | Lais |
| Operador Fabrica | Producao, saidas, montagem | Fabricantes |
| Caixa/Balconista | Consulta estoque (vitrine), registrar saida balcao | Equipe |
| Financeiro | Contas, fornecedores, folha (futuro: contador externo) | Contabilidade |

---

## 6. Prioridade de Implementacao

### Fase 1 — Fundacao (AGORA)
> Sem isso nada funciona direito

- [x] Importacao de dados historicos (CSV)
- [ ] Tabela de unidades (Fabrica, Loja 1, Loja 2)
- [ ] Migrar movimentacoes pra ter unidade_origem/destino
- [ ] Migrar sabores → tabela de produtos generica
- [ ] Campo tipo_producao (primario/derivado) nos produtos
- [ ] Tabela de receitas (montagem)
- [ ] Perfis de acesso basico

### Fase 2 — Operacao Diaria
> Pro dia a dia funcionar

- [ ] Formulario de montagem (automatiza saida primarios + entrada derivado)
- [ ] Transferencia fabrica → lojas
- [ ] Estoque por unidade (cada loja ve o seu)
- [ ] Producao de bolo (pre-pronto → finalizado)
- [ ] Vitrine digital (balconista ve sabores disponiveis)
- [ ] Alertas de estoque baixo

### Fase 3 — Financeiro Completo
> Clareza nos numeros

- [ ] Financeiro por unidade/centro de custo
- [ ] DRE por loja + consolidado
- [ ] Integracao PDV (vendas automaticas)
- [ ] Integracao iFood
- [ ] Custo de producao por produto
- [ ] Precificacao (custo vs venda vs margem)

### Fase 4 — Pessoas
> Gestao de equipe

- [ ] Cadastro de funcionarios
- [ ] Cargos e descricao de atividades
- [ ] Ocorrencias (faltas, atestados)
- [ ] Beneficios e salarios
- [ ] Folha de pagamento
- [ ] Indicadores (turnover, absenteismo)

### Fase 5 — Escala
> Preparar pra crescer

- [ ] Onboarding/guia interativo pros funcionarios
- [ ] Multi-empresa (SaaS)
- [ ] Dashboard executivo (visao dono)
- [ ] App mobile pra operacao
- [ ] Relatorios e exportacao

---

## 7. Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Graficos | Recharts |
| Backend/DB | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Deploy | Vercel |
| Integracoes | API PDV (a descobrir) + API iFood |

---

## 8. Decisoes Arquiteturais

1. **Tabela `produtos` generica** em vez de `sabores` — suporta sorvete, bolo, bebida, qualquer coisa
2. **Toda movimentacao tem unidade_origem e unidade_destino** — rastreia tudo entre locais
3. **Receitas como tabela relacional** — um derivado tem N ingredientes com quantidades
4. **Financeiro sempre vinculado a unidade** — DRE separado por loja
5. **Integracoes via origem** — cada registro sabe se veio do sistema, importacao, PDV ou iFood
6. **Perfis de acesso desde o inicio** — cada pessoa ve so o que precisa
7. **Bolo usa mesmo fluxo de producao** — com campo de status (pre-pronto/finalizado)

---

## 9. Pendencias (aguardando Rosi)

- [ ] Nome do sistema de caixa (PDV) e possibilidade de API
- [ ] Lista completa de sabores de montagem e seus ingredientes
- [ ] Sabores e tipos de bolo
- [ ] Tamanhos e precos de bolo
- [ ] Confirmar: bolo precisa de 1 dia pra endurecer?
- [ ] Quantos bolos fazem por dia em media
- [ ] Custo medio por balde de sorvete
- [ ] Frequencia de envio de sorvete pra Loja 2
- [ ] Outros produtos vendidos (acai, sundae, casquinha?)
- [ ] Dores de gestao que ainda nao foram mapeadas
