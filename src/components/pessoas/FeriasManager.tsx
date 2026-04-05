import { useState } from 'react'
import { Palmtree, Plus, CheckCircle, Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ferias, Funcionario } from './PessoasSection'

interface FeriasManagerProps {
  ferias: Ferias[]
  funcionarios: Funcionario[]
  onProgramar?: (f: { funcionarioId: string; periodoAquisitivoInicio: string; periodoAquisitivoFim: string; dataLimite: string; dataInicio: string; dataFim: string; dias: number; venderDias: number; observacao?: string }) => Promise<void>
  onConfirmar?: (id: string) => Promise<void>
  onConcluir?: (id: string) => Promise<void>
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-600' },
  programada: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  em_andamento: { label: 'Em Andamento', color: 'bg-green-50 text-green-700' },
  concluida: { label: 'Concluida', color: 'bg-gray-50 text-gray-500' },
  vencida: { label: 'Vencida', color: 'bg-red-50 text-red-700' },
}

const alertaColors: Record<string, string> = {
  vencida: 'border-red-200 bg-red-50/30',
  urgente: 'border-orange-200 bg-orange-50/30',
  atencao: 'border-amber-200 bg-amber-50/30',
  ok: 'border-gray-100',
}

export function FeriasManager({ ferias, funcionarios, onProgramar, onConfirmar, onConcluir }: FeriasManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    funcionarioId: '',
    periodoAquisitivoInicio: '',
    periodoAquisitivoFim: '',
    dataInicio: '',
    dataFim: '',
    dias: '30',
    venderDias: '0',
    observacao: '',
  })

  const ativos = funcionarios.filter(f => f.status === 'ativo')

  // Auto-calcular periodo aquisitivo e data limite a partir do funcionario selecionado
  const handleFuncChange = (funcId: string) => {
    const func = funcionarios.find(f => f.id === funcId)
    if (func?.dataAdmissao) {
      // Encontrar proximo periodo aquisitivo nao coberto
      const admissao = new Date(func.dataAdmissao + 'T12:00:00')
      const agora = new Date()
      let inicio = new Date(admissao)
      while (inicio < agora) {
        const fim = new Date(inicio)
        fim.setFullYear(fim.getFullYear() + 1)
        fim.setDate(fim.getDate() - 1)
        // Verificar se ja existe ferias para este periodo
        const jaExiste = ferias.some(f => f.funcionarioId === funcId && f.periodoAquisitivoInicio === inicio.toISOString().split('T')[0])
        if (!jaExiste) {
          const dataLimite = new Date(fim)
          dataLimite.setMonth(dataLimite.getMonth() + 11)
          setForm(prev => ({
            ...prev,
            funcionarioId: funcId,
            periodoAquisitivoInicio: inicio.toISOString().split('T')[0],
            periodoAquisitivoFim: fim.toISOString().split('T')[0],
          }))
          return
        }
        inicio.setFullYear(inicio.getFullYear() + 1)
      }
    }
    setForm(prev => ({ ...prev, funcionarioId: funcId }))
  }

  // Auto-calcular dias reais (descontando venda)
  const diasReais = Math.max(0, parseInt(form.dias || '30') - parseInt(form.venderDias || '0'))

  // Auto-calcular data fim quando data inicio muda
  const handleDataInicioChange = (dataInicio: string) => {
    if (dataInicio && diasReais > 0) {
      const inicio = new Date(dataInicio + 'T12:00:00')
      const fim = new Date(inicio)
      fim.setDate(fim.getDate() + diasReais - 1)
      setForm(prev => ({ ...prev, dataInicio, dataFim: fim.toISOString().split('T')[0] }))
    } else {
      setForm(prev => ({ ...prev, dataInicio }))
    }
  }

  const handleSubmit = async () => {
    if (!form.funcionarioId || !form.periodoAquisitivoInicio || !form.dataInicio || !onProgramar) return
    setSaving(true)
    try {
      const periodoFim = new Date(form.periodoAquisitivoInicio + 'T12:00:00')
      periodoFim.setFullYear(periodoFim.getFullYear() + 1)
      periodoFim.setDate(periodoFim.getDate() - 1)
      const dataLimite = new Date(periodoFim)
      dataLimite.setMonth(dataLimite.getMonth() + 11)

      await onProgramar({
        funcionarioId: form.funcionarioId,
        periodoAquisitivoInicio: form.periodoAquisitivoInicio,
        periodoAquisitivoFim: form.periodoAquisitivoFim || periodoFim.toISOString().split('T')[0],
        dataLimite: dataLimite.toISOString().split('T')[0],
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        dias: parseInt(form.dias) || 30,
        venderDias: parseInt(form.venderDias) || 0,
        observacao: form.observacao || undefined,
      })
      setForm({ funcionarioId: '', periodoAquisitivoInicio: '', periodoAquisitivoFim: '', dataInicio: '', dataFim: '', dias: '30', venderDias: '0', observacao: '' })
      setShowForm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao programar ferias:', err)
    } finally {
      setSaving(false)
    }
  }

  // Separar ferias por estado
  const futuras = ferias.filter(f => f.status === 'programada' || f.status === 'pendente')
  const emAndamento = ferias.filter(f => f.status === 'em_andamento')
  const concluidas = ferias.filter(f => f.status === 'concluida')
  const vencidas = ferias.filter(f => f.alerta === 'vencida' && f.status !== 'concluida')

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">Ferias programadas com sucesso!</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
              <Palmtree size={20} className="text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Controle de Ferias</h3>
              <p className="text-xs text-gray-500">Programacao, vencimentos e abono pecuniario</p>
            </div>
          </div>
          {!showForm && onProgramar && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              <Plus size={16} />
              Programar Ferias
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Programar Ferias</p>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Funcionario *</label>
                <select value={form.funcionarioId} onChange={e => handleFuncChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300">
                  <option value="">Selecione...</option>
                  {ativos.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Periodo aquisitivo inicio</label>
                <input type="date" value={form.periodoAquisitivoInicio} onChange={e => setForm({...form, periodoAquisitivoInicio: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Periodo aquisitivo fim</label>
                <input type="date" value={form.periodoAquisitivoFim} onChange={e => setForm({...form, periodoAquisitivoFim: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data inicio ferias *</label>
                <input type="date" value={form.dataInicio} onChange={e => handleDataInicioChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim ferias</label>
                <input type="date" value={form.dataFim} readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600" />
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Observacao</label>
                <input type="text" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300" placeholder="Ex: Vai viajar, quer junto com feriado..." />
              </div>
            </div>
            {parseInt(form.venderDias) > 0 && (
              <p className="text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg">
                Abono pecuniario: {form.venderDias} dias vendidos. O funcionario tirara {diasReais} dias de descanso.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.funcionarioId || !form.dataInicio || saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Programar'}
              </button>
            </div>
          </div>
        )}

        {/* Alertas de vencimento */}
        {vencidas.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-2">Ferias vencidas ({vencidas.length})</p>
            <div className="space-y-1">
              {vencidas.map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-red-800">{f.funcionarioNome}</span>
                  <span className="text-red-600">Limite: {new Date(f.dataLimite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Em andamento */}
        {emAndamento.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Em andamento</p>
            {emAndamento.map(f => (
              <FeriasCard key={f.id} ferias={f} onConcluir={onConcluir} />
            ))}
          </div>
        )}

        {/* Programadas / Pendentes */}
        {futuras.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Programacoes futuras ({futuras.length})</p>
            <div className="space-y-2">
              {futuras.map(f => (
                <FeriasCard key={f.id} ferias={f} onConfirmar={onConfirmar} onConcluir={onConcluir} />
              ))}
            </div>
          </div>
        )}

        {/* Concluidas */}
        {concluidas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Historico ({concluidas.length})</p>
            <div className="space-y-2">
              {concluidas.map(f => (
                <FeriasCard key={f.id} ferias={f} />
              ))}
            </div>
          </div>
        )}

        {ferias.length === 0 && !showForm && (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhuma ferias programada. Clique em "Programar Ferias" para comecar.
          </div>
        )}
      </div>
    </div>
  )
}

function FeriasCard({ ferias: f, onConfirmar, onConcluir }: {
  ferias: Ferias
  onConfirmar?: (id: string) => Promise<void>
  onConcluir?: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const st = statusLabels[f.status] || statusLabels.pendente
  const alertaCor = alertaColors[f.alerta || 'ok']

  const handleAction = async (action: 'confirmar' | 'concluir') => {
    setLoading(true)
    try {
      if (action === 'confirmar' && onConfirmar) await onConfirmar(f.id)
      if (action === 'concluir' && onConcluir) await onConcluir(f.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('p-3 rounded-lg border', alertaCor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{f.funcionarioNome}</span>
          {f.unidadeNome && <span className="text-xs text-gray-400">{f.unidadeNome}</span>}
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
          {f.venderDias && f.venderDias > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
              Vendeu {f.venderDias} dias
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {f.status === 'programada' && onConfirmar && (
            <button onClick={() => handleAction('confirmar')} disabled={loading}
              className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? '...' : 'Confirmar saida'}
            </button>
          )}
          {f.status === 'em_andamento' && onConcluir && (
            <button onClick={() => handleAction('concluir')} disabled={loading}
              className="text-xs px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
              {loading ? '...' : 'Concluir ferias'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          Aquisitivo: {new Date(f.periodoAquisitivoInicio + 'T12:00:00').toLocaleDateString('pt-BR')} - {new Date(f.periodoAquisitivoFim + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
        <span>Limite: {new Date(f.dataLimite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
        {f.dataInicio && f.dataFim && (
          <span className="font-medium text-gray-700">
            Ferias: {new Date(f.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} - {new Date(f.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}
        <span>{f.dias} dias</span>
      </div>
      {f.observacao && <p className="text-xs text-gray-400 mt-1">{f.observacao}</p>}
    </div>
  )
}
