import { useState } from 'react'
import { Plus, X, Search, Edit2, MapPin, Phone, FileText, Factory, Store, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Unidade, TipoUnidade } from '@/data/productTypes'
import { Modal } from './Modal'

interface UnidadeManagerProps {
  unidades: Unidade[]
  onAdd: (u: Omit<Unidade, 'id' | 'criadoEm'>) => Promise<void>
  onUpdate: (id: string, u: Partial<Unidade>) => Promise<void>
  onToggleStatus: (id: string) => Promise<void>
}

const tipoLabels: Record<TipoUnidade, string> = {
  loja: 'Loja',
  fabrica: 'Fabrica',
  loja_fabrica: 'Loja + Fabrica',
}

type SortField = 'nome' | 'tipo' | 'status'
type SortDir = 'asc' | 'desc'

export function UnidadeManager({ unidades, onAdd, onUpdate, onToggleStatus }: UnidadeManagerProps) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Form fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoUnidade>('loja')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [temFabricaSorvete, setTemFabricaSorvete] = useState(false)
  const [temFabricaBolo, setTemFabricaBolo] = useState(false)

  const resetForm = () => {
    setNome(''); setTipo('loja'); setCnpj(''); setEndereco(''); setTelefone('')
    setTemFabricaSorvete(false); setTemFabricaBolo(false)
    setEditId(null); setShowForm(false)
  }

  const openEdit = (u: Unidade) => {
    setEditId(u.id)
    setNome(u.nome)
    setTipo(u.tipo)
    setCnpj(u.cnpj || '')
    setEndereco(u.endereco || '')
    setTelefone(u.telefone || '')
    setTemFabricaSorvete(u.temFabricaSorvete)
    setTemFabricaBolo(u.temFabricaBolo)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await onUpdate(editId, {
          nome: nome.trim(), tipo, cnpj: cnpj.trim() || undefined,
          endereco: endereco.trim() || undefined, telefone: telefone.trim() || undefined,
          temFabricaSorvete, temFabricaBolo,
        })
      } else {
        await onAdd({
          nome: nome.trim(), tipo, cnpj: cnpj.trim() || undefined,
          endereco: endereco.trim() || undefined, telefone: telefone.trim() || undefined,
          temFabricaSorvete, temFabricaBolo, status: 'ativo',
        })
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />
    return sortDir === 'asc' ? <ArrowUp size={14} className="text-[#E91E63]" /> : <ArrowDown size={14} className="text-[#E91E63]" />
  }

  const filtered = unidades
    .filter(u => !search || u.nome.toLowerCase().includes(search.toLowerCase()) || (u.cnpj || '').includes(search))
    .sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'nome': cmp = a.nome.localeCompare(b.nome); break
        case 'tipo': cmp = (tipoLabels[a.tipo] || '').localeCompare(tipoLabels[b.tipo] || ''); break
        case 'status': cmp = a.status.localeCompare(b.status); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            placeholder="Ex: Loja Shopping" autoFocus />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoUnidade)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
            {Object.entries(tipoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CNPJ</label>
          <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
          <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            placeholder="(00) 00000-0000" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Endereco</label>
          <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            placeholder="Rua, numero, bairro, cidade" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={temFabricaSorvete} onChange={e => setTemFabricaSorvete(e.target.checked)}
            className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63]" />
          <span className="text-sm text-gray-700">Fabrica sorvete</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={temFabricaBolo} onChange={e => setTemFabricaBolo(e.target.checked)}
            className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63]" />
          <span className="text-sm text-gray-700">Fabrica bolo</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={handleSave} disabled={saving || !nome.trim()}
          className="px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] disabled:opacity-50">
          {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar unidade..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
            <Plus size={16} /> Nova Unidade
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Unidade <SortIcon field="nome" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('tipo')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Tipo <SortIcon field="tipo" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Detalhes</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Fabricas</th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 mx-auto">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-center px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className={cn('hover:bg-gray-50/50 transition-colors', u.status === 'inativo' && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.tipo === 'fabrica' ? <Factory size={16} className="text-blue-500" /> : <Store size={16} className="text-[#E91E63]" />}
                      <span className="font-medium text-gray-800">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      u.tipo === 'loja' ? 'bg-pink-50 text-pink-700' :
                      u.tipo === 'fabrica' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    )}>{tipoLabels[u.tipo]}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                      {u.cnpj && <span className="flex items-center gap-1"><FileText size={10} /> {u.cnpj}</span>}
                      {u.endereco && <span className="flex items-center gap-1"><MapPin size={10} /> {u.endereco}</span>}
                      {u.telefone && <span className="flex items-center gap-1"><Phone size={10} /> {u.telefone}</span>}
                      {!u.cnpj && !u.endereco && !u.telefone && <span className="text-gray-300">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1">
                      {u.temFabricaSorvete && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">Sorvete</span>}
                      {u.temFabricaBolo && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Bolo</span>}
                      {!u.temFabricaSorvete && !u.temFabricaBolo && <span className="text-xs text-gray-300">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onToggleStatus(u.id)}
                      className={cn('text-xs px-3 py-1 rounded-full font-medium',
                        u.status === 'ativo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}>
                      {u.status === 'ativo' ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma unidade encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
          <span className="text-xs text-gray-400">{filtered.length} unidade(s)</span>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title={editId ? 'Editar Unidade' : 'Nova Unidade'} onClose={resetForm}>
          {formContent}
        </Modal>
      )}
    </div>
  )
}
