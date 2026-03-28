import { useState, useMemo } from 'react'
import { Plus, Trash2, ClipboardCheck, CheckCircle, Calendar, AlertTriangle, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import type { StockMovement, InventoryCount, InventoryItem } from '@/data/stockData'
import { generateInventoryId } from '@/data/stockData'
import { categoriaLabels } from '@/data/productTypes'

interface InventoryModuleProps {
  produtos: Produto[]
  movements: StockMovement[]
  inventories: InventoryCount[]
  colaboradores: string[]
  onSaveInventory: (inventory: InventoryCount) => void
}

interface CountLine {
  id: number
  produtoId: string
  unidade: string
  contagem: number
}

// Categorias que fazem sentido pra inventario
const categoriasInventario: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
  'complemento', 'descartavel', 'bebida', 'insumo', 'embalagem', 'limpeza',
]

export function InventoryModule({ produtos, movements, inventories, colaboradores, onSaveInventory }: InventoryModuleProps) {
  const [view, setView] = useState<'historico' | 'novo'>('historico')
  const [responsavel, setResponsavel] = useState('')
  const [observacao, setObservacao] = useState('')
  const [items, setItems] = useState<CountLine[]>([
    { id: 1, produtoId: '', unidade: 'Balde', contagem: 0 },
  ])
  const [nextId, setNextId] = useState(2)
  const [showSuccess, setShowSuccess] = useState(false)

  const produtosAtivos = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && categoriasInventario.includes(p.categoria))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos]
  )

  const produtosGrouped = useMemo(() =>
    categoriasInventario
      .map(cat => ({
        cat,
        label: categoriaLabels[cat],
        prods: produtosAtivos.filter(p => p.categoria === cat),
      }))
      .filter(g => g.prods.length > 0),
    [produtosAtivos]
  )

  // Calcular saldo esperado por produto a partir das movimentacoes
  const saldoMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of movements) {
      const current = map.get(m.saborId) || 0
      const delta = m.tipo === 'producao' ? m.quantidade : m.tipo === 'saida' ? -m.quantidade : m.quantidade
      map.set(m.saborId, current + delta)
    }
    return map
  }, [movements])

  const addLine = () => {
    setItems([...items, { id: nextId, produtoId: '', unidade: 'Balde', contagem: 0 }])
    setNextId(nextId + 1)
  }

  const removeLine = (id: number) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateLine = (id: number, field: keyof CountLine, value: string | number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i
      if (field === 'produtoId') {
        const prod = produtosAtivos.find(p => p.id === value)
        return { ...i, produtoId: value as string, unidade: prod?.unidadeMedida || 'Balde' }
      }
      return { ...i, [field]: value }
    }))
  }

  const isValid = responsavel && items.every(i => i.produtoId)

  const handleSubmit = () => {
    if (!isValid) return

    const inventoryItems: InventoryItem[] = items.map(item => {
      const prod = produtosAtivos.find(p => p.id === item.produtoId)!
      const esperado = saldoMap.get(item.produtoId) || 0
      return {
        saborId: item.produtoId,
        sabor: prod.nome,
        unidade: item.unidade as InventoryItem['unidade'],
        contagem: item.contagem,
        esperado,
        divergencia: item.contagem - esperado,
      }
    })

    const inventory: InventoryCount = {
      id: generateInventoryId(),
      data: new Date().toISOString(),
      responsavel,
      itens: inventoryItems,
      observacao: observacao || undefined,
    }

    onSaveInventory(inventory)
    setResponsavel('')
    setObservacao('')
    setItems([{ id: nextId, produtoId: '', unidade: 'Balde', contagem: 0 }])
    setNextId(nextId + 1)
    setShowSuccess(true)
    setView('historico')
    setTimeout(() => setShowSuccess(false), 3000)
  }

  // Indicadores
  const totalInventarios = inventories.length
  const ultimoInventario = inventories.length > 0
    ? [...inventories].sort((a, b) => b.data.localeCompare(a.data))[0]
    : null
  const diasDesdeUltimo = ultimoInventario
    ? Math.floor((Date.now() - new Date(ultimoInventario.data).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const totalDivergencias = inventories.reduce((sum, inv) =>
    sum + inv.itens.filter(i => i.divergencia !== 0).length, 0
  )

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const usedProducts = new Set(items.map(i => i.produtoId).filter(Boolean))

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">Inventario registrado com sucesso!</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total inventarios</p>
          <p className="text-2xl font-bold text-gray-800">{totalInventarios}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Ultimo inventario</p>
          <p className="text-lg font-bold text-gray-800">
            {ultimoInventario ? formatDate(ultimoInventario.data).split(',')[0] : 'Nunca'}
          </p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', diasDesdeUltimo && diasDesdeUltimo > 30 ? 'border-amber-200' : 'border-gray-100')}>
          <p className="text-xs text-gray-500">Dias sem inventario</p>
          <p className={cn('text-2xl font-bold', diasDesdeUltimo && diasDesdeUltimo > 30 ? 'text-amber-600' : 'text-gray-800')}>
            {diasDesdeUltimo !== null ? diasDesdeUltimo : '-'}
          </p>
          {diasDesdeUltimo && diasDesdeUltimo > 30 && (
            <p className="text-xs text-amber-600 mt-0.5">Recomendado: a cada 30 dias</p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Divergencias encontradas</p>
          <p className={cn('text-2xl font-bold', totalDivergencias > 0 ? 'text-red-600' : 'text-green-600')}>
            {totalDivergencias}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('historico')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            view === 'historico' ? 'bg-[#FCE4EC] text-[#E91E63]' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          )}
        >
          <History size={16} />
          Historico
        </button>
        <button
          onClick={() => setView('novo')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            view === 'novo' ? 'bg-[#FCE4EC] text-[#E91E63]' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          )}
        >
          <ClipboardCheck size={16} />
          Novo Inventario
        </button>
      </div>

      {/* Historico */}
      {view === 'historico' && (
        <div className="space-y-4">
          {[...inventories].sort((a, b) => b.data.localeCompare(a.data)).map(inv => {
            const divergentes = inv.itens.filter(i => i.divergencia !== 0)
            return (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{formatDate(inv.data)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Responsavel: {inv.responsavel}</p>
                    {inv.observacao && <p className="text-xs text-gray-400 mt-0.5">{inv.observacao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {inv.itens.length} itens
                    </span>
                    {divergentes.length > 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 flex items-center gap-1">
                        <AlertTriangle size={10} /> {divergentes.length} divergencia(s)
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600">
                        Sem divergencias
                      </span>
                    )}
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase py-2 px-2">Produto</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase py-2 px-2">Contagem</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase py-2 px-2">Esperado</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase py-2 px-2">Divergencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.itens.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-50">
                        <td className="py-2 px-2 text-sm text-gray-700">{item.sabor}</td>
                        <td className="py-2 px-2 text-center text-sm font-medium">{item.contagem}</td>
                        <td className="py-2 px-2 text-center text-sm text-gray-500">{item.esperado}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            item.divergencia === 0 ? 'bg-green-50 text-green-600' :
                            item.divergencia < 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          )}>
                            {item.divergencia > 0 ? '+' : ''}{item.divergencia}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
          {inventories.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Nenhum inventario registrado ainda
            </div>
          )}
        </div>
      )}

      {/* Novo inventario */}
      {view === 'novo' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <ClipboardCheck size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Novo Inventario</h3>
              <p className="text-xs text-gray-500">Conte o estoque fisico e registre. O sistema calcula as divergencias.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel</label>
              <select
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
              >
                <option value="">Selecione...</option>
                {colaboradores.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacao (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Inventario mensal"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-[1fr_100px_140px_40px] gap-3 px-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Produto</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Contagem</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Unidade</span>
              <span></span>
            </div>

            {items.map((item, index) => {
              const selectedProd = produtosAtivos.find(p => p.id === item.produtoId)
              return (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_40px] gap-2 sm:gap-3 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none">
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Produto</span>}
                    <select
                      value={item.produtoId}
                      onChange={e => updateLine(item.id, 'produtoId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
                    >
                      <option value="">Selecione o produto...</option>
                      {produtosGrouped.map(g => (
                        <optgroup key={g.cat} label={g.label}>
                          {g.prods.map(p => (
                            <option key={p.id} value={p.id} disabled={usedProducts.has(p.id) && p.id !== item.produtoId}>
                              {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                              {usedProducts.has(p.id) && p.id !== item.produtoId ? ' (ja adicionado)' : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Contagem</span>}
                    <input
                      type="number"
                      min="0"
                      value={item.contagem}
                      onChange={e => updateLine(item.id, 'contagem', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300 text-center"
                    />
                  </div>
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Unidade</span>}
                    <input
                      type="text"
                      value={selectedProd ? selectedProd.unidadeMedida : item.unidade}
                      readOnly
                      className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-end justify-end sm:justify-center">
                    <button
                      onClick={() => removeLine(item.id)}
                      disabled={items.length <= 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={addLine}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-purple-600 border border-dashed border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-50/30 transition-colors w-full justify-center"
          >
            <Plus size={16} />
            Adicionar mais um produto
          </button>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardCheck size={16} />
              Registrar Inventario
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
