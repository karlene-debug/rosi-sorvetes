import { useState } from 'react'
import { AlertCircle, Plus, CheckCircle } from 'lucide-react'
import type { Ocorrencia, Funcionario } from './PessoasSection'

const tipoOcorrenciaLabels: Record<string, { label: string; color: string }> = {
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700' },
  falta_justificada: { label: 'Falta Justificada', color: 'bg-orange-50 text-orange-700' },
  atestado: { label: 'Atestado', color: 'bg-amber-50 text-amber-700' },
  atraso: { label: 'Atraso', color: 'bg-yellow-50 text-yellow-700' },
  advertencia: { label: 'Advertencia', color: 'bg-red-100 text-red-800' },
  suspensao: { label: 'Suspensao', color: 'bg-red-200 text-red-900' },
  elogio: { label: 'Elogio', color: 'bg-green-50 text-green-700' },
  ferias: { label: 'Ferias', color: 'bg-blue-50 text-blue-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
}

interface OcorrenciaManagerProps {
  ocorrencias: Ocorrencia[]
  funcionarios: Funcionario[]
  onAdd: (o: Omit<Ocorrencia, 'id' | 'funcionarioNome'>) => Promise<void>
}

export function OcorrenciaManager({ ocorrencias, funcionarios, onAdd }: OcorrenciaManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    funcionarioId: '',
    data: new Date().toISOString().split('T')[0],
    dataFim: '',
    tipo: 'falta',
    descricao: '',
    dias: '1',
    registradoPor: '',
  })

  // Tipos que precisam de periodo (inicio/fim)
  const tiposComPeriodo = ['atestado', 'ferias', 'suspensao']
  const mostraPeriodo = tiposComPeriodo.includes(form.tipo)

  // Auto-calcular dias quando data inicio/fim mudam
  const handleDateChange = (field: 'data' | 'dataFim', value: string) => {
    const updated = { ...form, [field]: value }
    if (updated.data && updated.dataFim && mostraPeriodo) {
      const inicio = new Date(updated.data + 'T12:00:00')
      const fim = new Date(updated.dataFim + 'T12:00:00')
      const diff = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (diff > 0) updated.dias = String(diff)
    }
    setForm(updated)
  }

  const handleSubmit = async () => {
    if (!form.funcionarioId || !form.data) return
    setSaving(true)
    try {
      await onAdd({
        funcionarioId: form.funcionarioId,
        data: form.data,
        dataFim: mostraPeriodo && form.dataFim ? form.dataFim : undefined,
        tipo: form.tipo,
        descricao: form.descricao || undefined,
        dias: parseInt(form.dias) || 1,
        registradoPor: form.registradoPor || undefined,
      })
      setForm({ funcionarioId: '', data: new Date().toISOString().split('T')[0], dataFim: '', tipo: 'falta', descricao: '', dias: '1', registradoPor: '' })
      setShowForm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar ocorrencia:', err)
    } finally {
      setSaving(false)
    }
  }

  const ativos = funcionarios.filter(f => f.status === 'ativo')

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">Ocorrencia registrada com sucesso!</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Ocorrencias</h3>
              <p className="text-xs text-gray-500">Faltas, atestados, advertencias e outros registros</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} />
            Nova Ocorrencia
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Funcionario *</label>
                <select value={form.funcionarioId} onChange={e => setForm({...form, funcionarioId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300">
                  <option value="">Selecione...</option>
                  {ativos.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300">
                  {Object.entries(tipoOcorrenciaLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{mostraPeriodo ? 'Data Inicio *' : 'Data *'}</label>
                <input type="date" value={form.data} onChange={e => handleDateChange('data', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" />
              </div>
              {mostraPeriodo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
                  <input type="date" value={form.dataFim} onChange={e => handleDateChange('dataFim', e.target.value)}
                    min={form.data}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dias {mostraPeriodo ? '(auto)' : ''}</label>
                <input type="number" min="1" value={form.dias} onChange={e => setForm({...form, dias: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registrado por</label>
                <input type="text" value={form.registradoPor} onChange={e => setForm({...form, registradoPor: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" placeholder="Nome de quem registrou" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descricao</label>
              <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" rows={2} placeholder="Detalhes da ocorrencia..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.funcionarioId || !form.data || saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {ocorrencias.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhuma ocorrencia registrada
            </div>
          ) : (
            ocorrencias.map(o => {
              const tipo = tipoOcorrenciaLabels[o.tipo] || { label: o.tipo, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{o.funcionarioNome || 'Funcionario'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipo.color}`}>
                        {tipo.label}
                      </span>
                      {o.dias > 1 && (
                        <span className="text-xs text-gray-400">{o.dias} dias</span>
                      )}
                    </div>
                    {o.descricao && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{o.descricao}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-xs text-gray-500">
                      {new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {o.dataFim && ` - ${new Date(o.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </span>
                    {o.registradoPor && (
                      <p className="text-[10px] text-gray-400">por {o.registradoPor}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
