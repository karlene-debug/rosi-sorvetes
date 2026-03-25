import { useState } from 'react'
import { Plus, Search, X, IceCream } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Flavor, FlavorCategory, FlavorStatus } from '@/data/stockData'
import { categoryLabels, generateFlavorId } from '@/data/stockData'

interface FlavorManagerProps {
  flavors: Flavor[]
  onAddFlavor: (flavor: Flavor) => void
  onToggleStatus: (id: string) => void
}

export function FlavorManager({ flavors, onAddFlavor, onToggleStatus }: FlavorManagerProps) {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<FlavorCategory | 'todos'>('todos')
  const [filterStatus, setFilterStatus] = useState<FlavorStatus | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<FlavorCategory>('tradicional')

  const filtered = flavors.filter(f => {
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory !== 'todos' && f.categoria !== filterCategory) return false
    if (filterStatus !== 'todos' && f.status !== filterStatus) return false
    return true
  })

  const handleAdd = () => {
    if (!newName.trim()) return
    const exists = flavors.some(f => f.nome.toLowerCase() === newName.trim().toLowerCase())
    if (exists) {
      alert('Esse sabor ja existe!')
      return
    }
    onAddFlavor({
      id: generateFlavorId(),
      nome: newName.trim(),
      categoria: newCategory,
      unidades: newCategory === 'montagem_caixa' ? ['Caixa de 5 L'] : ['Balde'],
      status: 'ativo',
      criadoEm: new Date().toISOString().split('T')[0],
    })
    setNewName('')
    setNewCategory('tradicional')
    setShowForm(false)
  }

  const ativos = flavors.filter(f => f.status === 'ativo').length
  const inativos = flavors.filter(f => f.status === 'inativo').length

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{flavors.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Inativos</p>
          <p className="text-2xl font-bold text-gray-400">{inativos}</p>
        </div>
      </div>

      {/* Filters & actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar sabor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as FlavorCategory | 'todos')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
          >
            <option value="todos">Todas categorias</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FlavorStatus | 'todos')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
          >
            <option value="todos">Todos status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Novo Sabor'}
          </button>
        </div>

        {/* Add flavor form */}
        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <p className="text-sm font-medium text-gray-700 mb-3">Cadastrar novo sabor</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nome do sabor"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
                autoFocus
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as FlavorCategory)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flavors list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Sabor</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Categoria</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Unidades</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(flavor => (
                <tr key={flavor.id} className={cn('hover:bg-gray-50/50', flavor.status === 'inativo' && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <IceCream size={16} className="text-[#E91E63] shrink-0" />
                      <span className="text-sm font-medium text-gray-800">{flavor.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {categoryLabels[flavor.categoria]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-500">{flavor.unidades.join(', ')}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggleStatus(flavor.id)}
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                        flavor.status === 'ativo'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {flavor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum sabor encontrado</div>
          )}
        </div>
      </div>
    </div>
  )
}
