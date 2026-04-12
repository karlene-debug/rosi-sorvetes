import { useState } from 'react'
import { UserPlus, Users, Phone, CheckCircle, Gift, ChevronDown, Pencil, UserX, DollarSign, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Upload, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Cargo, Funcionario, Beneficio, PendenciaRH, MotivoDesligamento } from './PessoasSection'
import { parseTRCTPDF } from '@/lib/trctParser'
import type { Unidade } from '@/data/productTypes'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/Modal'

interface HistoricoSalarial {
  id: string
  salarioAnterior: number
  salarioNovo: number
  dataReajuste: string
  motivo?: string
  registradoPor?: string
}

const tipoContratoLabels: Record<string, string> = {
  clt: 'CLT',
  diarista: 'Diarista',
  socio: 'Socio(a)',
  pj: 'PJ',
  estagiario: 'Estagiario',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'bg-green-50 text-green-700' },
  inativo: { label: 'Inativo', color: 'bg-gray-100 text-gray-500' },
  ferias: { label: 'Ferias', color: 'bg-blue-50 text-blue-700' },
  afastado: { label: 'Afastado', color: 'bg-amber-50 text-amber-700' },
}

const beneficioTipos = [
  { tipo: 'vt', label: 'Vale Transporte (VT)', descPadrao: 'Desconto de 6% do salário' },
  { tipo: 'vr', label: 'Vale Refeição (VR)', descPadrao: '' },
  { tipo: 'va', label: 'Vale Alimentação (VA)', descPadrao: '' },
  { tipo: 'plano_saude', label: 'Plano de Saúde', descPadrao: '' },
  { tipo: 'cesta_basica', label: 'Cesta Básica', descPadrao: '' },
  { tipo: 'outros', label: 'Outros', descPadrao: '' },
]

interface BeneficioForm {
  tipo: string
  ativo: boolean
  valorEmpresa: string
  valorColaborador: string
  percentualColaborador: string
}

const tipoDemissaoLabels: Record<string, string> = {
  sem_justa_causa: 'Sem justa causa',
  justa_causa: 'Justa causa',
  pedido_demissao: 'Pedido de demissão',
  acordo: 'Acordo (reforma trabalhista)',
}

const avisoPrevioLabels: Record<string, string> = {
  trabalhado: 'Trabalhado',
  indenizado: 'Indenizado',
  dispensado: 'Dispensado',
}

interface FuncionarioManagerProps {
  funcionarios: Funcionario[]
  cargos: Cargo[]
  unidades: Unidade[]
  pendencias?: PendenciaRH[]
  motivosDesligamento?: MotivoDesligamento[]
  onAdd: (f: Omit<Funcionario, 'id' | 'cargoNome' | 'unidadeNome'>) => Promise<void>
  onUpdate?: (id: string, f: Partial<Funcionario>) => Promise<void>
  onDemitir?: (id: string, dataDemissao: string, rescisao?: {
    tipoDemissao?: string; motivoDesligamentoId?: string; avisoPrevio?: string; observacaoRescisao?: string
  }) => Promise<void>
  onDescartarPendencia?: (id: string) => Promise<void>
  onImportTRCT?: (funcionarioId: string, trctData: Record<string, unknown>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function FuncionarioManager({ funcionarios, cargos, unidades, pendencias = [], motivosDesligamento = [], onAdd, onUpdate, onDemitir, onDescartarPendencia, onImportTRCT, onDelete }: FuncionarioManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('Funcionário cadastrado com sucesso!')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [demitindoId, setDemitindoId] = useState<string | null>(null)
  const [dataDemissao, setDataDemissão] = useState('')
  const [rescisaoForm, setRescisaoForm] = useState({
    tipoDemissao: 'sem_justa_causa', motivoDesligamentoId: '', avisoPrevio: 'indenizado',
    observacaoRescisao: '',
  })
  const [importingTRCT, setImportingTRCT] = useState<string | null>(null) // funcionarioId
  const [reajusteId, setReajusteId] = useState<string | null>(null)
  const [reajusteForm, setReajusteForm] = useState({ salarioNovo: '', motivo: '', registradoPor: '' })
  const [funcBenefícios, setFuncBenefícios] = useState<Record<string, Beneficio[]>>({})
  const [funcHistorico, setFuncHistorico] = useState<Record<string, HistoricoSalarial[]>>({})
  const [sortField, setSortField] = useState<'nome' | 'cargo' | 'unidade' | 'admissao' | 'contrato' | 'salario' | 'status'>('nome')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cargoId: '',
    unidadeId: '',
    dataAdmissao: '',
    salario: '',
    tipoContrato: 'clt',
    jornada: '',
    observacao: '',
    status: 'ativo',
    dataDemissao: '',
  })
  const [beneficiosForm, setBenefíciosForm] = useState<BeneficioForm[]>(
    beneficioTipos.map(b => ({ tipo: b.tipo, ativo: false, valorEmpresa: '', valorColaborador: '', percentualColaborador: '' }))
  )

  const handleSubmit = async () => {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const funcData = {
        nome: form.nome.trim(),
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        cargoId: form.cargoId || undefined,
        unidadeId: form.unidadeId || undefined,
        dataAdmissao: form.dataAdmissao || undefined,
        salario: form.salario ? parseFloat(form.salario) : undefined,
        tipoContrato: form.tipoContrato || undefined,
        jornada: form.jornada || undefined,
        status: form.status || 'ativo',
        observacao: form.observacao || undefined,
        dataDemissao: form.dataDemissao || undefined,
      }

      if (editingId && onUpdate) {
        await onUpdate(editingId, funcData)
      } else {
        await onAdd(funcData)
      }

      // Salvar beneficios ativos do novo funcionario
      const ativosBenefícios = beneficiosForm.filter(b => b.ativo)
      if (ativosBenefícios.length > 0) {
        // Pegar o ID do funcionario recem criado
        const { data: lastFunc } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('nome', form.nome.trim())
          .order('criado_em', { ascending: false })
          .limit(1)
          .single()

        if (lastFunc) {
          for (const b of ativosBenefícios) {
            await supabase.from('beneficios').insert({
              funcionario_id: lastFunc.id,
              tipo: b.tipo,
              valor_empresa: parseFloat(b.valorEmpresa) || 0,
              valor_colaborador: parseFloat(b.valorColaborador) || 0,
              percentual_colaborador: b.percentualColaborador ? parseFloat(b.percentualColaborador) : null,
              status: 'ativo',
            })
          }
        }
      }

      resetForm()
      setShowForm(false)
      setEditingId(null)
      setSuccessMsg(editingId ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar funcionario:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({ nome: '', cpf: '', telefone: '', email: '', cargoId: '', unidadeId: '', dataAdmissao: '', salario: '', tipoContrato: 'clt', jornada: '', observacao: '', status: 'ativo', dataDemissao: '' })
    setBenefíciosForm(beneficioTipos.map(b => ({ tipo: b.tipo, ativo: false, valorEmpresa: '', valorColaborador: '', percentualColaborador: '' })))
  }

  const handleEdit = (f: Funcionario) => {
    setForm({
      nome: f.nome,
      cpf: f.cpf || '',
      telefone: f.telefone || '',
      email: f.email || '',
      cargoId: f.cargoId || '',
      unidadeId: f.unidadeId || '',
      dataAdmissao: f.dataAdmissao || '',
      salario: f.salario ? String(f.salario) : '',
      tipoContrato: f.tipoContrato || 'clt',
      jornada: f.jornada || '',
      observacao: f.observacao || '',
      status: f.status || 'ativo',
      dataDemissao: f.dataDemissao || '',
    })
    setEditingId(f.id)
    setShowForm(true)
    setExpandedId(null)
  }

  const handleDemitir = async () => {
    if (!demitindoId || !dataDemissao || !onDemitir) return
    setSaving(true)
    try {
      await onDemitir(demitindoId, dataDemissao, {
        tipoDemissao: rescisaoForm.tipoDemissao || undefined,
        motivoDesligamentoId: rescisaoForm.motivoDesligamentoId || undefined,
        avisoPrevio: rescisaoForm.avisoPrevio || undefined,
        observacaoRescisao: rescisaoForm.observacaoRescisao || undefined,
      })
      setDemitindoId(null)
      setDataDemissão('')
      setRescisaoForm({ tipoDemissao: 'sem_justa_causa', motivoDesligamentoId: '', avisoPrevio: 'indenizado', observacaoRescisao: '' })
      setSuccessMsg('Funcionário demitido. Status alterado para inativo.')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao demitir:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReajuste = async (funcId: string) => {
    if (!reajusteForm.salarioNovo) return
    const func = funcionarios.find(f => f.id === funcId)
    if (!func) return
    setSaving(true)
    try {
      const salarioNovo = parseFloat(reajusteForm.salarioNovo)
      // Salvar historico
      await supabase.from('historico_salarial').insert({
        funcionario_id: funcId,
        salario_anterior: func.salario || 0,
        salario_novo: salarioNovo,
        data_reajuste: new Date().toISOString().split('T')[0],
        motivo: reajusteForm.motivo || null,
        registrado_por: reajusteForm.registradoPor || null,
      })
      // Atualizar salario do funcionario
      await supabase.from('funcionarios').update({ salario: salarioNovo }).eq('id', funcId)
      // Atualizar state local
      if (onUpdate) {
        await onUpdate(funcId, { salario: salarioNovo })
      }
      // Limpar historico cache para recarregar
      setFuncHistorico(prev => { const n = { ...prev }; delete n[funcId]; return n })
      setReajusteId(null)
      setReajusteForm({ salarioNovo: '', motivo: '', registradoPor: '' })
      setSuccessMsg('Reajuste salarial registrado com sucesso!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao registrar reajuste:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const toggleBeneficio = (tipo: string) => {
    setBenefíciosForm(prev => prev.map(b =>
      b.tipo === tipo ? { ...b, ativo: !b.ativo } : b
    ))
  }

  const updateBeneficio = (tipo: string, field: keyof BeneficioForm, value: string) => {
    setBenefíciosForm(prev => prev.map(b =>
      b.tipo === tipo ? { ...b, [field]: value } : b
    ))
  }

  // Carregar beneficios de um funcionario expandido
  const handleExpand = async (funcId: string) => {
    if (expandedId === funcId) {
      setExpandedId(null)
      return
    }
    setExpandedId(funcId)
    // Carregar beneficios e historico em paralelo
    if (!funcBenefícios[funcId]) {
      try {
        const [{ data }, { data: histData }] = await Promise.all([
          supabase.from('beneficios').select('*').eq('funcionario_id', funcId),
          supabase.from('historico_salarial').select('*').eq('funcionario_id', funcId).order('data_reajuste', { ascending: false }),
        ])
        setFuncHistorico(prev => ({
          ...prev,
          [funcId]: (histData || []).map((h: Record<string, unknown>) => ({
            id: h.id as string,
            salarioAnterior: Number(h.salario_anterior),
            salarioNovo: Number(h.salario_novo),
            dataReajuste: h.data_reajuste as string,
            motivo: (h.motivo as string) || undefined,
            registradoPor: (h.registrado_por as string) || undefined,
          })),
        }))
        setFuncBenefícios(prev => ({
          ...prev,
          [funcId]: (data || []).map(b => ({
            id: b.id,
            funcionarioId: b.funcionario_id,
            tipo: b.tipo,
            valorEmpresa: Number(b.valor_empresa) || 0,
            valorColaborador: Number(b.valor_colaborador) || 0,
            percentualColaborador: b.percentual_colaborador ? Number(b.percentual_colaborador) : undefined,
            descricao: b.descricao || undefined,
            status: b.status,
          })),
        }))
      } catch {
        // tabela pode nao existir
      }
    }
  }

  const ativos = funcionarios.filter(f => f.status === 'ativo')
  const beneficioLabel = (tipo: string) => beneficioTipos.find(b => b.tipo === tipo)?.label || tipo

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-[#E91E63]" /> : <ArrowDown size={12} className="text-[#E91E63]" />
  }

  const sortedFuncionarios = [...funcionarios].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'nome': return a.nome.localeCompare(b.nome) * dir
      case 'cargo': return (a.cargoNome || '').localeCompare(b.cargoNome || '') * dir
      case 'unidade': return (a.unidadeNome || '').localeCompare(b.unidadeNome || '') * dir
      case 'admissao': return (a.dataAdmissao || '').localeCompare(b.dataAdmissao || '') * dir
      case 'contrato': return (a.tipoContrato || '').localeCompare(b.tipoContrato || '') * dir
      case 'salario': return ((a.salario || 0) - (b.salario || 0)) * dir
      case 'status': return a.status.localeCompare(b.status) * dir
      default: return 0
    }
  })

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Pendências de RH */}
      {pendencias.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {pendencias.length} pendência(s) para resolver
            </span>
          </div>
          {pendencias.map(p => {
            const func = funcionarios.find(f => f.id === p.funcionarioId)
            const MESES_NOMES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{p.funcionarioNome || func?.nome}</p>
                  <p className="text-xs text-amber-600">{p.descricao}</p>
                  {p.mesReferencia && p.anoReferencia && (
                    <p className="text-xs text-gray-400">Ref: {MESES_NOMES[p.mesReferencia]}/{p.anoReferencia}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDemitindoId(p.funcionarioId); setDataDemissão('') }}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Foi desligado
                  </button>
                  <button
                    onClick={() => onDescartarPendencia?.(p.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    Continua ativo
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Equipe</h3>
              <p className="text-xs text-gray-500">{ativos.length} ativo(s) de {funcionarios.length} total</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              <UserPlus size={16} />
              Novo Funcionário
            </button>
          )}
        </div>

        {/* Form Modal */}
        <Modal open={showForm} onClose={handleCancelForm}
          title={editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
          subtitle="Preencha os dados do funcionário" size="lg">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dados Pessoais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="email@exemplo.com" />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Vinculo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
                <select value={form.cargoId} onChange={e => setForm({...form, cargoId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  <option value="">Selecione...</option>
                  {cargos.filter(c => c.status === 'ativo').map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                <select value={form.unidadeId} onChange={e => setForm({...form, unidadeId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  <option value="">Selecione...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Contrato</label>
                <select value={form.tipoContrato} onChange={e => setForm({...form, tipoContrato: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  {Object.entries(tipoContratoLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Admissão</label>
                <input type="date" value={form.dataAdmissao} onChange={e => setForm({...form, dataAdmissao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salário (R$)</label>
                <input type="number" step="0.01" value={form.salario} onChange={e => setForm({...form, salario: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jornada</label>
                <input type="text" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="Ex: Seg-Sab 09-18h" />
              </div>
            </div>

            {/* Benefícios */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Benefícios</p>
            <div className="space-y-2">
              {beneficiosForm.map(b => {
                const info = beneficioTipos.find(t => t.tipo === b.tipo)!
                return (
                  <div key={b.tipo} className={`rounded-lg border transition-colors ${b.ativo ? 'border-violet-200 bg-violet-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={b.ativo}
                        onChange={() => toggleBeneficio(b.tipo)}
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">{info.label}</span>
                        {info.descPadrao && <span className="text-xs text-gray-400 ml-2">{info.descPadrao}</span>}
                      </div>
                    </div>
                    {b.ativo && (
                      <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Valor Empresa (R$)</label>
                          <input type="number" step="0.01" value={b.valorEmpresa}
                            onChange={e => updateBeneficio(b.tipo, 'valorEmpresa', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-violet-300" placeholder="0,00" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Desconto Colaborador (R$)</label>
                          <input type="number" step="0.01" value={b.valorColaborador}
                            onChange={e => updateBeneficio(b.tipo, 'valorColaborador', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-violet-300" placeholder="0,00" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">% Colaborador</label>
                          <input type="number" step="0.1" value={b.percentualColaborador}
                            onChange={e => updateBeneficio(b.tipo, 'percentualColaborador', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-violet-300" placeholder="Ex: 6" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Status e demissão (só na edição) */}
            {editingId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="ferias">Férias</option>
                    <option value="afastado">Afastado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de demissão</label>
                  <input type="date" value={form.dataDemissao} onChange={e => setForm({...form, dataDemissao: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
              <textarea value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button onClick={handleCancelForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.nome.trim() || saving}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Tabela */}
        {funcionarios.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhum funcionário cadastrado. Clique em "+ Novo Funcionário" para comecar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2.5"><button onClick={() => toggleSort('nome')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800">Nome <SortIcon field="nome" /></button></th>
                  <th className="text-left px-3 py-2.5"><button onClick={() => toggleSort('cargo')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800">Cargo <SortIcon field="cargo" /></button></th>
                  <th className="text-left px-3 py-2.5"><button onClick={() => toggleSort('unidade')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800">Unidade <SortIcon field="unidade" /></button></th>
                  <th className="text-left px-3 py-2.5 hidden md:table-cell"><button onClick={() => toggleSort('admissao')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800">Admissão <SortIcon field="admissao" /></button></th>
                  <th className="text-left px-3 py-2.5"><button onClick={() => toggleSort('contrato')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800">Contrato <SortIcon field="contrato" /></button></th>
                  <th className="text-right px-3 py-2.5"><button onClick={() => toggleSort('salario')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800 ml-auto">Salário <SortIcon field="salario" /></button></th>
                  <th className="text-center px-3 py-2.5"><button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-800 mx-auto">Status <SortIcon field="status" /></button></th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedFuncionarios.map(f => (
                  <tr key={f.id} className={cn('hover:bg-gray-50/50', f.status !== 'ativo' && 'opacity-60')}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleEdit(f)} className="font-medium text-sm text-gray-800 hover:text-violet-600 text-left transition-colors">{f.nome}</button>
                      {f.telefone && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{f.telefone}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{f.cargoNome || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{f.unidadeNome || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 hidden md:table-cell">
                      {f.dataAdmissao ? new Date(f.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{tipoContratoLabels[f.tipoContrato || ''] || '-'}</td>
                    <td className="px-3 py-2.5 text-sm text-right text-green-700 font-medium">
                      {f.salario ? `R$ ${f.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusLabels[f.status]?.color || 'bg-gray-100 text-gray-500')}>
                        {statusLabels[f.status]?.label || f.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { handleExpand(f.id) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Detalhes">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => handleEdit(f)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        {f.status === 'ativo' && (
                          <button onClick={() => { setReajusteId(f.id); setReajusteForm({ salarioNovo: '', motivo: '', registradoPor: '' }) }}
                            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Reajuste salarial">
                            <DollarSign size={14} />
                          </button>
                        )}
                        {f.status === 'ativo' && onDemitir && (
                          <button onClick={() => { setDemitindoId(f.id); setDataDemissão(new Date().toISOString().split('T')[0]) }}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Desligar">
                            <UserX size={14} />
                          </button>
                        )}
                        {f.status === 'inativo' && f.trctStatus === 'pendente' && onImportTRCT && (
                          <button onClick={() => setImportingTRCT(f.id)}
                            className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium hover:bg-amber-200"
                            title="Importar TRCT">
                            TRCT
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => { if (confirm(`Excluir "${f.nome}" permanentemente? Esta ação não pode ser desfeita.`)) onDelete(f.id) }}
                            className="p-1.5 text-gray-300 hover:text-red-600 transition-colors" title="Excluir funcionário">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalhes */}
      <Modal open={!!expandedId} onClose={() => setExpandedId(null)}
        title={funcionarios.find(f => f.id === expandedId)?.nome || 'Funcionario'}
        subtitle="Detalhes, beneficios e historico salarial" size="lg">
        {(() => {
          const f = funcionarios.find(fn => fn.id === expandedId)
          if (!f) return null
          const bens = funcBenefícios[f.id] || []
          const hist = funcHistorico[f.id] || []
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {f.dataAdmissao && <div><span className="text-gray-400 text-xs">Admissao</span><br/><span className="text-gray-700">{new Date(f.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>}
                {f.dataDemissao && <div><span className="text-gray-400 text-xs">Demissão</span><br/><span className="text-red-600">{new Date(f.dataDemissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>}
                {f.cpf && <div><span className="text-gray-400 text-xs">CPF</span><br/><span className="text-gray-700">{f.cpf}</span></div>}
                {f.email && <div><span className="text-gray-400 text-xs">Email</span><br/><span className="text-gray-700">{f.email}</span></div>}
                {f.jornada && <div><span className="text-gray-400 text-xs">Jornada</span><br/><span className="text-gray-700">{f.jornada}</span></div>}
                {f.salario && <div><span className="text-gray-400 text-xs">Salario</span><br/><span className="text-green-700 font-semibold">R$ {f.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
              </div>
              {f.observacao && <p className="text-sm text-gray-500"><span className="text-gray-400">Obs:</span> {f.observacao}</p>}

              {/* Dados da Rescisão (funcionário inativo) */}
              {f.status === 'inativo' && (
                <div className="bg-red-50/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1"><FileText size={14} /> Dados da Rescisão</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {f.tipoDemissao && <div><span className="text-gray-400 text-xs">Tipo</span><br/><span className="text-gray-700">{tipoDemissaoLabels[f.tipoDemissao] || f.tipoDemissao}</span></div>}
                    {f.avisoPrevio && <div><span className="text-gray-400 text-xs">Aviso prévio</span><br/><span className="text-gray-700 capitalize">{f.avisoPrevio}</span></div>}
                    {f.causaAfastamento && <div><span className="text-gray-400 text-xs">Causa ({f.codAfastamento})</span><br/><span className="text-gray-700">{f.causaAfastamento}</span></div>}
                    {f.valorRescisao && <div><span className="text-gray-400 text-xs">Valor líquido rescisão</span><br/><span className="text-red-700 font-semibold">R$ {f.valorRescisao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                    {f.multaFgts && <div><span className="text-gray-400 text-xs">Multa FGTS</span><br/><span className="text-gray-700">R$ {f.multaFgts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                  </div>
                  {f.observacaoRescisao && <p className="text-xs text-gray-500">{f.observacaoRescisao}</p>}

                  {/* Detalhamento TRCT */}
                  {f.trctStatus === 'importado' && f.trctTotalBruto && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <p className="text-xs font-semibold text-red-600 mb-1.5">Verbas Rescisórias (TRCT)</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <p className="text-gray-500 font-medium col-span-2">Proventos:</p>
                        {f.trctSaldoSalario ? <div className="flex justify-between"><span className="text-gray-600">Saldo salário</span><span className="text-gray-800">R$ {f.trctSaldoSalario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trct13Proporcional ? <div className="flex justify-between"><span className="text-gray-600">13º proporcional</span><span className="text-gray-800">R$ {f.trct13Proporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctFeriasProporcionais ? <div className="flex justify-between"><span className="text-gray-600">Férias proporcionais</span><span className="text-gray-800">R$ {f.trctFeriasProporcionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctFeriasVencidas ? <div className="flex justify-between"><span className="text-gray-600">Férias vencidas</span><span className="text-gray-800">R$ {f.trctFeriasVencidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctTercoFerias ? <div className="flex justify-between"><span className="text-gray-600">1/3 férias</span><span className="text-gray-800">R$ {f.trctTercoFerias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctAvisoIndenizado ? <div className="flex justify-between"><span className="text-gray-600">Aviso indenizado</span><span className="text-gray-800">R$ {f.trctAvisoIndenizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctHorasExtras ? <div className="flex justify-between"><span className="text-gray-600">Horas extras</span><span className="text-gray-800">R$ {f.trctHorasExtras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctMulta477 ? <div className="flex justify-between"><span className="text-gray-600">Multa art. 477</span><span className="text-gray-800">R$ {f.trctMulta477.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctMulta479 ? <div className="flex justify-between"><span className="text-gray-600">Multa art. 479</span><span className="text-gray-800">R$ {f.trctMulta479.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        <div className="flex justify-between font-semibold border-t border-red-100 pt-1 col-span-2 sm:col-span-1"><span className="text-gray-700">Total bruto</span><span className="text-gray-900">R$ {f.trctTotalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>

                        <p className="text-gray-500 font-medium col-span-2 mt-1">Deduções:</p>
                        {f.trctInss ? <div className="flex justify-between"><span className="text-gray-600">INSS</span><span className="text-red-600">-R$ {f.trctInss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctIrrf ? <div className="flex justify-between"><span className="text-gray-600">IRRF</span><span className="text-red-600">-R$ {f.trctIrrf.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctAdiantamento ? <div className="flex justify-between"><span className="text-gray-600">Adiantamento</span><span className="text-red-600">-R$ {f.trctAdiantamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctPensao ? <div className="flex justify-between"><span className="text-gray-600">Pensão alimentícia</span><span className="text-red-600">-R$ {f.trctPensao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}
                        {f.trctTotalDeducoes ? <div className="flex justify-between font-semibold border-t border-red-100 pt-1"><span className="text-gray-700">Total deduções</span><span className="text-red-700">-R$ {f.trctTotalDeducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div> : null}

                        {f.trctValorLiquido && <div className="flex justify-between font-bold bg-red-100 rounded px-2 py-1 col-span-2 mt-1"><span className="text-red-800">Valor líquido</span><span className="text-red-800">R$ {f.trctValorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {bens.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 flex items-center gap-1 mb-2"><Gift size={14} /> Benefícios</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bens.filter(b => b.status === 'ativo').map(b => (
                      <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-violet-50/50 rounded-lg text-sm">
                        <span className="font-medium text-violet-700">{beneficioLabel(b.tipo)}</span>
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          {b.valorEmpresa > 0 && <span>Empresa: R$ {b.valorEmpresa.toFixed(2)}</span>}
                          {b.valorColaborador > 0 && <span>Desc: R$ {b.valorColaborador.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hist.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 flex items-center gap-1 mb-2"><TrendingUp size={14} /> Histórico Salarial</p>
                  <div className="space-y-1">
                    {hist.map(h => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-green-50/50 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{new Date(h.dataReajuste + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          <span className="text-gray-400">R$ {h.salarioAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-semibold text-green-700">R$ {h.salarioNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {h.motivo && <span className="text-gray-400 text-xs">{h.motivo}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Modal Reajuste */}
      <Modal open={!!reajusteId} onClose={() => { setReajusteId(null); setReajusteForm({ salarioNovo: '', motivo: '', registradoPor: '' }) }}
        title="Reajuste Salarial"
        subtitle={(() => { const f = funcionarios.find(fn => fn.id === reajusteId); return f ? `${f.nome} — atual: R$ ${(f.salario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '' })()} size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Novo salario (R$) *</label>
              <input type="number" step="0.01" value={reajusteForm.salarioNovo}
                onChange={e => setReajusteForm({ ...reajusteForm, salarioNovo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
              <input type="text" value={reajusteForm.motivo}
                onChange={e => setReajusteForm({ ...reajusteForm, motivo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400" placeholder="Ex: Dissidio, Merito..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Registrado por</label>
              <select value={reajusteForm.registradoPor}
                onChange={e => setReajusteForm({ ...reajusteForm, registradoPor: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400">
                <option value="">Selecione...</option>
                {funcionarios.filter(fn => fn.status === 'ativo').map(fn => (
                  <option key={fn.id} value={fn.nome}>{fn.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => { setReajusteId(null); setReajusteForm({ salarioNovo: '', motivo: '', registradoPor: '' }) }}
              className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
            <button onClick={() => reajusteId && handleReajuste(reajusteId)} disabled={!reajusteForm.salarioNovo || saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Confirmar Reajuste'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Desligamento (etapa 1 - sem valores financeiros) */}
      <Modal open={!!demitindoId} onClose={() => { setDemitindoId(null); setDataDemissão('') }}
        title="Registrar Desligamento"
        subtitle={funcionarios.find(fn => fn.id === demitindoId)?.nome || ''} size="md">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
            Registre o desligamento agora. Os valores financeiros (rescisão, multa FGTS) serão importados quando a contabilidade enviar o TRCT.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de desligamento *</label>
              <input type="date" value={dataDemissao}
                onChange={e => setDataDemissão(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={rescisaoForm.tipoDemissao}
                onChange={e => setRescisaoForm({ ...rescisaoForm, tipoDemissao: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400">
                {Object.entries(tipoDemissaoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aviso prévio</label>
              <select value={rescisaoForm.avisoPrevio}
                onChange={e => setRescisaoForm({ ...rescisaoForm, avisoPrevio: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400">
                {Object.entries(avisoPrevioLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo do desligamento</label>
              <select value={rescisaoForm.motivoDesligamentoId}
                onChange={e => setRescisaoForm({ ...rescisaoForm, motivoDesligamentoId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400">
                <option value="">Selecione...</option>
                {motivosDesligamento.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea value={rescisaoForm.observacaoRescisao}
              onChange={e => setRescisaoForm({ ...rescisaoForm, observacaoRescisao: e.target.value })}
              rows={2} placeholder="Informações adicionais..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-400" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => { setDemitindoId(null); setDataDemissão('') }}
              className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
            <button onClick={handleDemitir} disabled={!dataDemissao || saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Processando...' : 'Confirmar Desligamento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Importar TRCT (etapa 2) */}
      <Modal open={!!importingTRCT} onClose={() => setImportingTRCT(null)}
        title="Importar TRCT"
        subtitle={funcionarios.find(fn => fn.id === importingTRCT)?.nome || ''} size="sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            Importe o PDF do Termo de Rescisão (TRCT) enviado pela contabilidade.
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#E91E63] text-white rounded-xl cursor-pointer text-sm font-medium hover:bg-[#C2185B]">
            <Upload size={18} />
            Selecionar PDF do TRCT
            <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !importingTRCT || !onImportTRCT) return
              setSaving(true)
              try {
                const trctData = await parseTRCTPDF(file)
                await onImportTRCT(importingTRCT, trctData as unknown as Record<string, unknown>)
                setImportingTRCT(null)
                setSuccessMsg('TRCT importado com sucesso! Valores de rescisão atualizados.')
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 4000)
              } catch (err) {
                setSuccessMsg(err instanceof Error ? err.message : 'Erro ao processar TRCT')
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 4000)
              } finally {
                setSaving(false)
              }
            }} />
          </label>
          <p className="text-xs text-gray-400">Formato: PDF do TRCT padrão MTE</p>
        </div>
      </Modal>
    </div>
  )
}
