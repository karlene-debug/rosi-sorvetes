# Rosi Sorvetes — Arquitetura do Sistema

## 1. Visao Geral

Plataforma de gestao completa para industria artesanal + varejo multi-loja.
Primeiro cliente: Rosi Sorvetes. Objetivo: virar produto SaaS replicavel.

### Contexto do Negocio

- **Donos:** Rosi e Atila (centralizam tudo, sobrecarregados)
- **Objetivo:** Descentralizar gestao, dar clareza nos numeros, permitir expansao
- **Problema atual:** Nenhum controle real. Planilhas soltas, sem processos definidos
- **Meta futura:** Cada loja com fabrica propria + expandir pra N lojas
- **Visao de produto:** SaaS replicavel para outras pequenas industrias + varejo

---

## 2. Estrutura Operacional

```
LOJA 1 (principal - Centro)
├── Fabrica de Sorvete
├── Fabrica de Bolo de Sorvete
├── Balcao / Self-service / iFood
├── ~12 funcionarios
└── CNPJ principal (compra insumos centralizada)

LOJA 2 (Cristo)
├── Fabrica de Sorvete (propria, recente)
├── Balcao / iFood
├── 4 funcionarios (1 gerente, 1 producao, 2 balconistas)
├── CNPJ diferente, estoque separado
└── Recebe insumos via transferencia da Loja 1

LOJAS FUTURAS (N lojas)
└── Podem ter ou nao fabrica propria
```

### Equipe Atual (~16 pessoas + diarista)

| Funcao | Loja 1 | Loja 2 |
|--------|--------|--------|
| Dono(a) | Rosi, Atila | - |
| Gerente | 1 (Lais - pode trocar) | 1 |
| Fabricante sorvete | 1 | 1 |
| Fabricante bolo | 1 | - |
| Caixa/Balconista | ~7 | 2 |
| Limpeza | 1 fixa + diarista | - |

### Fluxo de Insumos

```
Compra centralizada (CNPJ Loja 1)
├── Insumos ficam na Loja 1
└── Transfere parte pra Loja 2
    └── PRECISA registrar pra saber custo real de cada loja
```

> **RECOMENDACAO:** Contabilmente, seria melhor cada CNPJ comprar seus
> proprios insumos, ou formalizar as transferencias como venda/remessa
> entre filiais. Consultar contador sobre a melhor estrutura fiscal.

---

## 3. Catalogo de Produtos (levantado via iFood)

### 3.1 Sorvete

**Tipos de sabor:**

| Tipo | Descricao | Exemplo |
|------|-----------|---------|
| Primario | Produzido do zero na fabrica | Chocolate, Morango, Creme |
| Derivado (montagem) | Montado a partir de primarios | Napolitano = Creme+Morango+Chocolate |
| Zero acucar | Variante especial, preco diferenciado | Zero Acucar - Morango |

**Formatos de venda (iFood):**

| Produto | Preco | Obs |
|---------|-------|-----|
| Caixa 500g (2 sabores) | R$ 29,90 | Cliente escolhe sabores |
| Caixa 1kg (4 sabores) | R$ 49,90 | |
| Caixa 1,5kg (4 sabores) | R$ 59,90 | |
| Caixa 5L tradicional | R$ 87,90 | 1 sabor |
| Caixa 5L especial | R$ 93,90 | 1 sabor |
| Caixa 5L gourmet | R$ 105,00 | |
| Zero Acucar 500g | R$ 29,80-39,95 | Preco mais alto |
| Zero Acucar 1kg | R$ 59,90-79,90 | |

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

### 3.2 Bolo de Sorvete

100% feito de sorvete. Producao apenas na Loja 1.

**Fluxo de producao:**
```
DIA 1 - MONTAGEM
  Saida sorvete do estoque → Monta bolo → Status: PRE-PRONTO (endurecendo)

DIA 2 - FINALIZACAO
  Bolo pre-pronto → Bolo FINALIZADO (pronto pra venda)

VENDA
  Bolo finalizado → Vitrine ou cliente
```

**Sabores e tamanhos (iFood):**

| Sabor | 800g | 1,5kg | 2,5kg |
|-------|------|-------|-------|
| Ferrero Rocher | R$ 63,89 | R$ 116,99 | R$ 205,00 |
| Leite Ninho c/ Morango | R$ 63,99 | R$ 116,99 | R$ 205,00 |
| Ninho Trufado | R$ 63,99 | R$ 116,99 | R$ 205,00 |
| Nutella | - | R$ 205,00 | - |
| Sensacao | - | R$ 116,99 | R$ 180,00 |

**Tipos de estoque:**
- Bolo pre-pronto (montado, endurecendo)
- Bolo finalizado (pronto pra venda)
- Bolo monta-na-hora (pre-pronto → finaliza quando cliente compra)

### 3.3 Acai

Produto proprio com receita/marca Rosi.

```
Barra de acai (fornecedor) → Fabrica processa e reembala → Acai Rosi
```

| Produto | Preco |
|---------|-------|
| Acai 1kg | R$ 39,90 |
| Acai 1,5kg | R$ 54,00 |
| Barra de Acai (processada) | R$ 30,00 |
| Copo P 300ml | R$ 15,00 |
| Copo M 400ml | R$ 19,00 |

### 3.4 Milk Shake

Usa sorvete do estoque como ingrediente.

| Tamanho | Preco |
|---------|-------|
| P 300ml | R$ 15,00 |
| M 500ml | R$ 18,00 |
| G 700ml | R$ 24,00 |

### 3.5 Tacas

| Produto | Preco |
|---------|-------|
| Banana Split | R$ 30,00 |

### 3.6 Caldas Quentes (100g)

| Sabor | Preco |
|-------|-------|
| Chocolate branco c/ Flocos de Arroz | R$ 10,99 |
| Chocolate ao leite | R$ 9,99 |
| Chocolate meio amargo | R$ 9,99 |
| Chocolate Ferrero Rocher | R$ 10,99 |

### 3.7 Coberturas (190g - Marvi, revenda)

| Sabor | Preco |
|-------|-------|
| Morango | R$ 9,50 |
| Chocolate | R$ 9,50 |
| Caramelo | R$ 9,50 |

### 3.8 Complementos (revenda)

| Produto | Preco |
|---------|-------|
| Cascao 10un | R$ 10,00 |
| Cestinha Baunilha 5un | R$ 5,50 |

### 3.9 Descartaveis

| Produto | Preco |
|---------|-------|
| Colherzinha | R$ 0,15 |
| Copo 250ml sorvete | R$ 0,15 |
| Pratinho isopor | R$ 0,20 |
| Copo 180ml bebida | R$ 0,05 |

### 3.10 Bebidas (revenda)

| Produto | Preco |
|---------|-------|
| Coca-Cola Lata 350ml | R$ 5,50 |
| Coca-Cola Pet 600ml | R$ 7,50 |
| Coca-Cola Pet 2L | R$ 15,00 |
| Coca Pet 2L Zero | R$ 15,00 |
| Fanta Guarana 2L | R$ 10,99 |
| Agua sem gas 510ml | R$ 4,00 |
| Agua com gas 510ml | R$ 5,00 |
| Agua 1,5L | R$ 6,00 |

### 3.11 Canais de Venda

| Canal | Loja 1 | Loja 2 |
|-------|--------|--------|
| Balcao self-service (peso) | Sim | Sim |
| PDV (DataCaixa) | Sim | Sim (mesmo sistema) |
| iFood | Sim | Sim |

**Self-service:** PDV registra valor por peso, nao por sabor.
Saida de estoque sera por inventario/estimativa.

---

## 4. Integracoes

### 4.1 DataCaixa (PDV)

**Sistema de caixa usado nas 2 lojas.**

- Site: datacaixa.com.br
- **NAO tem API publica/REST**
- Opcoes de integracao:
  - Exportar relatorios pra Excel (manual)
  - Importacao via arquivo .txt (layout especifico)
  - Acesso direto ao banco local (se tiver acesso ao servidor)
  - "Acompanhamento Online" (sincroniza vendas a cada 30 min, sem API)
- Ja tem integracao nativa com iFood

**Estrategia:** Comecar importando relatorios CSV do DataCaixa (mesmo fluxo que fizemos com Google Sheets). Depois explorar acesso ao banco local.

### 4.2 iFood

- Ambas as lojas vendem pelo iFood
- iFood tem API pra parceiros (pedidos, valores, taxas)
- CNPJ identificado: 01028553000115

---

## 5. Modulos do Sistema

### 5.1 CORE — Unidades e Configuracao

```sql
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('loja', 'fabrica', 'loja_fabrica')),
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  tem_fabrica_sorvete BOOLEAN DEFAULT FALSE,
  tem_fabrica_bolo BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais
INSERT INTO unidades (nome, tipo, tem_fabrica_sorvete, tem_fabrica_bolo) VALUES
  ('Loja Centro', 'loja_fabrica', true, true),
  ('Loja Cristo', 'loja_fabrica', true, false);
```

### 5.2 PRODUTOS — Catalogo Unificado

```sql
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'sorvete', 'bolo', 'acai', 'milkshake', 'taca',
    'calda', 'cobertura', 'complemento', 'descartavel',
    'bebida', 'insumo', 'outros'
  )),
  subcategoria TEXT,
  tipo_producao TEXT CHECK (tipo_producao IN (
    'primario', 'derivado', 'processado', 'revenda'
  )),
  unidade_medida TEXT,
  custo_medio DECIMAL(12,2),
  preco_venda DECIMAL(12,2),
  peso_kg DECIMAL(10,3),
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Receitas de montagem / ficha tecnica
CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_derivado_id UUID REFERENCES produtos(id),
  produto_ingrediente_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 ESTOQUE

```sql
CREATE TABLE movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data TIMESTAMPTZ DEFAULT NOW(),
  produto_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  unidade TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'producao', 'saida', 'transferencia', 'ajuste', 'perda',
    'montagem_saida', 'montagem_entrada'
  )),
  destino TEXT CHECK (destino IN ('balcao', 'montagem', 'transferencia', 'ifood')),
  unidade_origem_id UUID REFERENCES unidades(id),
  unidade_destino_id UUID REFERENCES unidades(id),
  responsavel_id UUID REFERENCES funcionarios(id),
  origem TEXT DEFAULT 'plataforma' CHECK (origem IN (
    'plataforma', 'importado', 'api_pdv', 'api_ifood'
  )),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 PRODUCAO

```sql
CREATE TABLE ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  produto_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3),
  unidade TEXT,
  status TEXT DEFAULT 'em_producao' CHECK (status IN (
    'em_producao', 'endurecendo', 'finalizado', 'cancelado'
  )),
  responsavel_id UUID REFERENCES funcionarios(id),
  unidade_id UUID REFERENCES unidades(id),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ
);
```

### 5.5 FINANCEIRO

```sql
-- Contas a pagar - com centro de custo
CREATE TABLE contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  plano_contas_id UUID REFERENCES plano_contas(id),
  fornecedor_id UUID REFERENCES fornecedores(id),
  unidade_id UUID REFERENCES unidades(id),
  situacao TEXT DEFAULT 'pendente',
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Entradas/Receitas - com unidade e canal
CREATE TABLE entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  unidade_id UUID REFERENCES unidades(id),
  canal TEXT CHECK (canal IN ('balcao', 'ifood', 'encomenda', 'outros')),
  tipo_pagamento TEXT,
  origem TEXT DEFAULT 'plataforma',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 PESSOAS (RH)

```sql
CREATE TABLE cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao_atividades TEXT,
  faixa_salarial_min DECIMAL(12,2),
  faixa_salarial_max DECIMAL(12,2),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo_id UUID REFERENCES cargos(id),
  unidade_id UUID REFERENCES unidades(id),
  data_admissao DATE,
  data_demissao DATE,
  salario DECIMAL(12,2),
  tipo_contrato TEXT CHECK (tipo_contrato IN ('clt', 'diarista', 'socio', 'pj')),
  status TEXT DEFAULT 'ativo',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('falta', 'atestado', 'advertencia', 'atraso', 'outros')),
  descricao TEXT,
  documento_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('vt', 'vr', 'plano_saude', 'outros')),
  valor DECIMAL(12,2),
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE folha_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID REFERENCES funcionarios(id),
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  salario_base DECIMAL(12,2),
  descontos DECIMAL(12,2) DEFAULT 0,
  beneficios DECIMAL(12,2) DEFAULT 0,
  encargos DECIMAL(12,2) DEFAULT 0,
  provisoes DECIMAL(12,2) DEFAULT 0,
  total_custo DECIMAL(12,2),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Perfis de Acesso

| Perfil | Acesso | Quem |
|--------|--------|------|
| Dono/Diretor | Tudo. DRE, custos, RH, config | Rosi, Atila |
| Gerente | Estoque, producao, equipe da unidade, vendas | Gerentes |
| Operador Fabrica | Producao, saidas, montagem | Fabricantes |
| Caixa/Balconista | Consulta estoque (vitrine), registrar saida balcao | Equipe |
| Financeiro | Contas, fornecedores, folha (contador externo) | Contabilidade |

---

## 7. Prioridade de Implementacao

### Fase 1 — Fundacao (AGORA)

- [x] Importacao de dados historicos (CSV)
- [ ] Tabela de unidades (Loja 1 + Loja 2, com flag de fabrica)
- [ ] Migrar sabores → tabela de produtos generica
- [ ] Campo tipo_producao (primario/derivado/processado/revenda)
- [ ] Tabela de receitas (montagem)
- [ ] Migrar movimentacoes pra ter unidade_origem/destino
- [ ] Cadastro completo de produtos (bolos, acai, bebidas, complementos)

### Fase 2 — Operacao Diaria

- [ ] Formulario de montagem (automatiza saida primarios + entrada derivado)
- [ ] Transferencia entre unidades (insumos e produtos)
- [ ] Estoque por unidade (cada loja ve o seu)
- [ ] Producao de bolo (pre-pronto → endurecendo → finalizado)
- [ ] Producao de acai (barra → processamento → produto final)
- [ ] Vitrine digital (balconista ve sabores disponiveis)
- [ ] Alertas de estoque baixo

### Fase 3 — Financeiro Completo

- [ ] Financeiro por unidade/centro de custo
- [ ] DRE por loja + consolidado
- [ ] Importacao de vendas do DataCaixa (CSV/Excel)
- [ ] Integracao iFood (API)
- [ ] Custo de producao por produto (ficha tecnica)
- [ ] Precificacao (custo vs venda vs margem)
- [ ] Controle de transferencia de insumos entre CNPJs

### Fase 4 — Pessoas

- [ ] Cadastro de funcionarios
- [ ] Cargos e descricao de atividades
- [ ] Ocorrencias (faltas, atestados)
- [ ] Beneficios e salarios
- [ ] Folha de pagamento
- [ ] Indicadores (turnover, absenteismo)
- [ ] Custo de pessoal por unidade

### Fase 5 — Escala e Produto

- [ ] Onboarding/guia interativo pros funcionarios
- [ ] Dashboard executivo (visao dono)
- [ ] App mobile pra operacao
- [ ] Relatorios e exportacao
- [ ] Multi-empresa (SaaS - outros clientes)
- [ ] Perfis de acesso com Supabase Auth

---

## 8. Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Graficos | Recharts |
| Backend/DB | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Deploy | Vercel |
| PDV | DataCaixa (sem API, importacao CSV) |
| Delivery | iFood (API disponivel) |

---

## 9. Decisoes Arquiteturais

1. **Tabela `produtos` generica** em vez de `sabores` — suporta sorvete, bolo, acai, bebida, insumo
2. **Cada unidade pode ter fabrica** — flag `tem_fabrica_sorvete/bolo` na unidade
3. **Toda movimentacao tem unidade_origem e unidade_destino** — rastreia tudo entre locais
4. **Receitas como tabela relacional** — um derivado tem N ingredientes com quantidades
5. **Financeiro sempre vinculado a unidade** — DRE separado por loja
6. **Integracoes via origem** — cada registro sabe se veio do sistema, importacao, PDV ou iFood
7. **Perfis de acesso desde o inicio** — cada pessoa ve so o que precisa
8. **Bolo usa ordens de producao** — com status (em_producao/endurecendo/finalizado)
9. **Acai = produto processado** — compra barra, processa, vende com marca propria

---

## 10. Recomendacoes para Rosi

### Contabil/Fiscal
- **Separar compras por CNPJ** — Cada loja deveria comprar seus insumos no proprio CNPJ, ou formalizar transferencias como remessa entre filiais. Consultar contador.
- **Formalizar transferencias** — Toda movimentacao de estoque entre lojas precisa de registro (nota de remessa ou similar).

### Operacional
- **Treinar equipe nos fluxos corretos** — Especialmente montagem: nao dar saida direto no derivado, mas sim nos primarios usados.
- **Inventario semanal** — Comecar com contagem semanal ate ter controle diario confiavel.
- **Padronizar receitas** — Documentar quantidade exata de cada ingrediente por montagem.

### Gestao
- **Definir responsabilidades claras** — Quem faz o que em cada unidade, por escrito.
- **Delegar com ferramentas** — O sistema permite que gerentes controlem sem os donos precisarem estar presentes.
- **Metas por unidade** — Com DRE separado, cada loja tem suas proprias metas de receita/custo.

---

## 11. Pendencias (aguardando Rosi)

- [ ] Lista completa de sabores de montagem e seus ingredientes
- [ ] Confirmar: bolo precisa de 1 dia pra endurecer?
- [ ] Quantos bolos fazem por dia em media
- [ ] Custo medio por balde de sorvete
- [ ] Frequencia de envio de insumos pra Loja 2
- [ ] Produtos vendidos que nao estao no iFood (sundae? casquinha avulsa?)
- [ ] Acesso ao servidor DataCaixa (pra explorar banco de dados)
- [ ] Dores de gestao que ainda nao foram mapeadas
