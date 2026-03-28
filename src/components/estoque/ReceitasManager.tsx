import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Plus, Trash2, Save, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
import type { Produto, ReceitaIngrediente, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'
import * as dbV2 from '@/lib/database_v2'

interface ReceitasManagerProps {
  produtos: Produto[]
  onUpdateRendimento?: (id: string, rendimento: number, rendimentoUnidade: string) => void
}

interface ReceitaLocal {
  produtoIngredienteId: string
  quantidade: number
  unidade: string
}

const unidadesComuns = ['Balde', 'Kg', 'g', 'L', 'ml', 'Unidade', 'Caixa de 5 L', 'Pacote', 'Pote', 'Caixa']

// Categorias de produtos que podem ter receita (produzidos)
const categoriasComReceita: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
]

export function ReceitasManager({ produtos, onUpdateRendimento }: ReceitasManagerProps) {
  const [selectedProdutoId, setSelectedProdutoId] = useState('')
  const [receitas, setReceitas] = useState<ReceitaIngrediente[]>([])
  const [novasLinhas, setNovasLinhas] = useState<ReceitaLocal[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [receitasMap, setReceitasMap] = useState<Record<string, ReceitaIngrediente[]>>({})

  // Rendimento local (enquanto nao salva no banco)
  const [rendimento, setRendimento] = useState(1)
  const [rendimentoUnidade, setRendimentoUnidade] = useState('Balde')

  // Todos os produtos que podem ter receita (produzidos internamente)
  const produtosComReceita = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && categoriasComReceita.includes(p.categoria))
      .sort((a, b) => {
        const catOrder = categoriasComReceita.indexOf(a.categoria) - categoriasComReceita.indexOf(b.categoria)
        if (catOrder !== 0) return catOrder
        return a.nome.localeCompare(b.nome)
      }),
    [produtos]
  )

  // Agrupar por categoria no select
  const produtosGrouped = useMemo(() =>
    categoriasComReceita
      .map(cat => ({
        cat,
        label: categoriaLabels[cat],
        prods: produtosComReceita.filter(p => p.categoria === cat),
      }))
      .filter(g => g.prods.length > 0),
    [produtosComReceita]
  )

  // Todos os produtos podem ser ingredientes (insumos, sorvetes base, etc.)
  const produtosIngredientes = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && p.id !== selectedProdutoId)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos, selectedProdutoId]
  )

  // Agrupar ingredientes por categoria
  const ingredientesGrouped = useMemo(() => {
    const groups: { cat: string; label: string; prods: Produto[] }[] = []
    const catSet = new Set(produtosIngredientes.map(p => p.categoria))
    for (const cat of Array.from(catSet).sort()) {
      groups.push({
        cat,
        label: categoriaLabels[cat] || cat,
        prods: produtosIngredientes.filter(p => p.categoria === cat),
      })
    }
    return groups
  }, [produtosIngredientes])

  // Carregar receita ao selecionar produto
  useEffect(() => {
    if (!selectedProdutoId) {
      setReceitas([])
      setNovasLinhas([])
      return
    }
    const prod = produtos.find(p => p.id === selectedProdutoId)
    if (prod) {
      setRendimento(prod.rendimento || 1)
      setRendimentoUnidade(prod.rendimentoUnidade || prod.unidadeMedida || 'Balde')
    }
    if (receitasMap[selectedProdutoId]) {
      setReceitas(receitasMap[selectedProdutoId])
      setNovasLinhas([])
      return
    }
    setLoading(true)
    setError('')
    dbV2.fetchReceitas(selectedProdutoId)
      .then(data => {
        setReceitas(data)
        setReceitasMap(prev => ({ ...prev, [selectedProdutoId]: data }))
        setNovasLinhas([])
      })
      .catch(() => {
        setError('Erro ao carregar receita. Verifique se a tabela receitas existe no banco.')
        setReceitas([])
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProdutoId])

  const addLinha = () => {
    setNovasLinhas([...novasLinhas, { produtoIngredienteId: '', quantidade: 1, unidade: 'Kg' }])
  }

  const updateLinha = (idx: number, field: keyof ReceitaLocal, value: string | number) => {
    setNovasLinhas(novasLinhas.map((l, i) => {
      if (i !== idx) return l
      if (field === 'produtoIngredienteId') {
        const prod = produtosIngredientes.find(p => p.id === value)
        return { ...l, produtoIngredienteId: value as string, unidade: prod?.unidadeMedida || 'Kg' }
      }
      return { ...l, [field]: value }
    }))
  }

  const removeLinha = (idx: number) => {
    setNovasLinhas(novasLinhas.filter((_, i) => i !== idx))
  }

  const removeExisting = async (id: string) => {
    try {
      await dbV2.deleteReceita(id)
      setReceitas(prev => prev.filter(r => r.id !== id))
      setReceitasMap(prev => ({
        ...prev,
        [selectedProdutoId]: (prev[selectedProdutoId] || []).filter(r => r.id !== id),
      }))
    } catch {
      setError('Erro ao remover ingrediente')
    }
  }

  const salvarNovas = async () => {
    const validas = novasLinhas.filter(l => l.produtoIngredienteId && l.quantidade > 0)
    if (validas.length === 0) return

    setSaving(true)
    setError('')
    try {
      for (const linha of validas) {
        await dbV2.insertReceita({
          produtoDerivatoId: selectedProdutoId,
          produtoIngredienteId: linha.produtoIngredienteId,
          quantidade: linha.quantidade,
          unidade: linha.unidade,
        })
      }
      // Salvar rendimento
      if (onUpdateRendimento) {
        onUpdateRendimento(selectedProdutoId, rendimento, rendimentoUnidade)
      }
      // Recarregar
      const data = await dbV2.fetchReceitas(selectedProdutoId)
      setReceitas(data)
      setReceitasMap(prev => ({ ...prev, [selectedProdutoId]: data }))
      setNovasLinhas([])
    } catch {
      setError('Erro ao salvar receita')
    } finally {
      setSaving(false)
    }
  }

  const salvarRendimento = () => {
    if (onUpdateRendimento && selectedProdutoId) {
      onUpdateRendimento(selectedProdutoId, rendimento, rendimentoUnidade)
    }
  }

  const usedIngredientIds = new Set([
    ...receitas.map(r => r.produtoIngredienteId),
    ...novasLinhas.map(l => l.produtoIngredienteId),
  ])

  const selectedProduto = produtos.find(p => p.id === selectedProdutoId)

  // Visao geral
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewLoaded, setOverviewLoaded] = useState(false)

  const loadOverview = async () => {
    setOverviewLoading(true)
    const map: Record<string, ReceitaIngrediente[]> = {}
    for (const p of produtosComReceita) {
      try {
        const data = await dbV2.fetchReceitas(p.id)
        if (data.length > 0) map[p.id] = data
      } catch {
        // ignora
      }
    }
    setReceitasMap(prev => ({ ...prev, ...map }))
    setOverviewLoaded(true)
    setOverviewLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Receitas de Producao</h3>
            <p className="text-xs text-gray-500">
              Defina os ingredientes e quantidades pra produzir cada produto. Ex: 1 Balde de Napolitano = 0.33 Balde Creme + 0.33 Balde Morango + 0.33 Balde Chocolate
            </p>
          </div>
        </div>

        {produtosComReceita.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhum produto cadastrado. Cadastre produtos na aba Produtos.
          </div>
        ) : (
          <>
            {/* Selector de produto */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <select
                value={selectedProdutoId}
                onChange={e => setSelectedProdutoId(e.target.value)}
                className="w-full sm:w-96 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-300"
              >
                <option value="">Selecione um produto para editar receita...</option>
                {produtosGrouped.map(g => (
                  <optgroup key={g.cat} label={g.label}>
                    {g.prods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Editor de receita */}
            {selectedProdutoId && (
              <div className="border border-gray-100 rounded-lg p-4">
                {/* Rendimento */}
                <div className="mb-4 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <label className="block text-xs font-semibold text-amber-700 uppercase mb-2">
                    Rendimento da receita (esta receita produz)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={rendimento}
                      onChange={e => setRendimento(Math.max(0.01, parseFloat(e.target.value) || 1))}
                      className="w-24 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-center focus:outline-none focus:border-amber-400"
                    />
                    <select
                      value={rendimentoUnidade}
                      onChange={e => setRendimentoUnidade(e.target.value)}
                      className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                    >
                      {unidadesComuns.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <span className="text-sm text-amber-700">de {selectedProduto?.nome}</span>
                    <button
                      onClick={salvarRendimento}
                      className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Ingredientes
                </h4>

                {loading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando receita...
                  </div>
                ) : (
                  <>
                    {/* Ingredientes existentes */}
                    {receitas.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="hidden sm:grid grid-cols-[1fr_80px_120px_40px] gap-2 px-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Ingrediente</span>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Qtd</span>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Unidade</span>
                          <span></span>
                        </div>
                        {receitas.map(r => (
                          <div key={r.id} className="grid grid-cols-[1fr_80px_120px_40px] gap-2 items-center px-1 py-1.5 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-800">{r.produtoIngredienteNome}</span>
                            <span className="text-sm text-gray-600 text-center">{r.quantidade}</span>
                            <span className="text-sm text-gray-600">{r.unidade}</span>
                            <button
                              onClick={() => removeExisting(r.id)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {receitas.length === 0 && novasLinhas.length === 0 && (
                      <p className="text-sm text-gray-400 mb-4">Nenhum ingrediente cadastrado ainda.</p>
                    )}

                    {/* Novas linhas */}
                    {novasLinhas.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {novasLinhas.map((linha, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_120px_40px] gap-2 items-center p-2 sm:p-0">
                            <select
                              value={linha.produtoIngredienteId}
                              onChange={e => updateLinha(idx, 'produtoIngredienteId', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-300"
                            >
                              <option value="">Selecione ingrediente...</option>
                              {ingredientesGrouped.map(g => (
                                <optgroup key={g.cat} label={g.label}>
                                  {g.prods.map(p => (
                                    <option
                                      key={p.id}
                                      value={p.id}
                                      disabled={usedIngredientIds.has(p.id) && p.id !== linha.produtoIngredienteId}
                                    >
                                      {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0.001"
                              step="0.01"
                              value={linha.quantidade}
                              onChange={e => updateLinha(idx, 'quantidade', Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-amber-300"
                            />
                            <select
                              value={linha.unidade}
                              onChange={e => updateLinha(idx, 'unidade', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-300"
                            >
                              {unidadesComuns.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeLinha(idx)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botoes */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={addLinha}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-amber-700 border border-dashed border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50/50 transition-colors"
                      >
                        <Plus size={16} />
                        Adicionar ingrediente
                      </button>
                      {novasLinhas.length > 0 && (
                        <button
                          onClick={salvarNovas}
                          disabled={saving || novasLinhas.every(l => !l.produtoIngredienteId)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Salvar ingredientes
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Visao geral das receitas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700">Visao geral das receitas</h4>
          {!overviewLoaded && (
            <button
              onClick={loadOverview}
              disabled={overviewLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {overviewLoading ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
              Carregar todas
            </button>
          )}
        </div>

        {overviewLoaded ? (
          <div className="space-y-1">
            {produtosComReceita.filter(p => (receitasMap[p.id] || []).length > 0 || expandedId === p.id).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma receita cadastrada ainda.</p>
            )}
            {produtosComReceita.map(p => {
              const rec = receitasMap[p.id] || []
              if (rec.length === 0 && expandedId !== p.id) return null
              const isExpanded = expandedId === p.id
              return (
                <div key={p.id} className="border border-gray-50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{p.nome}</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {rec.length} ingrediente(s)
                      </span>
                      {p.rendimento && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                          rende {p.rendimento} {p.rendimentoUnidade}
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                  </button>
                  {isExpanded && rec.length > 0 && (
                    <div className="px-3 pb-2 space-y-1">
                      {rec.map(r => (
                        <div key={r.id} className="flex items-center gap-3 text-xs text-gray-600 pl-4">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                          <span>{r.produtoIngredienteNome}</span>
                          <span className="text-gray-400">{r.quantidade} {r.unidade}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            Clique em "Carregar todas" para ver quais produtos ja tem receita cadastrada.
          </p>
        )}
      </div>
    </div>
  )
}
