import { useState } from 'react'
import { AlertCircle, Plus, CheckCircle, Pencil, ArrowUpDown, Printer, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ocorrencia, Funcionario } from './PessoasSection'
import { Modal } from '@/components/Modal'

const tipoOcorrenciaLabels: Record<string, { label: string; color: string }> = {
  falta: { label: 'Falta', color: 'bg-red-50 text-red-700' },
  falta_justificada: { label: 'Falta Justificada', color: 'bg-orange-50 text-orange-700' },
  atestado: { label: 'Atestado', color: 'bg-amber-50 text-amber-700' },
  atraso: { label: 'Atraso', color: 'bg-yellow-50 text-yellow-700' },
  advertencia: { label: 'Advertência', color: 'bg-red-100 text-red-800' },
  suspensao: { label: 'Suspensão', color: 'bg-red-200 text-red-900' },
  elogio: { label: 'Elogio', color: 'bg-green-50 text-green-700' },
  ferias: { label: 'Férias', color: 'bg-blue-50 text-blue-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
}

interface OcorrenciaManagerProps {
  ocorrencias: Ocorrencia[]
  funcionarios: Funcionario[]
  onAdd: (o: Omit<Ocorrencia, 'id' | 'funcionarioNome'>) => Promise<void>
  onUpdate?: (id: string, o: Partial<Ocorrencia>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

type SortCol = 'data' | 'funcionario' | 'tipo'

function gerarPDFAdvertencia(ocorrencia: Ocorrencia, funcionario: Funcionario | undefined) {
  const nomeFuncionario = funcionario?.nome || ocorrencia.funcionarioNome || 'Funcionario'
  const cpf = funcionario?.cpf || ''
  const cargo = funcionario?.cargoNome || ''
  const dataFormatada = new Date(ocorrencia.data + 'T12:00:00').toLocaleDateString('pt-BR')
  const hoje = new Date().toLocaleDateString('pt-BR')

  const html = `
    <html>
    <head><title>Advertencia - ${nomeFuncionario}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
      h1 { text-align: center; font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
      .header { margin-bottom: 30px; }
      .campo { margin: 8px 0; }
      .campo strong { display: inline-block; min-width: 140px; }
      .descricao { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; min-height: 60px; }
      .assinaturas { margin-top: 80px; display: flex; justify-content: space-between; }
      .assinatura { text-align: center; width: 45%; }
      .assinatura .linha { border-top: 1px solid #333; padding-top: 5px; margin-top: 50px; font-size: 12px; }
      .rodape { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
    </style>
    </head>
    <body>
      <h1>TERMO DE ADVERTÊNCIA</h1>
      <div class="header">
        <div class="campo"><strong>Funcionário:</strong> ${nomeFuncionario}</div>
        ${cpf ? `<div class="campo"><strong>CPF:</strong> ${cpf}</div>` : ''}
        ${cargo ? `<div class="campo"><strong>Cargo:</strong> ${cargo}</div>` : ''}
        <div class="campo"><strong>Data da ocorrência:</strong> ${dataFormatada}</div>
        <div class="campo"><strong>Tipo:</strong> ${tipoOcorrenciaLabels[ocorrencia.tipo]?.label || ocorrencia.tipo}</div>
      </div>
      <p>Pela presente, fica o(a) funcionario(a) acima identificado(a) <strong>ADVERTIDO(A)</strong> pela seguinte razao:</p>
      <div class="descricao">${ocorrencia.descricao || 'Conforme relatado na data acima.'}</div>
      <p>Fica o(a) funcionário(a) ciente de que a reincidência poderá acarretar sanções mais severas, conforme legislação trabalhista vigente.</p>
      <p style="margin-top: 20px;">Ribeirao Preto, ${hoje}</p>
      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha">Empregador / Responsável</div>
        </div>
        <div class="assinatura">
          <div class="linha">${nomeFuncionario}<br/>Funcionario(a)</div>
        </div>
      </div>
      <div class="rodape">Rosi Sorvetes Artesanal - Documento gerado pelo sistema</div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }
}

export function OcorrenciaManager({ ocorrencias, funcionarios, onAdd, onUpdate, onDelete }: OcorrenciaManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('data')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [form, setForm] = useState({
    funcionarioId: '',
    data: new Date().toISOString().split('T')[0],
    dataFim: '',
    tipo: 'falta',
    descricao: '',
    dias: '1',
    registradoPor: '',
  })

  const tiposComPeriodo = ['atestado', 'ferias', 'suspensao']
  const mostraPeriodo = tiposComPeriodo.includes(form.tipo)

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

  const resetForm = () => {
    setForm({ funcionarioId: '', data: new Date().toISOString().split('T')[0], dataFim: '', tipo: 'falta', descricao: '', dias: '1', registradoPor: '' })
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!form.funcionarioId || !form.data) return
    setSaving(true)
    try {
      if (editingId && onUpdate) {
        await onUpdate(editingId, {
          funcionarioId: form.funcionarioId,
          data: form.data,
          dataFim: mostraPeriodo && form.dataFim ? form.dataFim : undefined,
          tipo: form.tipo,
          descricao: form.descricao || undefined,
          dias: parseInt(form.dias) || 1,
          registradoPor: form.registradoPor || undefined,
        })
      } else {
        await onAdd({
          funcionarioId: form.funcionarioId,
          data: form.data,
          dataFim: mostraPeriodo && form.dataFim ? form.dataFim : undefined,
          tipo: form.tipo,
          descricao: form.descricao || undefined,
          dias: parseInt(form.dias) || 1,
          registradoPor: form.registradoPor || undefined,
        })
      }
      resetForm()
      setShowForm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar ocorrencia:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEditOcorrencia = (o: Ocorrencia) => {
    setForm({
      funcionarioId: o.funcionarioId,
      data: o.data,
      dataFim: o.dataFim || '',
      tipo: o.tipo,
      descricao: o.descricao || '',
      dias: String(o.dias),
      registradoPor: o.registradoPor || '',
    })
    setEditingId(o.id)
    setShowForm(true)
  }

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'data' ? 'desc' : 'asc') }
  }

  const ativos = funcionarios.filter(f => f.status === 'ativo')

  // Filtrar e ordenar
  const ocorrenciasFiltradas = ocorrencias
    .filter(o => filtroTipo === 'todos' || o.tipo === filtroTipo)
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'data') return a.data.localeCompare(b.data) * dir
      if (sortCol === 'funcionario') return (a.funcionarioNome || '').localeCompare(b.funcionarioNome || '') * dir
      if (sortCol === 'tipo') return a.tipo.localeCompare(b.tipo) * dir
      return 0
    })

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">
            {editingId ? 'Ocorrencia atualizada!' : 'Ocorrência registrada com sucesso!'}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Ocorrências</h3>
              <p className="text-xs text-gray-500">Faltas, atestados, advertencias e outros registros</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              <Plus size={16} />
              Nova Ocorrência
            </button>
          )}
        </div>

        {/* Form Modal */}
        <Modal open={showForm} onClose={() => { setShowForm(false); resetForm() }}
          title={editingId ? 'Editar Ocorrencia' : 'Nova Ocorrência'}
          subtitle="Registre faltas, advertencias, atestados e outros" size="lg">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Funcionário *</label>
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
                <select value={form.registradoPor} onChange={e => setForm({...form, registradoPor: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300">
                  <option value="">Selecione...</option>
                  {ativos.map(f => (
                    <option key={f.id} value={f.nome}>{f.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-300" rows={2} placeholder="Detalhes da ocorrencia..." />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.funcionarioId || !form.data || saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : editingId ? 'Salvar Alteracoes' : 'Registrar'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Filtro por tipo */}
        <div className="flex items-center gap-2 mb-3">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none">
            <option value="todos">Todos os tipos</option>
            {Object.entries(tipoOcorrenciaLabels).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{ocorrenciasFiltradas.length} registro(s)</span>
        </div>

        {/* Tabela */}
        {ocorrencias.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhuma ocorrencia registrada. Clique em "+ Nova Ocorrência" para comecar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => toggleSort('data')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Data <ArrowUpDown size={10} /></span>
                  </th>
                  <th onClick={() => toggleSort('funcionario')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Funcionario <ArrowUpDown size={10} /></span>
                  </th>
                  <th onClick={() => toggleSort('tipo')} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                    <span className="flex items-center gap-1">Tipo <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Dias</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Registrado por</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-20">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ocorrenciasFiltradas.map(o => {
                  const tipo = tipoOcorrenciaLabels[o.tipo] || { label: o.tipo, color: 'bg-gray-100 text-gray-600' }
                  const func = funcionarios.find(f => f.id === o.funcionarioId)
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {o.dataFim && (
                          <span className="text-gray-400"> - {new Date(o.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-800">{o.funcionarioNome || 'Funcionario'}</td>
                      <td className="px-3 py-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', tipo.color)}>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{o.descricao || '-'}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">{o.dias}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{o.registradoPor || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onUpdate && (
                            <button onClick={() => handleEditOcorrencia(o)}
                              className="p-1 text-gray-400 hover:text-violet-600 transition-colors" title="Editar">
                              <Pencil size={13} />
                            </button>
                          )}
                          {o.tipo === 'advertencia' && (
                            <button onClick={() => gerarPDFAdvertencia(o, func)}
                              className="p-1 text-gray-400 hover:text-orange-600 transition-colors" title="Imprimir advertencia">
                              <Printer size={13} />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => { if (confirm('Excluir esta ocorrencia?')) onDelete(o.id) }}
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
