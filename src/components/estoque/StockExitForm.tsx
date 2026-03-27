import { useState } from 'react'
import { Plus, Trash2, Send, CheckCircle } from 'lucide-react'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'

interface LineItem {
  id: number
  produtoId: string
  quantidade: number
  unidade: string
}

interface StockExitFormProps {
  produtos: Produto[]
  colaboradores: string[]
  onSubmit: (items: { produtoId: string; produtoNome: string; quantidade: number; unidade: string }[]) => void
}

// Categorias que saem para o balcao
const categoriasSaida: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
  'complemento', 'descartavel', 'bebida',
]

export function StockExitForm({ produtos, colaboradores, onSubmit }: StockExitFormProps) {
  const [responsavel, setResponsavel] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, produtoId: '', quantidade: 1, unidade: 'Balde' },
  ])
  const [nextId, setNextId] = useState(2)
  const [showSuccess, setShowSuccess] = useState(false)

  const produtosAtivos = produtos
    .filter(p => p.status === 'ativo' && categoriasSaida.includes(p.categoria))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const grouped = categoriasSaida
    .map(cat => ({
      cat,
      label: categoriaLabels[cat],
      prods: produtosAtivos.filter(p => p.categoria === cat),
    }))
    .filter(g => g.prods.length > 0)

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

  const totalItems = items.reduce((sum, i) => sum + i.quantidade, 0)
  const isValid = responsavel && items.every(i => i.produtoId && i.quantidade > 0)

  const handleSubmit = () => {
    if (!isValid) return

    const submitItems = items.map(item => {
      const prod = produtosAtivos.find(p => p.id === item.produtoId)!
      return {
        produtoId: item.produtoId,
        produtoNome: prod.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        responsavel,
      }
    })

    onSubmit(submitItems)
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
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <CheckCircle size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Saida registrada com sucesso!</p>
            <p className="text-xs text-green-600">{totalItems} item(ns) enviado(s) para o balcao</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-[#FCE4EC] rounded-lg flex items-center justify-center">
            <Send size={20} className="text-[#E91E63]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Saida para Balcao</h3>
            <p className="text-xs text-gray-500">Registre os produtos levados do estoque para o balcao</p>
          </div>
        </div>

        {/* Responsavel */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel</label>
          <select
            value={responsavel}
            onChange={e => setResponsavel(e.target.value)}
            className="w-full sm:w-64 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
          >
            <option value="">Selecione seu nome...</option>
            {colaboradores.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Items */}
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
                  >
                    <option value="">Selecione o produto...</option>
                    {grouped.map(g => (
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
                  {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Quantidade</span>}
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={e => updateLine(item.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] text-center"
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
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add line button */}
        <button
          onClick={addLine}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-[#E91E63] border border-dashed border-[#F8BBD0] rounded-lg text-sm font-medium hover:bg-[#FCE4EC]/30 transition-colors w-full justify-center"
        >
          <Plus size={16} />
          Adicionar mais um produto
        </button>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{items.filter(i => i.produtoId).length}</span> produto(s) · <span className="font-medium">{totalItems}</span> unidade(s) total
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Registrar Saida
          </button>
        </div>
      </div>
    </div>
  )
}
