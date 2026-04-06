import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowRightLeft, CheckCircle } from 'lucide-react'
import type { Produto, Unidade, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'

interface LineItem {
  id: number
  produtoId: string
  quantidade: number
  unidade: string
}

interface TransferenciaFormProps {
  produtos: Produto[]
  unidades: Unidade[]
  colaboradores: string[]
  onSubmit: (data: {
    origemId: string
    destinoId: string
    responsavel: string
    itens: { produtoId: string; produtoNome: string; quantidade: number; unidade: string }[]
  }) => void
}

const categoriasTransferencia: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
  'complemento', 'descartavel', 'bebida', 'insumo', 'embalagem', 'limpeza',
]

export function TransferenciaForm({ produtos, unidades, colaboradores, onSubmit }: TransferenciaFormProps) {
  const [origemId, setOrigemId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, produtoId: '', quantidade: 1, unidade: 'Balde' },
  ])
  const [nextId, setNextId] = useState(2)
  const [showSuccess, setShowSuccess] = useState(false)

  const activeUnidades = unidades.filter(u => u.status === 'ativo')

  const produtosAtivos = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && categoriasTransferencia.includes(p.categoria))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos]
  )

  const grouped = useMemo(() =>
    categoriasTransferencia
      .map(cat => ({
        cat,
        label: categoriaLabels[cat],
        prods: produtosAtivos.filter(p => p.categoria === cat),
      }))
      .filter(g => g.prods.length > 0),
    [produtosAtivos]
  )

  const addLine = () => {
    setItems([...items, { id: nextId, produtoId: '', quantidade: 1, unidade: 'Balde' }])
    setNextId(nextId + 1)
  }

  const removeLine = (id: number) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateLine = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i
      if (field === 'produtoId') {
        const prod = produtosAtivos.find(p => p.id === value)
        return { ...i, produtoId: value as string, unidade: prod?.unidadeMedida || 'Balde' }
      }
      return { ...i, [field]: value }
    }))
  }

  const origemNome = activeUnidades.find(u => u.id === origemId)?.nome
  const destinoNome = activeUnidades.find(u => u.id === destinoId)?.nome
  const totalItems = items.reduce((sum, i) => sum + i.quantidade, 0)
  const isValid = origemId && destinoId && origemId !== destinoId && responsavel && items.every(i => i.produtoId && i.quantidade > 0)

  const handleSubmit = () => {
    if (!isValid) return

    const submitItens = items.map(item => {
      const prod = produtosAtivos.find(p => p.id === item.produtoId)!
      return {
        produtoId: item.produtoId,
        produtoNome: prod.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
      }
    })

    onSubmit({
      origemId,
      destinoId,
      responsavel,
      itens: submitItens,
    })

    setOrigemId('')
    setDestinoId('')
    setResponsavel('')
    setItems([{ id: nextId, produtoId: '', quantidade: 1, unidade: 'Balde' }])
    setNextId(nextId + 1)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const usedProducts = new Set(items.map(i => i.produtoId).filter(Boolean))

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Transferência registrada com sucesso!</p>
            <p className="text-xs text-green-600">{totalItems} item(ns) transferido(s)</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
            <ArrowRightLeft size={20} className="text-cyan-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Transferência entre Unidades</h3>
            <p className="text-xs text-gray-500">Registre a movimentacao de produtos entre Fabrica e Lojas</p>
          </div>
        </div>

        {activeUnidades.length < 2 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Cadastre pelo menos 2 unidades para fazer transferencias.
          </div>
        ) : (
          <>
            {/* Origem / Destino / Responsavel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Origem *</label>
                <select
                  value={origemId}
                  onChange={e => setOrigemId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cyan-300"
                >
                  <option value="">Selecione...</option>
                  {activeUnidades.filter(u => u.id !== destinoId).map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-center pb-2">
                <ArrowRightLeft size={20} className="text-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Destino *</label>
                <select
                  value={destinoId}
                  onChange={e => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cyan-300"
                >
                  <option value="">Selecione...</option>
                  {activeUnidades.filter(u => u.id !== origemId).map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {origemId && destinoId && origemId === destinoId && (
              <div className="mb-4 text-xs text-red-500">Origem e destino nao podem ser iguais.</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel</label>
              <select
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cyan-300"
              >
                <option value="">Selecione...</option>
                {colaboradores.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Itens */}
            <div className="space-y-3">
              <div className="hidden sm:grid grid-cols-[1fr_100px_140px_40px] gap-3 px-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Produto</span>
                <span className="text-xs font-semibold text-gray-500 uppercase">Qtd</span>
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
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cyan-300"
                      >
                        <option value="">Selecione o produto...</option>
                        {grouped.map(g => (
                          <optgroup key={g.cat} label={g.label}>
                            {g.prods.map(p => (
                              <option key={p.id} value={p.id} disabled={usedProducts.has(p.id) && p.id !== item.produtoId}>
                                {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Qtd</span>}
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={e => updateLine(item.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-cyan-300"
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
              className="mt-3 flex items-center gap-2 px-4 py-2 text-cyan-600 border border-dashed border-cyan-200 rounded-lg text-sm font-medium hover:bg-cyan-50/30 transition-colors w-full justify-center"
            >
              <Plus size={16} />
              Adicionar mais um produto
            </button>

            {/* Preview */}
            {origemNome && destinoNome && items.some(i => i.produtoId) && (
              <div className="mt-4 p-3 bg-cyan-50/50 rounded-lg border border-cyan-100 text-sm text-cyan-700">
                <strong>{origemNome}</strong> → <strong>{destinoNome}</strong>: {items.filter(i => i.produtoId).length} produto(s), {totalItems} unidade(s)
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{items.filter(i => i.produtoId).length}</span> produto(s) · <span className="font-medium">{totalItems}</span> unidade(s) total
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft size={16} />
                Registrar Transferência
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
