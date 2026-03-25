import { useState } from 'react'
import { Plus, Trash2, Factory, CheckCircle } from 'lucide-react'
import type { Flavor, UnitType, StockMovement } from '@/data/stockData'
import { colaboradores, generateMovementId } from '@/data/stockData'

interface LineItem {
  id: number
  saborId: string
  quantidade: number
  unidade: UnitType
}

interface ProductionFormProps {
  flavors: Flavor[]
  onSubmit: (movements: StockMovement[]) => void
}

export function ProductionForm({ flavors, onSubmit }: ProductionFormProps) {
  const [responsavel, setResponsavel] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, saborId: '', quantidade: 1, unidade: 'Balde' },
  ])
  const [nextId, setNextId] = useState(2)
  const [showSuccess, setShowSuccess] = useState(false)

  const activeFlavors = flavors.filter(f => f.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome))

  const addLine = () => {
    setItems([...items, { id: nextId, saborId: '', quantidade: 1, unidade: 'Balde' }])
    setNextId(nextId + 1)
  }

  const removeLine = (id: number) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateLine = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i
      if (field === 'saborId') {
        const flavor = activeFlavors.find(f => f.id === value)
        const defaultUnit = flavor?.unidades[0] || 'Balde'
        return { ...i, saborId: value as string, unidade: defaultUnit }
      }
      return { ...i, [field]: value }
    }))
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantidade, 0)
  const isValid = responsavel && items.every(i => i.saborId && i.quantidade > 0)

  const handleSubmit = () => {
    if (!isValid) return

    const now = new Date().toISOString()
    const movements: StockMovement[] = items.map(item => {
      const flavor = activeFlavors.find(f => f.id === item.saborId)!
      return {
        id: generateMovementId(),
        data: now,
        saborId: item.saborId,
        sabor: flavor.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        tipo: 'producao' as const,
        responsavel,
        origem: 'plataforma' as const,
      }
    })

    onSubmit(movements)
    setResponsavel('')
    setItems([{ id: nextId, saborId: '', quantidade: 1, unidade: 'Balde' }])
    setNextId(nextId + 1)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const usedFlavors = new Set(items.map(i => i.saborId).filter(Boolean))

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Producao registrada com sucesso!</p>
            <p className="text-xs text-green-600">{totalItems} item(ns) adicionado(s) ao estoque</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Factory size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Producao Diaria</h3>
            <p className="text-xs text-gray-500">Registre os sorvetes produzidos hoje</p>
          </div>
        </div>

        {/* Responsavel */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel</label>
          <select
            value={responsavel}
            onChange={e => setResponsavel(e.target.value)}
            className="w-full sm:w-64 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
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
            <span className="text-xs font-semibold text-gray-500 uppercase">Sabor</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">Qtd</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">Unidade</span>
            <span></span>
          </div>

          {items.map((item, index) => {
            const selectedFlavor = activeFlavors.find(f => f.id === item.saborId)
            return (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px_40px] gap-2 sm:gap-3 p-3 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none">
                <div>
                  {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Sabor</span>}
                  <select
                    value={item.saborId}
                    onChange={e => updateLine(item.id, 'saborId', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                  >
                    <option value="">Selecione o sabor...</option>
                    {activeFlavors.map(f => (
                      <option key={f.id} value={f.id} disabled={usedFlavors.has(f.id) && f.id !== item.saborId}>
                        {f.nome} {usedFlavors.has(f.id) && f.id !== item.saborId ? '(ja adicionado)' : ''}
                      </option>
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300 text-center"
                  />
                </div>
                <div>
                  {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Unidade</span>}
                  <select
                    value={item.unidade}
                    onChange={e => updateLine(item.id, 'unidade', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                  >
                    {selectedFlavor ? (
                      selectedFlavor.unidades.map(u => <option key={u} value={u}>{u}</option>)
                    ) : (
                      <>
                        <option value="Balde">Balde</option>
                        <option value="Caixa de 5 L">Caixa de 5 L</option>
                        <option value="Pote de Creme">Pote de Creme</option>
                      </>
                    )}
                  </select>
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

        <button
          onClick={addLine}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-blue-600 border border-dashed border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50/30 transition-colors w-full justify-center"
        >
          <Plus size={16} />
          Adicionar mais um sabor
        </button>

        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{items.filter(i => i.saborId).length}</span> sabor(es) · <span className="font-medium">{totalItems}</span> unidade(s) total
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Factory size={16} />
            Registrar Producao
          </button>
        </div>
      </div>
    </div>
  )
}
