import { useState } from 'react'
import { Plus, Search, X, UserCheck, UserX, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Colaborador } from '@/data/stockData'
import { generateColaboradorId } from '@/data/stockData'

interface ColaboradorManagerProps {
  colaboradores: Colaborador[]
  onAdd: (colaborador: Colaborador) => void
  onToggleStatus: (id: string) => void
}

export function ColaboradorManager({ colaboradores, onAdd, onToggleStatus }: ColaboradorManagerProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = colaboradores.filter(c => {
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false
    return true
  })

  const handleAdd = () => {
    if (!newName.trim()) return
    const exists = colaboradores.some(c => c.nome.toLowerCase() === newName.trim().toLowerCase())
    if (exists) {
      alert('Esse colaborador ja existe!')
      return
    }
    onAdd({
      id: generateColaboradorId(),
      nome: newName.trim(),
      status: 'ativo',
      criadoEm: new Date().toISOString().split('T')[0],
    })
    setNewName('')
    setShowForm(false)
  }

  const ativos = colaboradores.filter(c => c.status === 'ativo').length
  const inativos = colaboradores.filter(c => c.status === 'inativo').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{colaboradores.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={16} className="text-green-500" />
            <p className="text-xs text-gray-500">Ativos</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <UserX size={16} className="text-gray-400" />
            <p className="text-xs text-gray-500">Inativos</p>
          </div>
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
              placeholder="Buscar colaborador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'todos' | 'ativo' | 'inativo')}
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
            {showForm ? 'Cancelar' : 'Novo Colaborador'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <p className="text-sm font-medium text-gray-700 mb-3">Cadastrar novo colaborador</p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Nome do colaborador"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
                autoFocus
              />
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

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Nome</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Desde</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Desativado em</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(c => (
              <tr key={c.id} className={cn('hover:bg-gray-50/50', c.status === 'inativo' && 'opacity-50')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white',
                      c.status === 'ativo' ? 'bg-[#E91E63]' : 'bg-gray-300'
                    )}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                  {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                  {c.desativadoEm ? new Date(c.desativadoEm).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggleStatus(c.id)}
                    className={cn(
                      'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                      c.status === 'ativo'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">Nenhum colaborador encontrado</div>
        )}
      </div>
    </div>
  )
}
