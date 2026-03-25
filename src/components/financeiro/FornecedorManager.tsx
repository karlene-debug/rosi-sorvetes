import { useState } from 'react'
import { Plus, Search, X, Phone, Mail, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Fornecedor } from '@/data/financeData'

interface FornecedorManagerProps {
  fornecedores: Fornecedor[]
  onAdd: (f: Omit<Fornecedor, 'id' | 'criadoEm'>) => void
  onToggleStatus: (id: string) => void
}

export function FornecedorManager({ fornecedores, onAdd, onToggleStatus }: FornecedorManagerProps) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacao, setObservacao] = useState('')

  const filtered = fornecedores.filter(f =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!nome.trim()) return
    onAdd({
      nome: nome.trim(),
      contato: contato || undefined,
      telefone: telefone || undefined,
      email: email || undefined,
      observacao: observacao || undefined,
      status: 'ativo',
    })
    setNome(''); setContato(''); setTelefone(''); setEmail(''); setObservacao('')
    setShowForm(false)
  }

  const ativos = fornecedores.filter(f => f.status === 'ativo').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total fornecedores</p>
          <p className="text-2xl font-bold text-gray-800">{fornecedores.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Novo Fornecedor'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <p className="text-sm font-medium text-gray-700 mb-3">Cadastrar fornecedor</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Nome *" value={nome} onChange={e => setNome(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" autoFocus />
              <input type="text" placeholder="Contato (pessoa)" value={contato} onChange={e => setContato(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              <input type="text" placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              <input type="text" placeholder="Observacao" value={observacao} onChange={e => setObservacao(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] sm:col-span-2" />
            </div>
            <button onClick={handleAdd} className="mt-3 px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
              Salvar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Fornecedor</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Contato</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Telefone</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => (
                <tr key={f.id} className={cn('hover:bg-gray-50/50', f.status === 'inativo' && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-[#E91E63] shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                        {f.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{f.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{f.contato || '-'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {f.telefone ? (
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{f.telefone}</span>
                    ) : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onToggleStatus(f.id)}
                      className={cn('text-xs px-3 py-1 rounded-full font-medium transition-colors',
                        f.status === 'ativo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}>
                      {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Nenhum fornecedor encontrado</div>}
        </div>
      </div>
    </div>
  )
}
