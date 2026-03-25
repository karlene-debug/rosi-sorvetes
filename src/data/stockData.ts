// ============================================
// TIPOS
// ============================================

export type FlavorCategory = 'tradicional' | 'especial' | 'zero_acucar' | 'montagem_caixa' | 'montagem_massa'
export type FlavorStatus = 'ativo' | 'inativo'
export type UnitType = 'Balde' | 'Caixa de 5 L' | 'Pote de Creme'
export type MovementType = 'saida' | 'producao' | 'ajuste'
export type MovementOrigin = 'plataforma' | 'importado'

export interface Flavor {
  id: string
  nome: string
  categoria: FlavorCategory
  unidades: UnitType[]
  status: FlavorStatus
  criadoEm: string
}

export interface StockMovement {
  id: string
  data: string
  saborId: string
  sabor: string
  quantidade: number
  unidade: UnitType
  tipo: MovementType
  responsavel: string
  origem: MovementOrigin
  observacao?: string
}

export type ColaboradorStatus = 'ativo' | 'inativo'

export interface Colaborador {
  id: string
  nome: string
  status: ColaboradorStatus
  criadoEm: string
  desativadoEm?: string
}

export interface InventoryCount {
  id: string
  data: string
  responsavel: string
  itens: InventoryItem[]
  observacao?: string
}

export interface InventoryItem {
  saborId: string
  sabor: string
  unidade: UnitType
  contagem: number
  esperado: number
  divergencia: number
}

export interface StockBalance {
  saborId: string
  sabor: string
  categoria: FlavorCategory
  balde: number
  caixa5l: number
  poteCreme: number
}

// ============================================
// CATEGORIAS
// ============================================

export const categoryLabels: Record<FlavorCategory, string> = {
  tradicional: 'Tradicional',
  especial: 'Especial',
  zero_acucar: 'Zero Acucar',
  montagem_caixa: 'Montagem Caixa 5L',
  montagem_massa: 'Montagem Massa',
}

// ============================================
// SABORES (cadastro mestre - baseado nos forms reais)
// ============================================

let nextFlavorId = 50

export function generateFlavorId(): string {
  return `flavor_${nextFlavorId++}`
}

export const initialFlavors: Flavor[] = [
  // Tradicionais
  { id: 'flavor_1', nome: 'Acai', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_2', nome: 'Abacaxi ao Vinho', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_3', nome: 'Ameixa', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_4', nome: 'Amendoim', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_5', nome: 'Blue Ice', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_6', nome: 'Chocolate', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_7', nome: 'Chocolate 70%', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_8', nome: 'Chocomenta', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_9', nome: 'Coco', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_10', nome: 'Creme', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_11', nome: 'Cupuacu', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_12', nome: 'Danone', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_13', nome: 'Ferrero Rocher', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_14', nome: 'Flocos', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_15', nome: 'Folhado Doce de Leite', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_16', nome: 'Iogurte c/ Frutas Vermelhas', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_17', nome: 'Iogurte s/ Recheio', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_18', nome: 'Kinder Ovo', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_19', nome: 'Kit Kat', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_20', nome: 'Laka', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_21', nome: 'Leite Ninho Trufado', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_22', nome: 'Leite Ninho', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_23', nome: 'Limao', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_24', nome: 'Merengue de Morango', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_25', nome: 'Milho Verde', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_26', nome: 'Morango', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_27', nome: 'Mousse Choc. c/ Amendoa', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_28', nome: 'Mousse Maracuja', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_29', nome: 'Nozes', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_30', nome: 'Nutella', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_31', nome: 'Ovomaltine', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_32', nome: 'Passas ao Rum', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_33', nome: 'Pistache', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_34', nome: 'Sensacao', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_35', nome: 'Sonho de Moca', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_36', nome: 'Torta de Limao', categoria: 'especial', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_37', nome: 'Uva', categoria: 'tradicional', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  // Zero acucar
  { id: 'flavor_38', nome: 'Zero Acucar - Chocolate', categoria: 'zero_acucar', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_39', nome: 'Zero Acucar - Morango', categoria: 'zero_acucar', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_40', nome: 'Zero Acucar - Mousse de Maracuja', categoria: 'zero_acucar', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_41', nome: 'Zero Acucar - Torta de Limao', categoria: 'zero_acucar', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  // Montagem Caixa 5L
  { id: 'flavor_42', nome: 'Chocolate com Laka', categoria: 'montagem_caixa', unidades: ['Caixa de 5 L'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_43', nome: 'Ferrero Rocher / Leite Ninho Trufado', categoria: 'montagem_caixa', unidades: ['Caixa de 5 L'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_44', nome: 'Iogurte Frutas Verm. / Leite Ninho Trufado', categoria: 'montagem_caixa', unidades: ['Caixa de 5 L'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_45', nome: 'Napolitano', categoria: 'montagem_caixa', unidades: ['Caixa de 5 L'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_46', nome: 'Sensacao com Flocos', categoria: 'montagem_caixa', unidades: ['Caixa de 5 L'], status: 'ativo', criadoEm: '2024-01-01' },
  // Montagem Massa
  { id: 'flavor_47', nome: 'Acai / Leite Ninho', categoria: 'montagem_massa', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_48', nome: 'Charge', categoria: 'montagem_massa', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'flavor_49', nome: 'Nata / Pave', categoria: 'montagem_massa', unidades: ['Balde'], status: 'ativo', criadoEm: '2024-01-01' },
]

// ============================================
// COLABORADORES
// ============================================

let nextColaboradorId = 20

export function generateColaboradorId(): string {
  return `colab_${nextColaboradorId++}`
}

export const initialColaboradores: Colaborador[] = [
  { id: 'colab_1', nome: 'Rose', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_2', nome: 'Bernardo', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_3', nome: 'Valdirene', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_4', nome: 'Joao', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_5', nome: 'Yago', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_6', nome: 'Rosi', status: 'ativo', criadoEm: '2024-01-01' },
  { id: 'colab_7', nome: 'Kenia', status: 'ativo', criadoEm: '2024-01-01' },
]

// Manter compatibilidade - lista simples de nomes ativos
export function getActiveColaboradores(colaboradores: Colaborador[]): string[] {
  return colaboradores.filter(c => c.status === 'ativo').map(c => c.nome).sort()
}

// ============================================
// INVENTARIOS
// ============================================

let nextInventoryId = 10

export function generateInventoryId(): string {
  return `inv_${nextInventoryId++}`
}

export const initialInventories: InventoryCount[] = [
  {
    id: 'inv_1',
    data: '2024-12-15T09:00:00',
    responsavel: 'Rosi',
    itens: [
      { saborId: 'flavor_6', sabor: 'Chocolate', unidade: 'Balde', contagem: 5, esperado: 7, divergencia: -2 },
      { saborId: 'flavor_26', sabor: 'Morango', unidade: 'Balde', contagem: 3, esperado: 3, divergencia: 0 },
      { saborId: 'flavor_30', sabor: 'Nutella', unidade: 'Balde', contagem: 2, esperado: 4, divergencia: -2 },
      { saborId: 'flavor_10', sabor: 'Creme', unidade: 'Balde', contagem: 6, esperado: 6, divergencia: 0 },
    ],
    observacao: 'Inventario de fim de ano',
  },
  {
    id: 'inv_2',
    data: '2025-01-20T08:30:00',
    responsavel: 'Valdirene',
    itens: [
      { saborId: 'flavor_6', sabor: 'Chocolate', unidade: 'Balde', contagem: 8, esperado: 8, divergencia: 0 },
      { saborId: 'flavor_21', sabor: 'Leite Ninho Trufado', unidade: 'Balde', contagem: 4, esperado: 5, divergencia: -1 },
      { saborId: 'flavor_13', sabor: 'Ferrero Rocher', unidade: 'Balde', contagem: 3, esperado: 3, divergencia: 0 },
    ],
    observacao: 'Inventario mensal janeiro',
  },
  {
    id: 'inv_3',
    data: '2025-02-18T09:15:00',
    responsavel: 'Rosi',
    itens: [
      { saborId: 'flavor_6', sabor: 'Chocolate', unidade: 'Balde', contagem: 10, esperado: 10, divergencia: 0 },
      { saborId: 'flavor_26', sabor: 'Morango', unidade: 'Balde', contagem: 5, esperado: 6, divergencia: -1 },
      { saborId: 'flavor_14', sabor: 'Flocos', unidade: 'Balde', contagem: 7, esperado: 7, divergencia: 0 },
    ],
    observacao: 'Inventario mensal fevereiro',
  },
]

// ============================================
// MOVIMENTACOES HISTORICAS (simulando dados importados de 2024)
// ============================================

function generateHistoricalData(): StockMovement[] {
  const movements: StockMovement[] = []
  let id = 1

  const saboresPopulares = [
    { id: 'flavor_21', nome: 'Leite Ninho Trufado' },
    { id: 'flavor_13', nome: 'Ferrero Rocher' },
    { id: 'flavor_16', nome: 'Iogurte c/ Frutas Vermelhas' },
    { id: 'flavor_10', nome: 'Creme' },
    { id: 'flavor_26', nome: 'Morango' },
    { id: 'flavor_30', nome: 'Nutella' },
    { id: 'flavor_6', nome: 'Chocolate' },
    { id: 'flavor_14', nome: 'Flocos' },
    { id: 'flavor_20', nome: 'Laka' },
    { id: 'flavor_31', nome: 'Ovomaltine' },
    { id: 'flavor_34', nome: 'Sensacao' },
    { id: 'flavor_36', nome: 'Torta de Limao' },
    { id: 'flavor_1', nome: 'Acai' },
    { id: 'flavor_9', nome: 'Coco' },
    { id: 'flavor_22', nome: 'Leite Ninho' },
    { id: 'flavor_35', nome: 'Sonho de Moca' },
    { id: 'flavor_28', nome: 'Mousse Maracuja' },
    { id: 'flavor_18', nome: 'Kinder Ovo' },
    { id: 'flavor_33', nome: 'Pistache' },
    { id: 'flavor_25', nome: 'Milho Verde' },
  ]

  const responsaveis = ['Rose', 'Valdirene', 'Joao', 'Yago', 'Bernardo', 'Kenia']

  // Gerar dados de Jun 2024 a Mar 2025
  for (let month = 5; month <= 14; month++) {
    const realMonth = month <= 11 ? month : month - 12
    const year = month <= 11 ? 2024 : 2025
    const daysInMonth = new Date(year, realMonth + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      // 3-8 producoes por dia
      const numProducoes = 3 + Math.floor(Math.random() * 6)
      for (let p = 0; p < numProducoes; p++) {
        const sabor = saboresPopulares[Math.floor(Math.random() * saboresPopulares.length)]
        const hora = 6 + Math.floor(Math.random() * 4)
        movements.push({
          id: `mov_${id++}`,
          data: `${year}-${String(realMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
          saborId: sabor.id,
          sabor: sabor.nome,
          quantidade: 1 + Math.floor(Math.random() * 4),
          unidade: 'Balde',
          tipo: 'producao',
          responsavel: responsaveis[Math.floor(Math.random() * responsaveis.length)],
          origem: 'importado',
        })
      }

      // 4-10 saidas por dia
      const numSaidas = 4 + Math.floor(Math.random() * 7)
      for (let s = 0; s < numSaidas; s++) {
        const sabor = saboresPopulares[Math.floor(Math.random() * saboresPopulares.length)]
        const hora = 10 + Math.floor(Math.random() * 10)
        movements.push({
          id: `mov_${id++}`,
          data: `${year}-${String(realMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
          saborId: sabor.id,
          sabor: sabor.nome,
          quantidade: 1 + Math.floor(Math.random() * 3),
          unidade: 'Balde',
          tipo: 'saida',
          responsavel: responsaveis[Math.floor(Math.random() * responsaveis.length)],
          origem: 'importado',
        })
      }
    }
  }

  return movements
}

export const initialMovements: StockMovement[] = generateHistoricalData()

// ============================================
// FUNCOES AUXILIARES
// ============================================

export function calcularSaldo(movements: StockMovement[], flavors: Flavor[]): StockBalance[] {
  const balanceMap = new Map<string, StockBalance>()

  // Inicializar com todos os sabores ativos
  flavors.filter(f => f.status === 'ativo').forEach(f => {
    balanceMap.set(f.id, {
      saborId: f.id,
      sabor: f.nome,
      categoria: f.categoria,
      balde: 0,
      caixa5l: 0,
      poteCreme: 0,
    })
  })

  // Calcular saldo por movimentacao
  movements.forEach(m => {
    const balance = balanceMap.get(m.saborId)
    if (!balance) return

    const delta = m.tipo === 'producao' ? m.quantidade : m.tipo === 'saida' ? -m.quantidade : m.quantidade
    if (m.unidade === 'Balde') balance.balde += delta
    else if (m.unidade === 'Caixa de 5 L') balance.caixa5l += delta
    else if (m.unidade === 'Pote de Creme') balance.poteCreme += delta
  })

  return Array.from(balanceMap.values()).sort((a, b) => a.sabor.localeCompare(b.sabor))
}

export function getTopFlavors(movements: StockMovement[], limit: number = 10): { sabor: string; total: number }[] {
  const saidas = movements.filter(m => m.tipo === 'saida')
  const counts = new Map<string, number>()
  saidas.forEach(m => {
    counts.set(m.sabor, (counts.get(m.sabor) || 0) + m.quantidade)
  })
  return Array.from(counts.entries())
    .map(([sabor, total]) => ({ sabor, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function getMovementsByPeriod(movements: StockMovement[], days: number): StockMovement[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return movements.filter(m => new Date(m.data) >= cutoff)
}

export function getMonthlyStats(movements: StockMovement[]) {
  const stats = new Map<string, { producao: number; saida: number }>()

  movements.forEach(m => {
    const monthKey = m.data.substring(0, 7) // YYYY-MM
    if (!stats.has(monthKey)) stats.set(monthKey, { producao: 0, saida: 0 })
    const s = stats.get(monthKey)!
    if (m.tipo === 'producao') s.producao += m.quantidade
    else if (m.tipo === 'saida') s.saida += m.quantidade
  })

  return Array.from(stats.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => ({
      mes: formatMonth(mes),
      mesKey: mes,
      ...data,
    }))
}

function formatMonth(key: string): string {
  const [year, month] = key.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`
}

let nextMovementId = 100000
export function generateMovementId(): string {
  return `mov_${nextMovementId++}`
}
