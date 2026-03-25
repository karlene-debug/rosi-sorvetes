import { useState } from 'react'
import { Plus, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustoFixo, PlanoContas, Fornecedor } from '@/data/financeData'
import { formatCurrency } from '@/data/financeData'

interface CustoFixoManagerProps {
  custosFixos: CustoFixo[]
  planoContas: PlanoContas[]
  fornecedores: Fornecedor[]
  onAdd: (c: Omit<CustoFixo, 'id'>) => void
  onToggleStatus: (id: string) => void
}

export function CustoFixoManager({ custosFixos, planoContas, fornecedores, onAdd, onToggleStatus }: CustoFixoManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dia, setDia] = useState('1')
  const [planoId, setPlanoId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')

  const activePlano = planoContas.filter(p => p.status === 'ativo' && p.tipoCusto === 'fixo')
  const activeFornecedores = fornecedores.filter(f => f.status === 'ativo')

  const totalMensal = custosFixos.filter(c => c.status === 'ativo').reduce((s, c) => s + c.valor, 0)

  const handleAdd = () => {
    if (!descricao.trim() || !valor) return
    const plano = activePlano.find(p => p.id === planoId)
    const forn = activeFornecedores.find(f => f.id === fornecedorId)
    onAdd({
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      diaVencimento: parseInt(dia),
      planoContasId: planoId || undefined,
      planoContasNome: plano?.nome,
      fornecedorId: fornecedorId || undefined,
      fornecedorNome: forn?.nome,
      status: 'ativo',
    })
    setDescricao(''); setValor(''); setDia('1'); setPlanoId(''); setFornecedorId('')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Custos fixos ativos</p>
          <p className="text-2xl font-bold text-gray-800">{custosFixos.filter(c => c.status === 'ativo').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total mensal</p>
          <p className="text-2xl font-bold text-[#E91E63]">{formatCurrency(totalMensal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Custos Fixos Recorrentes</h3>
            <p className="text-xs text-gray-500">Cadastre uma vez, o sistema gera todo mes automaticamente</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Novo Custo Fixo'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Descricao *" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] sm:col-span-2 lg:col-span-1" autoFocus />
              <input type="number" placeholder="Valor *" value={valor} onChange={e => setValor(e.target.value)} step="0.01" min="0"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Dia venc.:</span>
                <input type="number" min="1" max="31" value={dia} onChange={e => setDia(e.target.value)}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] text-center" />
              </div>
              <select value={planoId} onChange={e => setPlanoId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                <option value="">Plano de contas (opcional)</option>
                {activePlano.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                <option value="">Fornecedor (opcional)</option>
                {activeFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <button onClick={handleAdd} className="mt-3 px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
              Salvar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Descricao</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Valor</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Dia Venc.</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Plano</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {custosFixos.map(c => (
              <tr key={c.id} className={cn('hover:bg-gray-50/50', c.status === 'inativo' && 'opacity-50')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#E91E63] shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{c.descricao}</span>
                      {c.fornecedorNome && <p className="text-xs text-gray-400">{c.fornecedorNome}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{formatCurrency(c.valor)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500 hidden sm:table-cell">Dia {c.diaVencimento}</td>
                <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{c.planoContasNome || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onToggleStatus(c.id)}
                    className={cn('text-xs px-3 py-1 rounded-full font-medium',
                      c.status === 'ativo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}>
                    {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {custosFixos.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Nenhum custo fixo cadastrado</div>}
      </div>
    </div>
  )
}
