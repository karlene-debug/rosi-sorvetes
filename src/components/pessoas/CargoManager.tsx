import { useState } from 'react'
import { Briefcase, ChevronDown, ChevronUp, Plus, Pencil, Save, X, CheckCircle } from 'lucide-react'
import type { Cargo } from './PessoasSection'
import { supabase } from '@/lib/supabase'

const departamentoLabels: Record<string, string> = {
  producao: 'Producao',
  atendimento: 'Atendimento',
  administrativo: 'Administrativo',
  limpeza: 'Limpeza',
  gestao: 'Gestao',
}

interface CargoManagerProps {
  cargos: Cargo[]
  onUpdate?: () => void
}

export function CargoManager({ cargos: initialCargos, onUpdate }: CargoManagerProps) {
  const [cargos, setCargos] = useState(initialCargos)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [showSuccess, setShowSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [newCargo, setNewCargo] = useState({
    nome: '',
    departamento: 'atendimento',
    descricaoAtividades: '',
  })

  const handleExpand = (id: string) => {
    if (expandedId === id && editingId !== id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
    }
  }

  const handleStartEdit = (cargo: Cargo) => {
    setEditingId(cargo.id)
    setEditText(cargo.descricaoAtividades || '')
    setExpandedId(cargo.id)
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('cargos')
        .update({ descricao_atividades: editText })
        .eq('id', id)
      if (error) throw error
      setCargos(prev => prev.map(c =>
        c.id === id ? { ...c, descricaoAtividades: editText } : c
      ))
      setEditingId(null)
      setShowSuccess('Descricao atualizada!')
      setTimeout(() => setShowSuccess(''), 3000)
    } catch (err) {
      console.error('Erro ao atualizar cargo:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCargo = async () => {
    if (!newCargo.nome.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('cargos')
        .insert({
          nome: newCargo.nome.trim(),
          departamento: newCargo.departamento,
          descricao_atividades: newCargo.descricaoAtividades || null,
          status: 'ativo',
        })
        .select()
        .single()
      if (error) throw error
      setCargos(prev => [...prev, {
        id: data.id,
        nome: data.nome,
        descricaoAtividades: data.descricao_atividades || undefined,
        departamento: data.departamento || undefined,
        status: data.status,
      }].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNewCargo({ nome: '', departamento: 'atendimento', descricaoAtividades: '' })
      setShowNewForm(false)
      setShowSuccess('Cargo criado!')
      setTimeout(() => setShowSuccess(''), 3000)
      onUpdate?.()
    } catch (err) {
      console.error('Erro ao criar cargo:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">{showSuccess}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Cargos e Descricao de Atividades</h3>
              <p className="text-xs text-gray-500">{cargos.length} cargo(s) cadastrado(s)</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Novo Cargo
          </button>
        </div>

        {/* Form novo cargo */}
        {showNewForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Cargo *</label>
                <input type="text" value={newCargo.nome} onChange={e => setNewCargo({...newCargo, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300" placeholder="Ex: Auxiliar de Producao" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
                <select value={newCargo.departamento} onChange={e => setNewCargo({...newCargo, departamento: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300">
                  {Object.entries(departamentoLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descricao de Atividades</label>
              <textarea value={newCargo.descricaoAtividades} onChange={e => setNewCargo({...newCargo, descricaoAtividades: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-300" rows={4} placeholder="Descreva as responsabilidades e atividades do cargo..." />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleCreateCargo} disabled={!newCargo.nome.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Criar Cargo'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de cargos */}
        <div className="space-y-2">
          {cargos.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cargo cadastrado. Rode o migration_v3_pessoas.sql.
            </div>
          ) : (
            cargos.map(c => {
              const isExpanded = expandedId === c.id
              const isEditing = editingId === c.id
              return (
                <div key={c.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => handleExpand(c.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                      {c.departamento && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {departamentoLabels[c.departamento] || c.departamento}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar descricao"
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleExpand(c.id)} className="p-1.5">
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                            rows={12}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                              <X size={14} /> Cancelar
                            </button>
                            <button onClick={() => handleSaveEdit(c.id)} disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : c.descricaoAtividades ? (
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {c.descricaoAtividades}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma descricao cadastrada. Clique no icone de edicao para adicionar.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
