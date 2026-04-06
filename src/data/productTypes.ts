// ============================================
// TIPOS - UNIDADES
// ============================================

export type TipoUnidade = 'loja' | 'fabrica' | 'loja_fabrica'

export interface Unidade {
  id: string
  nome: string
  tipo: TipoUnidade
  cnpj?: string
  endereco?: string
  telefone?: string
  temFabricaSorvete: boolean
  temFabricaBolo: boolean
  status: 'ativo' | 'inativo'
  criadoEm: string
}

// ============================================
// TIPOS - PRODUTOS
// ============================================

export type CategoriaProduto =
  | 'sorvete' | 'bolo' | 'acai' | 'milkshake' | 'taca'
  | 'calda' | 'cobertura' | 'complemento' | 'descartavel'
  | 'bebida' | 'insumo' | 'embalagem' | 'limpeza' | 'outros'

export type SubcategoriaSorvete =
  | 'tradicional' | 'especial' | 'zero_acucar'
  | 'montagem_caixa' | 'montagem_massa'

export type TipoProducao = 'primario' | 'derivado' | 'processado' | 'revenda' | 'consumo_interno'

export interface Produto {
  id: string
  codigo?: string
  nome: string
  categoria: CategoriaProduto
  subcategoria?: SubcategoriaSorvete
  tipoProducao?: TipoProducao
  unidadeMedida: string
  custoMedio?: number
  precoVenda?: number
  pesoKg?: number
  rendimento?: number
  rendimentoUnidade?: string
  status: 'ativo' | 'inativo'
  criadoEm: string
}

// ============================================
// TIPOS - RECEITAS
// ============================================

export interface ReceitaIngrediente {
  id: string
  produtoDerivatoId: string
  produtoIngredienteId: string
  produtoIngredienteNome?: string
  quantidade: number
  unidade: string
}

// ============================================
// TIPOS - MOVIMENTACOES (v2)
// ============================================

export type TipoMovimentacao = 'saida' | 'producao' | 'ajuste' | 'transferencia' | 'perda' | 'montagem_saida' | 'montagem_entrada'
export type DestinoMovimentacao = 'balcao' | 'montagem_massa' | 'montagem' | 'transferencia' | 'ifood'
export type OrigemMovimentacao = 'plataforma' | 'importado' | 'api_pdv' | 'api_ifood'

export interface Movimentacao {
  id: string
  data: string
  produtoId: string
  produtoNome?: string
  produtoCodigo?: string
  quantidade: number
  unidade: string
  tipo: TipoMovimentacao
  destino?: DestinoMovimentacao
  unidadeOrigemId?: string
  unidadeOrigemNome?: string
  unidadeDestinoId?: string
  unidadeDestinoNome?: string
  responsavel: string
  origem: OrigemMovimentacao
  observacao?: string
}

// ============================================
// TIPOS - ORDENS DE PRODUCAO
// ============================================

export type StatusOrdemProducao = 'em_producao' | 'endurecendo' | 'finalizado' | 'cancelado'

export interface OrdemProducao {
  id: string
  data: string
  produtoId: string
  produtoNome?: string
  quantidade: number
  unidade: string
  status: StatusOrdemProducao
  responsavel: string
  unidadeId?: string
  unidadeNome?: string
  observacao?: string
  criadoEm: string
  finalizadoEm?: string
}

// ============================================
// TIPOS - ESTOQUE POR UNIDADE
// ============================================

export interface EstoquePorUnidade {
  produtoId: string
  codigo?: string
  produto: string
  categoria: CategoriaProduto
  subcategoria?: SubcategoriaSorvete
  unidade: string
  unidadeId?: string
  unidadeNome?: string
  saldo: number
}

// ============================================
// LABELS
// ============================================

export const categoriaLabels: Record<CategoriaProduto, string> = {
  sorvete: 'Sorvete',
  bolo: 'Bolo de Sorvete',
  acai: 'Açaí',
  milkshake: 'Milk Shake',
  taca: 'Taça',
  calda: 'Calda Quente',
  cobertura: 'Cobertura',
  complemento: 'Complemento',
  descartavel: 'Descartável',
  bebida: 'Bebida',
  insumo: 'Insumo / Matéria-Prima',
  embalagem: 'Embalagem',
  limpeza: 'Limpeza',
  outros: 'Outros',
}

export const tipoProducaoLabels: Record<TipoProducao, string> = {
  primario: 'Primário (produzido do zero)',
  derivado: 'Derivado (montagem)',
  processado: 'Processado (ex: açaí)',
  revenda: 'Revenda',
  consumo_interno: 'Consumo Interno',
}

export const tipoMovimentacaoLabels: Record<TipoMovimentacao, string> = {
  producao: 'Produção',
  saida: 'Saída',
  transferencia: 'Transferência',
  ajuste: 'Ajuste',
  perda: 'Perda',
  montagem_saida: 'Saída p/ Montagem',
  montagem_entrada: 'Entrada Montagem',
}
