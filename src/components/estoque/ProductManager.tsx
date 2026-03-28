import { useState, useMemo } from 'react'
import { Package, Search, ChevronDown, ChevronUp, Eye, EyeOff, Plus, X } from 'lucide-react'
import type { Produto, CategoriaProduto, SubcategoriaSorvete, TipoProducao } from '@/data/productTypes'
import { categoriaLabels, tipoProducaoLabels } from '@/data/productTypes'

const subcategoriaLabels: Record<SubcategoriaSorvete, string> = {
  tradicional: 'Tradicional',
  especial: 'Especial',
  zero_acucar: 'Zero Acucar',
  montagem_caixa: 'Montagem Caixa 5L',
  montagem_massa: 'Montagem Massa',
}

const unidadesMedidaComuns = ['Balde', 'Caixa de 5 L', 'Unidade', 'Kg', 'Litro', 'Pacote', 'Caixa', 'Garrafa', 'Galao', 'Pote']

interface ProductManagerProps {
  produtos: Produto[]
  onToggleStatus: (id: string) => void
  onAdd?: (p: Omit<Produto, 'id' | 'criadoEm'>) => void
}

export function ProductManager({ produtos, onToggleStatus, onAdd }: ProductManagerProps) {
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<CategoriaProduto | 'all'>('all')
  const [showInativos, setShowInativos] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaProduto>('sorvete')
  const [subcategoria, setSubcategoria] = useState<SubcategoriaSorvete | ''>('')
  const [tipoProducao, setTipoProducao] = useState<TipoProducao | ''>('')
  const [unidadeMedida, setUnidadeMedida] = useState('Balde')
  const [precoVenda, setPrecoVenda] = useState('')
  const [custoMedio, setCustoMedio] = useState('')
  const [pesoKg, setPesoKg] = useState('')

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

  const grouped = useMemo(() => {
    const groups: Record<string, Produto[]> = {}
    for (const p of filtered) {
      const key = p.categoria
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const allCategorias = Object.keys(categoriaLabels) as CategoriaProduto[]

  const toggleExpand = (cat: string) => {
    setExpandedCat(expandedCat === cat ? null : cat)
  }

  const resetForm = () => {
    setNome(''); setCodigo(''); setCategoria('sorvete'); setSubcategoria('')
    setTipoProducao(''); setUnidadeMedida('Balde'); setPrecoVenda(''); setCustoMedio(''); setPesoKg('')
    setShowForm(false)
  }

  const handleAdd = () => {
    if (!nome.trim() || !onAdd) return

    const exists = produtos.some(p => p.nome.toLowerCase() === nome.trim().toLowerCase())
    if (exists) {
      alert('Ja existe um produto com esse nome!')
      return
    }

    onAdd({
      nome: nome.trim(),
      codigo: codigo.trim() || undefined,
      categoria,
      subcategoria: (categoria === 'sorvete' && subcategoria) ? subcategoria as SubcategoriaSorvete : undefined,
      tipoProducao: tipoProducao ? tipoProducao as TipoProducao : undefined,
      unidadeMedida,
      precoVenda: precoVenda ? parseFloat(precoVenda) : undefined,
      custoMedio: custoMedio ? parseFloat(custoMedio) : undefined,
      pesoKg: pesoKg ? parseFloat(pesoKg) : undefined,
      status: 'ativo',
    })

    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Catalogo de Produtos</h3>
              <p className="text-xs text-gray-500">{filtered.length} de {produtos.length} produtos</p>
            </div>
          </div>
          {onAdd && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Cancelar' : 'Novo Produto'}
            </button>
          )}
        </div>

        {/* Formulario de cadastro */}
        {showForm && (
          <div className="mb-5 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Cadastrar novo produto</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Leite Condensado"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Codigo</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  placeholder="Ex: MP001"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as CategoriaProduto)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                >
                  {allCategorias.map(c => (
                    <option key={c} value={c}>{categoriaLabels[c]}</option>
                  ))}
                </select>
              </div>
              {categoria === 'sorvete' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subcategoria</label>
                  <select
                    value={subcategoria}
                    onChange={e => setSubcategoria(e.target.value as SubcategoriaSorvete | '')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                  >
                    <option value="">Nenhuma</option>
                    {Object.entries(subcategoriaLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de producao</label>
                <select
                  value={tipoProducao}
                  onChange={e => setTipoProducao(e.target.value as TipoProducao | '')}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                >
                  <option value="">Nenhum</option>
                  {Object.entries(tipoProducaoLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidade de medida *</label>
                <select
                  value={unidadeMedida}
                  onChange={e => setUnidadeMedida(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                >
                  {unidadesMedidaComuns.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preco de venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoVenda}
                  onChange={e => setPrecoVenda(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custo medio (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={custoMedio}
                  onChange={e => setCustoMedio(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Peso (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoKg}
                  onChange={e => setPesoKg(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!nome.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cadastrar Produto
              </button>
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        )}

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
            {allCategorias.map(c => (
              <option key={c} value={c}>{categoriaLabels[c]}</option>
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
                          <span className="text-[10px] text-gray-400">{p.unidadeMedida}</span>
                          {p.tipoProducao && (
                            <span className="text-[10px] text-gray-400">
                              · {tipoProducaoLabels[p.tipoProducao]}
                            </span>
                          )}
                          {p.precoVenda && (
                            <span className="text-[10px] text-green-600">
                              · R$ {p.precoVenda.toFixed(2)}
                            </span>
                          )}
                          {p.custoMedio && (
                            <span className="text-[10px] text-orange-500">
                              · Custo R$ {p.custoMedio.toFixed(2)}
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
