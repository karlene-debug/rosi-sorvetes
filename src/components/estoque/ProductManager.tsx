import { useState, useMemo } from 'react'
import { Package, Search, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels, tipoProducaoLabels } from '@/data/productTypes'

interface ProductManagerProps {
  produtos: Produto[]
  onToggleStatus: (id: string) => void
}

export function ProductManager({ produtos, onToggleStatus }: ProductManagerProps) {
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaProduto | 'all'>('all')
  const [showInativos, setShowInativos] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return produtos.filter(p => {
      if (!showInativos && p.status === 'inativo') return false
      if (categoriaFilter !== 'all' && p.categoria !== categoriaFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return p.nome.toLowerCase().includes(s) ||
          (p.codigo && p.codigo.toLowerCase().includes(s))
      }
      return true
    })
  }, [produtos, search, categoriaFilter, showInativos])

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const groups: Record<string, Produto[]> = {}
    for (const p of filtered) {
      const key = p.categoria
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const categorias = useMemo(() => {
    const cats = new Set(produtos.map(p => p.categoria))
    return Array.from(cats).sort()
  }, [produtos])

  const toggleExpand = (cat: string) => {
    setExpandedCat(expandedCat === cat ? null : cat)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Package size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Catalogo de Produtos</h3>
            <p className="text-xs text-gray-500">{filtered.length} de {produtos.length} produtos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou codigo..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
            />
          </div>
          <select
            value={categoriaFilter}
            onChange={e => setCategoriaFilter(e.target.value as CategoriaProduto | 'all')}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
          >
            <option value="all">Todas categorias</option>
            {categorias.map(c => (
              <option key={c} value={c}>{categoriaLabels[c as CategoriaProduto] || c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowInativos(!showInativos)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors ${
              showInativos ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {showInativos ? <Eye size={16} /> : <EyeOff size={16} />}
            Inativos
          </button>
        </div>

        {/* Lista agrupada */}
        <div className="space-y-2">
          {grouped.map(([cat, prods]) => (
            <div key={cat} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(cat)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {categoriaLabels[cat as CategoriaProduto] || cat}
                  </span>
                  <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                    {prods.length}
                  </span>
                </div>
                {expandedCat === cat ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {expandedCat === cat && (
                <div className="divide-y divide-gray-50">
                  {prods.sort((a, b) => a.nome.localeCompare(b.nome)).map(p => (
                    <div key={p.id} className={`flex items-center justify-between px-4 py-2.5 ${p.status === 'inativo' ? 'opacity-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {p.codigo && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {p.codigo}
                            </span>
                          )}
                          <span className="text-sm text-gray-800 truncate">{p.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.tipoProducao && (
                            <span className="text-[10px] text-gray-400">
                              {tipoProducaoLabels[p.tipoProducao]}
                            </span>
                          )}
                          {p.precoVenda && (
                            <span className="text-[10px] text-green-600">
                              R$ {p.precoVenda.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggleStatus(p.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          p.status === 'ativo'
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
