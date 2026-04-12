import { useState } from 'react'
import { Briefcase, Plus, Pencil, Save, X, CheckCircle, ChevronDown, ChevronUp, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cargo } from './PessoasSection'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/Modal'

const departamentoLabels: Record<string, string> = {
  producao: 'Producao',
  atendimento: 'Atendimento',
  administrativo: 'Administrativo',
  limpeza: 'Limpeza',
  gestao: 'Gestao',
}

const deptColors: Record<string, string> = {
  producao: 'bg-blue-50 text-blue-700',
  atendimento: 'bg-pink-50 text-pink-700',
  administrativo: 'bg-purple-50 text-purple-700',
  limpeza: 'bg-cyan-50 text-cyan-700',
  gestao: 'bg-amber-50 text-amber-700',
}

interface CargoManagerProps {
  cargos: Cargo[]
  onUpdate?: () => void
}

type SortField = 'nome' | 'departamento'

export function CargoManager({ cargos: initialCargos, onUpdate }: CargoManagerProps) {
  const [cargos, setCargos] = useState(initialCargos)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [newCargo, setNewCargo] = useState({ nome: '', departamento: 'atendimento', descricaoAtividades: '' })

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />
    return sortDir === 'asc' ? <ArrowUp size={14} className="text-[#E91E63]" /> : <ArrowDown size={14} className="text-[#E91E63]" />
  }

  const sorted = [...cargos].sort((a, b) => {
    let cmp = 0
    if (sortField === 'nome') cmp = a.nome.localeCompare(b.nome)
    else cmp = (a.departamento || '').localeCompare(b.departamento || '')
    return sortDir === 'desc' ? -cmp : cmp
  })

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      await supabase.from('cargos').update({ descricao_atividades: editText }).eq('id', id)
      setCargos(prev => prev.map(c => c.id === id ? { ...c, descricaoAtividades: editText } : c))
      setEditingId(null)
      setShowSuccess('Descricao atualizada!')
      setTimeout(() => setShowSuccess(''), 3000)
    } finally { setSaving(false) }
  }

  const handleCreateCargo = async () => {
    if (!newCargo.nome.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('cargos').insert({
        nome: newCargo.nome.trim(), departamento: newCargo.departamento,
        descricao_atividades: newCargo.descricaoAtividades || null, status: 'ativo',
      }).select().single()
      if (error) throw error
      setCargos(prev => [...prev, {
        id: data.id, nome: data.nome, descricaoAtividades: data.descricao_atividades || undefined,
        departamento: data.departamento || undefined, status: data.status,
      }].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNewCargo({ nome: '', departamento: 'atendimento', descricaoAtividades: '' })
      setShowNewForm(false)
      setShowSuccess('Cargo criado!')
      setTimeout(() => setShowSuccess(''), 3000)
      onUpdate?.()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">{showSuccess}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Cargos</h3>
              <p className="text-xs text-gray-500">{cargos.length} cargo(s) cadastrado(s)</p>
            </div>
          </div>
          <button onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Novo Cargo
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Cargo <SortIcon field="nome" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('departamento')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Departamento <SortIcon field="departamento" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell font-semibold text-gray-600">Descricao</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(c => {
                const isExpanded = expandedId === c.id
                const isEditing = editingId === c.id
                return (
                  <tr key={c.id} className="group">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{c.nome}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.departamento && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', deptColors[c.departamento] || 'bg-gray-100 text-gray-600')}>
                          {departamentoLabels[c.departamento] || c.departamento}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea value={editText} onChange={e => setEditText(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:border-blue-400" rows={6} />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(c.id)} disabled={saving}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                              <Save size={12} /> {saving ? '...' : 'Salvar'}
                            </button>
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
                              <X size={12} /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="text-xs text-gray-500 text-left max-w-sm truncate hover:text-gray-700 flex items-center gap-1">
                          {c.descricaoAtividades
                            ? <>{c.descricaoAtividades.substring(0, 80)}... {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</>
                            : <span className="italic text-gray-300">Sem descricao</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { setEditingId(c.id); setEditText(c.descricaoAtividades || ''); setExpandedId(c.id) }}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Editar descricao">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {/* Descricao expandida (linha extra) */}
              {sorted.map(c => {
                if (expandedId !== c.id || editingId === c.id) return null
                return (
                  <tr key={`exp-${c.id}`} className="bg-gray-50/50">
                    <td colSpan={4} className="px-6 py-4">
                      {c.descricaoAtividades ? (
                        <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                          {c.descricaoAtividades}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Clique no icone de edicao para adicionar descricao.</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
          <span className="text-xs text-gray-400">{cargos.length} cargo(s)</span>
        </div>
      </div>

      {/* Modal novo cargo */}
      <Modal open={showNewForm} onClose={() => setShowNewForm(false)} title="Novo Cargo">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input type="text" value={newCargo.nome} onChange={e => setNewCargo({...newCargo, nome: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300" placeholder="Ex: Auxiliar de Producao" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
              <select value={newCargo.departamento} onChange={e => setNewCargo({...newCargo, departamento: e.target.value})}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300">
                {Object.entries(departamentoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descricao de Atividades</label>
            <textarea value={newCargo.descricaoAtividades} onChange={e => setNewCargo({...newCargo, descricaoAtividades: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300" rows={4} placeholder="Responsabilidades e atividades..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={handleCreateCargo} disabled={!newCargo.nome.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar Cargo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
