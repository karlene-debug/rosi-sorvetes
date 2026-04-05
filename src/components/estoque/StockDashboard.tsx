import { useMemo } from 'react'
import { AlertTriangle, Package, ArrowUp, IceCream } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, EstoquePorUnidade } from '@/data/productTypes'
import type { StockMovement } from '@/data/stockData'

interface StockDashboardProps {
  produtos: Produto[]
  movements: StockMovement[]
  estoque?: EstoquePorUnidade[]
}

// Categorias agrupadas para as tabelas
const GRUPO_SORVETE = ['sorvete'] as const
const GRUPO_BOLO = ['bolo'] as const
const GRUPO_ACAI = ['acai'] as const
const GRUPO_INSUMO = ['insumo', 'embalagem', 'limpeza'] as const
const GRUPO_OUTROS = ['milkshake', 'taca', 'calda', 'cobertura', 'complemento', 'descartavel', 'bebida', 'outros'] as const

const CAPACIDADE_FILTROS = 30 // capacidade maxima de sabores de sorvete nos filtros

interface SaldoItem {
  produtoId: string
  nome: string
  codigo?: string
  saldo: number
  unidade: string
}

function getSaldosPorCategoria(estoque: EstoquePorUnidade[], produtos: Produto[], categorias: readonly string[]): SaldoItem[] {
  // Agrupar saldos por produto (somar todas as unidades)
  const saldoMap = new Map<string, SaldoItem>()

  for (const e of estoque) {
    const prod = produtos.find(p => p.id === e.produtoId)
    if (!prod || !categorias.includes(prod.categoria)) continue

    const existing = saldoMap.get(e.produtoId)
    if (existing) {
      existing.saldo += e.saldo
    } else {
      saldoMap.set(e.produtoId, {
        produtoId: e.produtoId,
        nome: prod.nome,
        codigo: prod.codigo,
        saldo: e.saldo,
        unidade: prod.unidadeMedida,
      })
    }
  }

  // Incluir produtos dessas categorias que nao tem movimentacao (saldo 0)
  for (const p of produtos) {
    if (categorias.includes(p.categoria) && p.status === 'ativo' && !saldoMap.has(p.id)) {
      saldoMap.set(p.id, {
        produtoId: p.id,
        nome: p.nome,
        codigo: p.codigo,
        saldo: 0,
        unidade: p.unidadeMedida,
      })
    }
  }

  return Array.from(saldoMap.values()).sort((a, b) => {
    // Com estoque primeiro, depois por nome
    if (a.saldo > 0 && b.saldo <= 0) return -1
    if (a.saldo <= 0 && b.saldo > 0) return 1
    return a.nome.localeCompare(b.nome)
  })
}

function TabelaEstoque({ titulo, itens, capacidade, corTitulo, icone }: {
  titulo: string
  itens: SaldoItem[]
  capacidade?: number
  corTitulo: string
  icone: React.ReactNode
}) {
  const comEstoque = itens.filter(i => i.saldo > 0).length
  const total = itens.length

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className={cn('px-4 py-3 border-b border-gray-100 flex items-center justify-between', corTitulo)}>
        <div className="flex items-center gap-2">
          {icone}
          <h3 className="text-sm font-semibold">{titulo}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {capacidade && (
            <span className={cn(
              'px-2 py-0.5 rounded-full font-medium',
              comEstoque >= capacidade ? 'bg-red-100 text-red-700' : comEstoque >= capacidade * 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            )}>
              {comEstoque}/{capacidade} filtros
            </span>
          )}
          <span className="text-gray-500">{comEstoque} com estoque de {total}</span>
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400">Nenhum produto cadastrado nesta categoria.</div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-2 w-10">#</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">Produto</th>
                <th className="text-center text-[10px] font-semibold text-gray-500 uppercase px-4 py-2 w-24">Qtd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itens.map((item, idx) => (
                <tr key={item.produtoId} className={cn(
                  'hover:bg-gray-50/50',
                  item.saldo < 0 && 'bg-red-50/30',
                  item.saldo === 0 && 'opacity-50',
                )}>
                  <td className="px-4 py-1.5 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-1.5">
                    <span className="text-sm text-gray-800">{item.nome}</span>
                    {item.codigo && <span className="text-[10px] text-gray-400 ml-2">{item.codigo}</span>}
                  </td>
                  <td className="px-4 py-1.5 text-center">
                    <span className={cn(
                      'text-sm font-semibold px-2.5 py-0.5 rounded-full',
                      item.saldo < 0 ? 'bg-red-100 text-red-700' :
                      item.saldo === 0 ? 'text-gray-300' :
                      item.saldo <= 2 ? 'bg-amber-100 text-amber-700' :
                      'text-gray-800'
                    )}>
                      {item.saldo === 0 ? '-' : item.saldo}
                    </span>
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
  // Calcular saldos por grupo usando dados reais da view
  const sorvetes = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_SORVETE), [estoque, produtos])
  const bolos = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_BOLO), [estoque, produtos])
  const acais = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_ACAI), [estoque, produtos])
  const insumos = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_INSUMO), [estoque, produtos])
  const outros = useMemo(() => getSaldosPorCategoria(estoque, produtos, GRUPO_OUTROS), [estoque, produtos])

  // KPIs
  const allItems = [...sorvetes, ...bolos, ...acais, ...insumos, ...outros]
  const comEstoque = allItems.filter(i => i.saldo > 0).length
  const negativos = allItems.filter(i => i.saldo < 0).length
  const sorvetesAtivos = sorvetes.filter(s => s.saldo > 0).length

  // Movimentacoes de hoje
  const today = new Date().toISOString().split('T')[0]
  const movHoje = movements.filter(m => m.data.startsWith(today))
  const producaoHoje = movHoje.filter(m => m.tipo === 'producao').reduce((s, m) => s + m.quantidade, 0)
  const saidaHoje = movHoje.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0)

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Sorvetes na vitrine</span>
            <div className="w-8 h-8 bg-[#FCE4EC] rounded-lg flex items-center justify-center">
              <IceCream size={18} className="text-[#E91E63]" />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', sorvetesAtivos >= CAPACIDADE_FILTROS ? 'text-red-600' : 'text-gray-800')}>
            {sorvetesAtivos}<span className="text-sm font-normal text-gray-400">/{CAPACIDADE_FILTROS}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">capacidade dos filtros</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Produtos com estoque</span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{comEstoque}</p>
          <p className="text-xs text-gray-500 mt-0.5">de {allItems.length} cadastrados</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Producao / Saida hoje</span>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <ArrowUp size={18} className="text-green-600" />
            </div>
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
          <p className="text-xs text-gray-500 mt-0.5">{negativos > 0 ? 'produto(s) com saldo negativo' : 'tudo em ordem'}</p>
        </div>
      </div>

      {/* Tabelas por categoria */}
      <TabelaEstoque
        titulo="Sorvetes"
        itens={sorvetes}
        capacidade={CAPACIDADE_FILTROS}
        corTitulo="bg-[#FCE4EC]/50"
        icone={<IceCream size={16} className="text-[#E91E63]" />}
      />

      {bolos.length > 0 && (
        <TabelaEstoque
          titulo="Bolos de Sorvete"
          itens={bolos}
          corTitulo="bg-purple-50"
          icone={<Package size={16} className="text-purple-600" />}
        />
      )}

      {acais.length > 0 && (
        <TabelaEstoque
          titulo="Acai"
          itens={acais}
          corTitulo="bg-violet-50"
          icone={<Package size={16} className="text-violet-600" />}
        />
      )}

      <TabelaEstoque
        titulo="Materia-Prima / Insumos / Embalagens"
        itens={insumos}
        corTitulo="bg-amber-50"
        icone={<Package size={16} className="text-amber-600" />}
      />

      {outros.length > 0 && (
        <TabelaEstoque
          titulo="Outros Produtos"
          itens={outros}
          corTitulo="bg-gray-50"
          icone={<Package size={16} className="text-gray-600" />}
        />
      )}
    </div>
  )
}
