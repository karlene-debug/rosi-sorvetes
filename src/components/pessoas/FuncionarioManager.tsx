import { useState } from 'react'
import { UserPlus, Users, Phone, Mail, CheckCircle, Gift, ChevronDown, ChevronUp, Pencil, UserX, X } from 'lucide-react'
import type { Cargo, Funcionario, Beneficio } from './PessoasSection'
import type { Unidade } from '@/data/productTypes'
import { supabase } from '@/lib/supabase'

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
  { tipo: 'vt', label: 'Vale Transporte (VT)', descPadrao: 'Desconto de 6% do salario' },
  { tipo: 'vr', label: 'Vale Refeicao (VR)', descPadrao: '' },
  { tipo: 'va', label: 'Vale Alimentacao (VA)', descPadrao: '' },
  { tipo: 'plano_saude', label: 'Plano de Saude', descPadrao: '' },
  { tipo: 'cesta_basica', label: 'Cesta Basica', descPadrao: '' },
  { tipo: 'outros', label: 'Outros', descPadrao: '' },
]

interface BeneficioForm {
  tipo: string
  ativo: boolean
  valorEmpresa: string
  valorColaborador: string
  percentualColaborador: string
}

interface FuncionarioManagerProps {
  funcionarios: Funcionario[]
  cargos: Cargo[]
  unidades: Unidade[]
  onAdd: (f: Omit<Funcionario, 'id' | 'cargoNome' | 'unidadeNome'>) => Promise<void>
  onUpdate?: (id: string, f: Partial<Funcionario>) => Promise<void>
  onDemitir?: (id: string, dataDemissao: string) => Promise<void>
}

export function FuncionarioManager({ funcionarios, cargos, unidades, onAdd, onUpdate, onDemitir }: FuncionarioManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState('Funcionario cadastrado com sucesso!')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [demitindoId, setDemitindoId] = useState<string | null>(null)
  const [dataDemissao, setDataDemissao] = useState('')
  const [funcBeneficios, setFuncBeneficios] = useState<Record<string, Beneficio[]>>({})
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
  })
  const [beneficiosForm, setBeneficiosForm] = useState<BeneficioForm[]>(
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
        status: 'ativo' as const,
        observacao: form.observacao || undefined,
      }

      if (editingId && onUpdate) {
        await onUpdate(editingId, funcData)
      } else {
        await onAdd(funcData)
      }

      // Salvar beneficios ativos do novo funcionario
      const ativosBeneficios = beneficiosForm.filter(b => b.ativo)
      if (ativosBeneficios.length > 0) {
        // Pegar o ID do funcionario recem criado
        const { data: lastFunc } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('nome', form.nome.trim())
          .order('criado_em', { ascending: false })
          .limit(1)
          .single()

        if (lastFunc) {
          for (const b of ativosBeneficios) {
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
      setSuccessMsg(editingId ? 'Funcionario atualizado com sucesso!' : 'Funcionario cadastrado com sucesso!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar funcionario:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setForm({ nome: '', cpf: '', telefone: '', email: '', cargoId: '', unidadeId: '', dataAdmissao: '', salario: '', tipoContrato: 'clt', jornada: '', observacao: '' })
    setBeneficiosForm(beneficioTipos.map(b => ({ tipo: b.tipo, ativo: false, valorEmpresa: '', valorColaborador: '', percentualColaborador: '' })))
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
    })
    setEditingId(f.id)
    setShowForm(true)
    setExpandedId(null)
  }

  const handleDemitir = async () => {
    if (!demitindoId || !dataDemissao || !onDemitir) return
    setSaving(true)
    try {
      await onDemitir(demitindoId, dataDemissao)
      setDemitindoId(null)
      setDataDemissao('')
      setSuccessMsg('Funcionario demitido. Status alterado para inativo.')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao demitir:', err)
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
    setBeneficiosForm(prev => prev.map(b =>
      b.tipo === tipo ? { ...b, ativo: !b.ativo } : b
    ))
  }

  const updateBeneficio = (tipo: string, field: keyof BeneficioForm, value: string) => {
    setBeneficiosForm(prev => prev.map(b =>
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
    if (!funcBeneficios[funcId]) {
      try {
        const { data } = await supabase
          .from('beneficios')
          .select('*')
          .eq('funcionario_id', funcId)
        setFuncBeneficios(prev => ({
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

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">{successMsg}</p>
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
              Novo Funcionario
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {editingId ? 'Editar Funcionario' : 'Novo Funcionario'}
              </p>
              <button onClick={handleCancelForm} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Admissao</label>
                <input type="date" value={form.dataAdmissao} onChange={e => setForm({...form, dataAdmissao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salario (R$)</label>
                <input type="number" step="0.01" value={form.salario} onChange={e => setForm({...form, salario: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jornada</label>
                <input type="text" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="Ex: Seg-Sab 09-18h" />
              </div>
            </div>

            {/* Beneficios */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Beneficios</p>
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
                          <label className="block text-[10px] text-gray-500 mb-0.5">Valor Empresa (R$)</label>
                          <input type="number" step="0.01" value={b.valorEmpresa}
                            onChange={e => updateBeneficio(b.tipo, 'valorEmpresa', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-violet-300" placeholder="0,00" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Desconto Colaborador (R$)</label>
                          <input type="number" step="0.01" value={b.valorColaborador}
                            onChange={e => updateBeneficio(b.tipo, 'valorColaborador', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-violet-300" placeholder="0,00" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">% Colaborador</label>
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observacao</label>
              <textarea value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleCancelForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.nome.trim() || saving}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : editingId ? 'Salvar Alteracoes' : 'Cadastrar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {funcionarios.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum funcionario cadastrado. Clique em "+ Novo Funcionario" para comecar.
            </div>
          ) : (
            funcionarios.map(f => {
              const isExpanded = expandedId === f.id
              const bens = funcBeneficios[f.id] || []
              return (
                <div key={f.id} className={`rounded-lg border border-gray-100 transition-colors ${f.status !== 'ativo' ? 'opacity-60' : ''}`}>
                  <button
                    onClick={() => handleExpand(f.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                        {f.cargoNome && (
                          <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">{f.cargoNome}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabels[f.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                          {statusLabels[f.status]?.label || f.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {f.unidadeNome && <span className="text-xs text-gray-400">{f.unidadeNome}</span>}
                        {f.telefone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} /> {f.telefone}</span>}
                        {f.email && <span className="text-xs text-gray-400 items-center gap-1 hidden sm:flex"><Mail size={10} /> {f.email}</span>}
                        {f.tipoContrato && <span className="text-xs text-gray-400">{tipoContratoLabels[f.tipoContrato] || f.tipoContrato}</span>}
                        {f.salario && <span className="text-xs text-green-600 hidden sm:block">R$ {f.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-50 pt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {f.dataAdmissao && (
                          <div><span className="text-gray-400">Admissao:</span> <span className="text-gray-700">{new Date(f.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
                        )}
                        {f.dataDemissao && (
                          <div><span className="text-gray-400">Demissao:</span> <span className="text-red-600">{new Date(f.dataDemissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span></div>
                        )}
                        {f.jornada && (
                          <div><span className="text-gray-400">Jornada:</span> <span className="text-gray-700">{f.jornada}</span></div>
                        )}
                        {f.cpf && (
                          <div><span className="text-gray-400">CPF:</span> <span className="text-gray-700">{f.cpf}</span></div>
                        )}
                        {f.salario && (
                          <div><span className="text-gray-400">Salario:</span> <span className="text-gray-700">R$ {f.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                        )}
                      </div>

                      {/* Beneficios do funcionario */}
                      {bens.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-2">
                            <Gift size={12} /> Beneficios
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {bens.filter(b => b.status === 'ativo').map(b => (
                              <div key={b.id} className="flex items-center justify-between px-2.5 py-1.5 bg-violet-50/50 rounded text-xs">
                                <span className="font-medium text-violet-700">{beneficioLabel(b.tipo)}</span>
                                <div className="flex items-center gap-2 text-gray-500">
                                  {b.valorEmpresa > 0 && <span>Empresa: R$ {b.valorEmpresa.toFixed(2)}</span>}
                                  {b.valorColaborador > 0 && <span>Desc: R$ {b.valorColaborador.toFixed(2)}</span>}
                                  {b.percentualColaborador && <span>({b.percentualColaborador}%)</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {f.observacao && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="text-gray-400">Obs:</span> {f.observacao}
                        </div>
                      )}

                      {/* Demitir modal inline */}
                      {demitindoId === f.id && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs font-semibold text-red-700 mb-2">Confirmar demissao de {f.nome}</p>
                          <div className="flex items-center gap-3">
                            <div>
                              <label className="block text-[10px] text-red-600 mb-0.5">Data de demissao *</label>
                              <input
                                type="date"
                                value={dataDemissao}
                                onChange={e => setDataDemissao(e.target.value)}
                                className="px-2 py-1.5 bg-white border border-red-200 rounded text-xs focus:outline-none focus:border-red-400"
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => { setDemitindoId(null); setDataDemissao('') }}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                                Cancelar
                              </button>
                              <button onClick={handleDemitir} disabled={!dataDemissao || saving}
                                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                                {saving ? 'Processando...' : 'Confirmar Demissao'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {demitindoId !== f.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                          <button
                            onClick={() => handleEdit(f)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                          >
                            <Pencil size={12} />
                            Editar
                          </button>
                          {f.status === 'ativo' && onDemitir && (
                            <button
                              onClick={() => { setDemitindoId(f.id); setDataDemissao(new Date().toISOString().split('T')[0]) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <UserX size={12} />
                              Demitir
                            </button>
                          )}
                        </div>
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
