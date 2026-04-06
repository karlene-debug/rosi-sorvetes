import { useMemo, useState } from 'react'
import { AlertTriangle, Package, ArrowUp, IceCream, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, EstoquePorUnidade } from '@/data/productTypes'
import type { StockMovement } from '@/data/stockData'

interface StockDashboardProps {
  produtos: Produto[]
  movements: StockMovement[]
  estoque?: EstoquePorUnidade[]
}

const GRUPO_SORVETE = ['sorvete'] as const
const GRUPO_BOLO = ['bolo'] as const
const GRUPO_ACAI = ['acai'] as const
const GRUPO_INSUMO = ['insumo', 'embalagem', 'limpeza'] as const
const GRUPO_OUTROS = ['milkshake', 'taca', 'calda', 'cobertura', 'complemento', 'descartavel', 'bebida', 'outros'] as const
const CAPACIDADE_FILTROS = 30

interface SaldoItem {
  produtoId: string
  nome: string
  codigo?: string
  saldo: number
  unidade: string
}

function getSaldosPorCategoria(estoque: EstoquePorUnidade[], produtos: Produto[], categorias: readonly string[]): SaldoItem[] {
  const saldoMap = new Map<string, SaldoItem>()
  for (const e of estoque) {
    const prod = produtos.find(p => p.id === e.produtoId)
    if (!prod || !categorias.includes(prod.categoria)) continue
    const existing = saldoMap.get(e.produtoId)
    if (existing) { existing.saldo += e.saldo }
    else { saldoMap.set(e.produtoId, { produtoId: e.produtoId, nome: prod.nome, codigo: prod.codigo, saldo: e.saldo, unidade: prod.unidadeMedida }) }
  }
  for (const p of produtos) {
    if (categorias.includes(p.categoria) && p.status === 'ativo' && !saldoMap.has(p.id)) {
      saldoMap.set(p.id, { produtoId: p.id, nome: p.nome, codigo: p.codigo, saldo: 0, unidade: p.unidadeMedida })
    }
  }
  return Array.from(saldoMap.values())
}

type SortCol = 'nome' | 'saldo'

function TabelaEstoque({ titulo, itens, capacidade, corTitulo, icone, compact }: {
  titulo: string; itens: SaldoItem[]; capacidade?: number; corTitulo: string; icone: React.ReactNode; compact?: boolean
}) {
  const [sortCol, setSortCol] = useState<SortCol>('saldo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'saldo' ? 'desc' : 'asc') }
  }

  const sorted = [...itens].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'nome') return a.nome.localeCompare(b.nome) * dir
    return (a.saldo - b.saldo) * dir
  })

  const comEstoque = itens.filter(i => i.saldo > 0).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
      <div className={cn('px-3 py-2.5 border-b border-gray-100 flex items-center justify-between', corTitulo)}>
        <div className="flex items-center gap-2">
          {icone}
          <h3 className="text-xs font-semibold">{titulo}</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {capacidade && (
            <span className={cn('px-1.5 py-0.5 rounded-full font-medium',
              comEstoque >= capacidade ? 'bg-red-100 text-red-700' : comEstoque >= capacidade * 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            )}>{comEstoque}/{capacidade}</span>
          )}
          <span className="text-gray-400">{comEstoque}/{itens.length}</span>
        </div>
      </div>
      {itens.length === 0 ? (
        <div className="p-4 text-center text-[10px] text-gray-400">Vazio</div>
      ) : (
        <div className={cn('overflow-y-auto flex-1', compact ? 'max-h-[500px]' : 'max-h-[400px]')}>
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-2 py-1.5 w-7">#</th>
                <th onClick={() => toggleSort('nome')} className="text-left text-[10px] font-semibold text-gray-500 uppercase px-2 py-1.5 cursor-pointer hover:text-gray-700">
                  <span className="flex items-center gap-0.5">Produto <ArrowUpDown size={8} /></span>
                </th>
                <th onClick={() => toggleSort('saldo')} className="text-center text-[10px] font-semibold text-gray-500 uppercase px-2 py-1.5 w-16 cursor-pointer hover:text-gray-700">
                  <span className="flex items-center justify-center gap-0.5">Qtd <ArrowUpDown size={8} /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((item, idx) => (
                <tr key={item.produtoId} className={cn(
                  'hover:bg-gray-50/50',
                  item.saldo < 0 && 'bg-red-50/30',
                  item.saldo === 0 && 'opacity-40',
                )}>
                  <td className="px-2 py-1 text-[10px] text-gray-400">{idx + 1}</td>
                  <td className="px-2 py-1 text-xs text-gray-800">{item.nome}</td>
                  <td className="px-2 py-1 text-center">
                    <span className={cn('text-xs font-semibold',
                      item.saldo < 0 ? 'text-red-600' : item.saldo === 0 ? 'text-gray-300' : item.saldo <= 2 ? 'text-amber-600' : 'text-gray-800'
                    )}>{item.saldo === 0 ? '-' : item.saldo}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function StockDashboard({ produtos, movements, estoque = [] }: StockDashboardProps) {
  const sorvetes = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_SORVETE), [estoque, produtos])
  const bolos = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_BOLO), [estoque, produtos])
  const acais = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_ACAI), [estoque, produtos])
  const insumos = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_INSUMO), [estoque, produtos])
  const outros = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_OUTROS), [estoque, produtos])

  const allItems = [...sorvetes, ...bolos, ...acais, ...insumos, ...outros]
  const comEstoque = allItems.filter(i => i.saldo > 0).length
  const negativos = allItems.filter(i => i.saldo < 0).length
  const sorvetesAtivos = sorvetes.filter(s => s.saldo > 0).length

  const today = new Date().toISOString().split('T')[0]
  const movHoje = movements.filter(m => m.data.startsWith(today))
  const producaoHoje = movHoje.filter(m => m.tipo === 'producao').reduce((s, m) => s + m.quantidade, 0)
  const saidaHoje = movHoje.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0)

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Sorvetes na vitrine</span>
            <div className="w-8 h-8 bg-[#FCE4EC] rounded-lg flex items-center justify-center"><IceCream size={18} className="text-[#E91E63]" /></div>
          </div>
          <p className={cn('text-2xl font-bold', sorvetesAtivos >= CAPACIDADE_FILTROS ? 'text-red-600' : 'text-gray-800')}>
            {sorvetesAtivos}<span className="text-sm font-normal text-gray-400">/{CAPACIDADE_FILTROS}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">capacidade dos filtros</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Produtos com estoque</span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><Package size={18} className="text-blue-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{comEstoque}</p>
          <p className="text-xs text-gray-500 mt-0.5">de {allItems.length} cadastrados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Produção / Saída hoje</span>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><ArrowUp size={18} className="text-green-600" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green-600">+{producaoHoje}</p>
            <p className="text-lg font-bold text-pink-600">-{saidaHoje}</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">unidades</p>
        </div>
        <div className={cn('bg-white rounded-xl border p-4', negativos > 0 ? 'border-red-200' : 'border-gray-100')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Alertas</span>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', negativos > 0 ? 'bg-red-50' : 'bg-gray-50')}>
              <AlertTriangle size={18} className={negativos > 0 ? 'text-red-500' : 'text-gray-400'} />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', negativos > 0 ? 'text-red-600' : 'text-gray-800')}>{negativos}</p>
          <p className="text-xs text-gray-500 mt-0.5">{negativos > 0 ? 'saldo negativo' : 'tudo em ordem'}</p>
        </div>
      </div>

      {/* Sorvete | Bolo | Acai lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TabelaEstoque titulo="Sorvetes" itens={sorvetes} capacidade={CAPACIDADE_FILTROS}
          corTitulo="bg-[#FCE4EC]/50" icone={<IceCream size={14} className="text-[#E91E63]" />} compact />
        <TabelaEstoque titulo="Bolos de Sorvete" itens={bolos}
          corTitulo="bg-purple-50" icone={<Package size={14} className="text-purple-600" />} compact />
        <TabelaEstoque titulo="Açaí" itens={acais}
          corTitulo="bg-violet-50" icone={<Package size={14} className="text-violet-600" />} compact />
      </div>

      {/* Materia-prima + Outros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TabelaEstoque titulo="Matéria-Prima / Insumos / Embalagens" itens={insumos}
          corTitulo="bg-amber-50" icone={<Package size={14} className="text-amber-600" />} />
        {outros.length > 0 && (
          <TabelaEstoque titulo="Outros Produtos" itens={outros}
            corTitulo="bg-gray-50" icone={<Package size={14} className="text-gray-600" />} />
        )}
      </div>
    </div>
  )
}
