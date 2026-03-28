import { useMemo, useState } from 'react'
import { IceCream, Search, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import type { StockMovement } from '@/data/stockData'
import { categoriaLabels } from '@/data/productTypes'

interface VitrineDigitalProps {
  produtos: Produto[]
  movements: StockMovement[]
}

// Categorias que aparecem na vitrine (o que o balconista vende pronto)
// Milkshake e taca sao feitos sob demanda, nao ficam na vitrine
const categoriasVitrine: CategoriaProduto[] = [
  'sorvete', 'acai', 'bolo',
]

interface SaborVitrine {
  id: string
  nome: string
  codigo?: string
  categoria: CategoriaProduto
  subcategoria?: string
  saldo: number
  unidade: string
}

export function VitrineDigital({ produtos, movements }: VitrineDigitalProps) {
  const [search, setSearch] = useState('')
  const [mostrarZerados, setMostrarZerados] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaProduto | 'todos'>('todos')

  // Calcular saldo por produto
  const saldoMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of movements) {
      const current = map.get(m.saborId) || 0
      const delta = m.tipo === 'producao' ? m.quantidade : m.tipo === 'saida' ? -m.quantidade : m.quantidade
      map.set(m.saborId, current + delta)
    }
    return map
  }, [movements])

  const sabores: SaborVitrine[] = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && categoriasVitrine.includes(p.categoria))
      .map(p => ({
        id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        categoria: p.categoria,
        subcategoria: p.subcategoria,
        saldo: saldoMap.get(p.id) || 0,
        unidade: p.unidadeMedida,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos, saldoMap]
  )

  const filtered = useMemo(() =>
    sabores.filter(s => {
      if (!mostrarZerados && s.saldo <= 0) return false
      if (categoriaFiltro !== 'todos' && s.categoria !== categoriaFiltro) return false
      if (search) {
        return s.nome.toLowerCase().includes(search.toLowerCase())
      }
      return true
    }),
    [sabores, search, mostrarZerados, categoriaFiltro]
  )

  const disponiveis = sabores.filter(s => s.saldo > 0).length
  const zerados = sabores.filter(s => s.saldo <= 0).length

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const groups: { cat: CategoriaProduto; label: string; items: SaborVitrine[] }[] = []
    for (const cat of categoriasVitrine) {
      const items = filtered.filter(s => s.categoria === cat)
      if (items.length > 0) {
        groups.push({ cat, label: categoriaLabels[cat], items })
      }
    }
    return groups
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header com contadores */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FCE4EC] rounded-lg flex items-center justify-center">
            <IceCream size={20} className="text-[#E91E63]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Vitrine Digital</h3>
            <p className="text-xs text-gray-500">Sabores e produtos disponiveis para o balcao</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{disponiveis}</p>
              <p className="text-[10px] text-gray-500">disponiveis</p>
            </div>
            {zerados > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{zerados}</p>
                <p className="text-[10px] text-gray-500">em falta</p>
              </div>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar sabor..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={e => setCategoriaFiltro(e.target.value as CategoriaProduto | 'todos')}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
          >
            <option value="todos">Todas categorias</option>
            {categoriasVitrine.map(c => (
              <option key={c} value={c}>{categoriaLabels[c]}</option>
            ))}
          </select>
          <button
            onClick={() => setMostrarZerados(!mostrarZerados)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors',
              mostrarZerados ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500'
            )}
          >
            {mostrarZerados ? <Eye size={16} /> : <EyeOff size={16} />}
            Em falta
          </button>
        </div>
      </div>

      {/* Grid de sabores */}
      {grouped.map(group => (
        <div key={group.cat}>
          <h4 className="text-sm font-semibold text-gray-600 mb-2 px-1">{group.label}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {group.items.map(s => (
              <div
                key={s.id}
                className={cn(
                  'rounded-xl border p-3 text-center transition-all',
                  s.saldo <= 0
                    ? 'bg-red-50 border-red-200 opacity-60'
                    : s.saldo <= 2
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-gray-100 hover:border-[#F8BBD0] hover:shadow-sm'
                )}
              >
                <p className="text-sm font-medium text-gray-800 leading-tight mb-1">{s.nome}</p>
                {s.subcategoria && (
                  <p className="text-[10px] text-gray-400 mb-1">
                    {s.subcategoria === 'zero_acucar' ? 'Zero Acucar' :
                     s.subcategoria === 'especial' ? 'Especial' :
                     s.subcategoria === 'montagem_caixa' ? 'Caixa 5L' :
                     s.subcategoria === 'montagem_massa' ? 'Massa' : ''}
                  </p>
                )}
                <div className={cn(
                  'text-lg font-bold',
                  s.saldo <= 0 ? 'text-red-500' : s.saldo <= 2 ? 'text-amber-600' : 'text-green-600'
                )}>
                  {s.saldo <= 0 ? (
                    <span className="flex items-center justify-center gap-1">
                      <AlertTriangle size={14} /> Esgotado
                    </span>
                  ) : (
                    <span>{s.saldo} <span className="text-xs font-normal text-gray-400">{s.unidade}</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
          Nenhum produto encontrado
        </div>
      )}
    </div>
  )
}
