import { useState } from 'react'
import { Palmtree, Plus, CheckCircle, ArrowUpDown, Pencil, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ferias, Funcionario } from './PessoasSection'
import { Modal } from '@/components/Modal'

interface FeriasManagerProps {
  ferias: Ferias[]
  funcionarios: Funcionario[]
  onProgramar?: (f: { funcionarioId: string; periodoAquisitivoInicio: string; periodoAquisitivoFim: string; dataLimite: string; dataInicio: string; dataFim: string; dias: number; venderDias: number; observacao?: string }) => Promise<void>
  onConfirmar?: (id: string) => Promise<void>
  onConcluir?: (id: string) => Promise<void>
  onEditar?: (id: string, f: { dataInicio: string; dataFim: string; dias: number; venderDias: number; observacao?: string }) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-600' },
  programada: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-green-50 text-green-700' },
  concluida: { label: 'Concluida', color: 'bg-gray-50 text-gray-500' },
  vencida: { label: 'Vencida', color: 'bg-red-50 text-red-700' },
}

type SortCol = 'funcionario' | 'status' | 'limite' | 'inicio'

export function FeriasManager({ ferias, funcionarios, onProgramar, onConfirmar, onConcluir, onEditar, onDelete }: FeriasManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('limite')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [form, setForm] = useState({
    funcionarioId: '', periodoAquisitivoInicio: '', periodoAquisitivoFim: '',
    dataInicio: '', dataFim: '', dias: '30', venderDias: '0', observacao: '',
  })

  const ativos = funcionarios.filter(f => f.status === 'ativo')
  const diasReais = Math.max(0, parseInt(form.dias || '30') - parseInt(form.venderDias || '0'))

  // Funcionarios que precisam programar ferias (admitidos ha mais de 11 meses sem ferias programada)
  const funcionariosSemFerias = ativos.filter(f => {
    if (!f.dataAdmissao) return false
    const admissao = new Date(f.dataAdmissao + 'T12:00:00')
    const mesesTrabalhados = (Date.now() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (mesesTrabalhados < 11) return false
    const temProgramada = ferias.some(fe => fe.funcionarioId === f.id && (fe.status === 'programada' || fe.status === 'em_andamento'))
    return !temProgramada
  })

  const handleFuncChange = (funcId: string) => {
    const func = funcionarios.find(f => f.id === funcId)
    if (func?.dataAdmissao) {
      const admissao = new Date(func.dataAdmissao + 'T12:00:00')
      const agora = new Date()
      let inicio = new Date(admissao)
      while (inicio < agora) {
        const fim = new Date(inicio); fim.setFullYear(fim.getFullYear() + 1); fim.setDate(fim.getDate() - 1)
        const jaExiste = ferias.some(f => f.funcionarioId === funcId && f.periodoAquisitivoInicio === inicio.toISOString().split('T')[0])
        if (!jaExiste) {
          setForm(prev => ({ ...prev, funcionarioId: funcId, periodoAquisitivoInicio: inicio.toISOString().split('T')[0], periodoAquisitivoFim: fim.toISOString().split('T')[0] }))
          return
        }
        inicio.setFullYear(inicio.getFullYear() + 1)
      }
    }
    setForm(prev => ({ ...prev, funcionarioId: funcId }))
  }

  const handleDataInicioChange = (dataInicio: string) => {
    if (dataInicio && diasReais > 0) {
      const inicio = new Date(dataInicio + 'T12:00:00')
      const fim = new Date(inicio); fim.setDate(fim.getDate() + diasReais - 1)
      setForm(prev => ({ ...prev, dataInicio, dataFim: fim.toISOString().split('T')[0] }))
    } else {
      setForm(prev => ({ ...prev, dataInicio }))
    }
  }

  const resetForm = () => {
    setForm({ funcionarioId: '', periodoAquisitivoInicio: '', periodoAquisitivoFim: '', dataInicio: '', dataFim: '', dias: '30', venderDias: '0', observacao: '' })
    setEditingId(null)
  }

  const handleEdit = (f: Ferias) => {
    setForm({
      funcionarioId: f.funcionarioId,
      periodoAquisitivoInicio: f.periodoAquisitivoInicio,
      periodoAquisitivoFim: f.periodoAquisitivoFim,
      dataInicio: f.dataInicio || '',
      dataFim: f.dataFim || '',
      dias: String(f.dias),
      venderDias: String(f.venderDias || 0),
      observacao: f.observacao || '',
    })
    setEditingId(f.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (editingId && onEditar) {
      setSaving(true)
      try {
        await onEditar(editingId, { dataInicio: form.dataInicio, dataFim: form.dataFim, dias: parseInt(form.dias) || 30, venderDias: parseInt(form.venderDias) || 0, observacao: form.observacao || undefined })
        resetForm(); setShowForm(false); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000)
      } finally { setSaving(false) }
      return
    }
    if (!form.funcionarioId || !form.dataInicio || !onProgramar) return
    setSaving(true)
    try {
      const periodoFim = new Date(form.periodoAquisitivoInicio + 'T12:00:00')
      periodoFim.setFullYear(periodoFim.getFullYear() + 1); periodoFim.setDate(periodoFim.getDate() - 1)
      const dataLimite = new Date(periodoFim); dataLimite.setMonth(dataLimite.getMonth() + 11)
      await onProgramar({
        funcionarioId: form.funcionarioId,
        periodoAquisitivoInicio: form.periodoAquisitivoInicio,
        periodoAquisitivoFim: form.periodoAquisitivoFim || periodoFim.toISOString().split('T')[0],
        dataLimite: dataLimite.toISOString().split('T')[0],
        dataInicio: form.dataInicio, dataFim: form.dataFim,
        dias: parseInt(form.dias) || 30, venderDias: parseInt(form.venderDias) || 0,
        observacao: form.observacao || undefined,
      })
      resetForm(); setShowForm(false); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000)
    } finally { setSaving(false) }
  }

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...ferias].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'funcionario') return (a.funcionarioNome || '').localeCompare(b.funcionarioNome || '') * dir
    if (sortCol === 'status') return a.status.localeCompare(b.status) * dir
    if (sortCol === 'limite') return a.dataLimite.localeCompare(b.dataLimite) * dir
    if (sortCol === 'inicio') return (a.dataInicio || '').localeCompare(b.dataInicio || '') * dir
    return 0
  })

  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">{editingId ? 'Férias atualizadas!' : 'Férias programadas!'}</p>
        </div>
      )}

      {/* Aviso funcionarios sem ferias programada */}
      {funcionariosSemFerias.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-800">Funcionarios que precisam programar ferias</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {funcionariosSemFerias.map(f => (
              <span key={f.id} className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">{f.nome}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <Palmtree size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Controle de Férias</h3>
              <p className="text-xs text-gray-500">Programação, vencimentos e abono pecuniário</p>
            </div>
          </div>
          {onProgramar && (
            <button onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              <Plus size={16} /> Programar Férias
            </button>
          )}
        </div>

        {/* Modal programar/editar */}
        <Modal open={showForm} onClose={() => { setShowForm(false); resetForm() }}
          title={editingId ? 'Editar Férias' : 'Programar Férias'}
          subtitle="Defina o periodo e opcoes de abono" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Funcionário *</label>
                <select value={form.funcionarioId} onChange={e => handleFuncChange(e.target.value)} disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300 disabled:bg-gray-100">
                  <option value="">Selecione...</option>
                  {ativos.map(f => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Periodo aquisitivo inicio</label>
                <input type="date" value={form.periodoAquisitivoInicio} onChange={e => setForm({...form, periodoAquisitivoInicio: e.target.value})} disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Periodo aquisitivo fim</label>
                <input type="date" value={form.periodoAquisitivoFim} onChange={e => setForm({...form, periodoAquisitivoFim: e.target.value})} disabled={!!editingId}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data inicio ferias *</label>
                <input type="date" value={form.dataInicio} onChange={e => handleDataInicioChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim ferias</label>
                <input type="date" value={form.dataFim} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total dias</label>
                <input type="number" min="20" max="30" value={form.dias} onChange={e => setForm({...form, dias: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vender dias (abono)</label>
                <select value={form.venderDias} onChange={e => setForm({...form, venderDias: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300">
                  <option value="0">Nao vender</option>
                  <option value="10">Vender 10 dias</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
            </div>
            {parseInt(form.venderDias) > 0 && (
              <p className="text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                Abono pecuniario: {form.venderDias} dias vendidos. Descanso: {diasReais} dias.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
              <button onClick={handleSubmit} disabled={(!editingId && (!form.funcionarioId || !form.dataInicio)) || saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Programar'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Tabela */}
        {ferias.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhuma ferias programada. Clique em "Programar Férias" para comecar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => toggleSort('funcionario')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Funcionario <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Unidade</th>
                  <th onClick={() => toggleSort('status')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Status <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Aquisitivo</th>
                  <th onClick={() => toggleSort('limite')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Limite <ArrowUpDown size={10} /></span>
                  </th>
                  <th onClick={() => toggleSort('inicio')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Periodo <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Dias</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Abono</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-28">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(f => {
                  const st = statusLabels[f.status] || statusLabels.pendente
                  const isVencida = f.alerta === 'vencida'
                  const isUrgente = f.alerta === 'urgente'
                  return (
                    <tr key={f.id} className={cn('hover:bg-gray-50/50',
                      isVencida && 'bg-red-50/30', isUrgente && 'bg-amber-50/30',
                      f.status === 'concluida' && 'opacity-60')}>
                      <td className="px-3 py-2 font-medium text-gray-800">{f.funcionarioNome}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{f.unidadeNome || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmt(f.periodoAquisitivoInicio)} - {fmt(f.periodoAquisitivoFim)}</td>
                      <td className={cn('px-3 py-2 text-xs', isVencida ? 'text-red-600 font-semibold' : isUrgente ? 'text-amber-600 font-medium' : 'text-gray-500')}>
                        {fmt(f.dataLimite)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {f.dataInicio && f.dataFim ? `${fmt(f.dataInicio)} - ${fmt(f.dataFim)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{f.dias}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {f.venderDias && f.venderDias > 0 ? (
                          <span className="text-teal-700 font-medium">{f.venderDias}d</span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onEditar && (
                            <button onClick={() => handleEdit(f)} className="p-1 text-gray-400 hover:text-violet-600" title="Editar">
                              <Pencil size={13} />
                            </button>
                          )}
                          {f.status === 'programada' && onConfirmar && (
                            <button onClick={async () => { await onConfirmar(f.id) }}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                              Confirmar
                            </button>
                          )}
                          {f.status === 'em_andamento' && onConcluir && (
                            <button onClick={async () => { await onConcluir(f.id) }}
                              className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
                              Concluir
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => { if (confirm('Excluir este registro de ferias?')) onDelete(f.id) }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
