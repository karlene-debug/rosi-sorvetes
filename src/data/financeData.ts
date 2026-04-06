// ============================================
// TIPOS FINANCEIROS
// ============================================

export type TipoCusto = 'fixo' | 'variavel' | 'percentual'
export type GrupoContas = 'gasto_pessoal' | 'custo_direto' | 'ocupacao' | 'administrativo' | 'impostos_financeiro'
export type Condicao = 'necessidade' | 'desejo' | 'financeiro'
export type SituacaoConta = 'pendente' | 'pago' | 'atrasado' | 'cancelado'

export interface PlanoContas {
  id: string
  nome: string
  descricao?: string
  tipoCusto: TipoCusto
  grupo: GrupoContas
  condicao: Condicao
  status: 'ativo' | 'inativo'
}

export interface Fornecedor {
  id: string
  nome: string
  contato?: string
  telefone?: string
  email?: string
  observacao?: string
  status: 'ativo' | 'inativo'
  criadoEm: string
}

export interface CustoFixo {
  id: string
  descricao: string
  valor: number
  diaVencimento: number
  planoContasId?: string
  planoContasNome?: string
  fornecedorId?: string
  fornecedorNome?: string
  status: 'ativo' | 'inativo'
}

export interface Conta {
  id: string
  descricao: string
  valor: number
  dataDocumento?: string
  dataVencimento: string
  dataPagamento?: string
  planoContasId?: string
  planoContasNome?: string
  fornecedorId?: string
  fornecedorNome?: string
  unidadeId?: string
  unidadeNome?: string
  numeroNF?: string
  tipoPagamento?: string
  parcela?: string
  totalParcelas?: number
  situacao: SituacaoConta
  recorrente: boolean
  mesReferencia?: number
  anoReferencia?: number
  origem: 'plataforma' | 'importado'
}

// ============================================
// LABELS
// ============================================

export const grupoLabels: Record<GrupoContas, string> = {
  gasto_pessoal: 'Gasto com Pessoal',
  custo_direto: 'Custos Diretos',
  ocupacao: 'Ocupação',
  administrativo: 'Administrativo',
  impostos_financeiro: 'Impostos e Financeiro',
}

export const tipoCustoLabels: Record<TipoCusto, string> = {
  fixo: 'Fixo',
  variavel: 'Variável',
  percentual: 'Percentual',
}

export const condicaoLabels: Record<Condicao, string> = {
  necessidade: 'Necessidade',
  desejo: 'Desejo',
  financeiro: 'Financeiro',
}

export const situacaoLabels: Record<SituacaoConta, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

// ============================================
// HELPERS
// ============================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')
}

export function isOverdue(vencimento: string, situacao: string): boolean {
  if (situacao === 'pago' || situacao === 'cancelado') return false
  return new Date(vencimento + 'T23:59:59') < new Date()
}

export function getMesAnoAtual(): { mes: number; ano: number } {
  const now = new Date()
  return { mes: now.getMonth() + 1, ano: now.getFullYear() }
}
