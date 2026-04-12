import { useState, useEffect, useCallback } from 'react'
import { Users, Briefcase, AlertCircle, Loader2, WifiOff, Palmtree, BarChart3, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FuncionarioManager } from './FuncionarioManager'
import { CargoManager } from './CargoManager'
import { OcorrenciaManager } from './OcorrenciaManager'
import { FeriasManager } from './FeriasManager'
import { IndicadoresRH } from './IndicadoresRH'
import { FolhaPagamentoManager } from './FolhaPagamentoManager'
import type { Unidade } from '@/data/productTypes'
import { supabase } from '@/lib/supabase'

// ============================================
// TIPOS LOCAIS
// ============================================

export interface Cargo {
  id: string
  nome: string
  descricaoAtividades?: string
  departamento?: string
  faixaSalarialMin?: number
  faixaSalarialMax?: number
  status: string
}

export interface Funcionario {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  cargoId?: string
  cargoNome?: string
  unidadeId?: string
  unidadeNome?: string
  dataAdmissao?: string
  dataDemissao?: string
  salario?: number
  tipoContrato?: string
  jornada?: string
  status: string
  observacao?: string
  // Rescisão
  motivoDemissao?: string
  motivoDesligamentoId?: string
  tipoDemissao?: string
  avisoPrevio?: string
  multaFgts?: number
  valorRescisao?: number
  saldoFgts?: number
  observacaoRescisao?: string
  causaAfastamento?: string
  codAfastamento?: string
  trctStatus?: string // null, pendente, importado
  trctTotalBruto?: number
  trctTotalDeducoes?: number
  trctValorLiquido?: number
}

export interface MotivoDesligamento {
  id: string
  descricao: string
  categoria: string
  status: string
}

export interface PendenciaRH {
  id: string
  funcionarioId: string
  funcionarioNome?: string
  tipo: string
  descricao: string
  mesReferencia?: number
  anoReferencia?: number
  status: string
  resposta?: string
  criadoEm: string
}

export interface Beneficio {
  id: string
  funcionarioId: string
  tipo: string
  valorEmpresa: number
  valorColaborador: number
  percentualColaborador?: number
  descricao?: string
  status: string
}

export interface Ocorrencia {
  id: string
  funcionarioId: string
  funcionarioNome?: string
  data: string
  dataFim?: string
  tipo: string
  descricao?: string
  dias: number
  documentoUrl?: string
  registradoPor?: string
}

export interface Ferias {
  id: string
  funcionarioId: string
  funcionarioNome?: string
  unidadeNome?: string
  periodoAquisitivoInicio: string
  periodoAquisitivoFim: string
  dataLimite: string
  dataInicio?: string
  dataFim?: string
  dias: number
  venderDias?: number
  dataConfirmacao?: string
  status: string
  alerta?: string
  observacao?: string
}

type PessoasTab = 'indicadores' | 'funcionarios' | 'folha' | 'cargos' | 'ocorrencias' | 'ferias'

const tabs: { id: PessoasTab; label: string; icon: React.ReactNode }[] = [
  { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
  { id: 'funcionarios', label: 'Funcionários', icon: <Users size={16} /> },
  { id: 'folha', label: 'Folha', icon: <Wallet size={16} /> },
  { id: 'cargos', label: 'Cargos', icon: <Briefcase size={16} /> },
  { id: 'ocorrencias', label: 'Ocorrências', icon: <AlertCircle size={16} /> },
  { id: 'ferias', label: 'Férias', icon: <Palmtree size={16} /> },
]

interface PessoasSectionProps {
  unidades: Unidade[]
  unidadeSelecionada?: string
}

export function PessoasSection({ unidades, unidadeSelecionada }: PessoasSectionProps) {
  const [activeTab, setActiveTab] = useState<PessoasTab>('indicadores')
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [ferias, setFerias] = useState<Ferias[]>([])
  const [pendencias, setPendencias] = useState<PendenciaRH[]>([])
  const [motivosDesligamento, setMotivosDesligamento] = useState<MotivoDesligamento[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // Todas as queries em paralelo
      const [
        { data: cargosData, error: cErr },
        { data: funcData, error: fErr },
        { data: ocData, error: oErr },
        feriasResult,
        pendenciasResult,
        motivosResult,
      ] = await Promise.all([
        supabase.from('cargos').select('*').order('nome'),
        supabase.from('funcionarios').select('*, cargos(nome), unidades(nome)').order('nome'),
        supabase.from('ocorrencias').select('*, funcionarios(nome)').order('data', { ascending: false }).limit(200),
        supabase.from('vw_ferias_vencimentos').select('*').then(
          (r: { data: Record<string, unknown>[] | null }) => r,
          () => ({ data: null })
        ),
        supabase.from('pendencias_rh').select('*, funcionarios(nome)').eq('status', 'pendente').order('criado_em', { ascending: false }).then(
          (r: { data: Record<string, unknown>[] | null }) => r,
          () => ({ data: null })
        ),
        supabase.from('motivos_desligamento').select('*').eq('status', 'ativo').order('descricao').then(
          (r: { data: Record<string, unknown>[] | null }) => r,
          () => ({ data: null })
        ),
      ])

      if (cErr) throw cErr
      if (fErr) throw fErr
      if (oErr) throw oErr

      setCargos((cargosData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string, nome: c.nome as string,
        descricaoAtividades: (c.descricao_atividades as string) || undefined,
        departamento: (c.departamento as string) || undefined,
        faixaSalarialMin: c.faixa_salarial_min ? Number(c.faixa_salarial_min) : undefined,
        faixaSalarialMax: c.faixa_salarial_max ? Number(c.faixa_salarial_max) : undefined,
        status: c.status as string,
      })))

      setFuncionarios((funcData || []).map((f: Record<string, unknown>) => ({
        id: f.id as string, nome: f.nome as string,
        cpf: (f.cpf as string) || undefined, telefone: (f.telefone as string) || undefined, email: (f.email as string) || undefined,
        cargoId: (f.cargo_id as string) || undefined, cargoNome: (f.cargos as Record<string, string> | null)?.nome || undefined,
        unidadeId: (f.unidade_id as string) || undefined, unidadeNome: (f.unidades as Record<string, string> | null)?.nome || undefined,
        dataAdmissao: (f.data_admissao as string) || undefined, dataDemissao: (f.data_demissao as string) || undefined,
        salario: f.salario ? Number(f.salario) : undefined,
        tipoContrato: (f.tipo_contrato as string) || undefined, jornada: (f.jornada as string) || undefined,
        status: f.status as string, observacao: (f.observacao as string) || undefined,
        motivoDemissao: (f.motivo_demissao as string) || undefined,
        tipoDemissao: (f.tipo_demissao as string) || undefined,
        avisoPrevio: (f.aviso_previo as string) || undefined,
        multaFgts: f.multa_fgts ? Number(f.multa_fgts) : undefined,
        valorRescisao: f.valor_rescisao ? Number(f.valor_rescisao) : undefined,
        saldoFgts: f.saldo_fgts ? Number(f.saldo_fgts) : undefined,
        observacaoRescisao: (f.observacao_rescisao as string) || undefined,
      })))

      setOcorrencias((ocData || []).map((o: Record<string, unknown>) => ({
        id: o.id as string, funcionarioId: o.funcionario_id as string,
        funcionarioNome: (o.funcionarios as Record<string, string> | null)?.nome || undefined,
        data: o.data as string, tipo: o.tipo as string, descricao: (o.descricao as string) || undefined,
        dias: (o.dias as number) || 1, documentoUrl: (o.documento_url as string) || undefined,
        registradoPor: (o.registrado_por as string) || undefined,
      })))

      const fData = feriasResult?.data
      setFerias((fData || []).map((f: Record<string, unknown>) => ({
        id: f.id as string, funcionarioId: f.funcionario_id as string,
        funcionarioNome: (f.funcionario_nome as string) || undefined, unidadeNome: (f.unidade_nome as string) || undefined,
        periodoAquisitivoInicio: f.periodo_aquisitivo_inicio as string,
        periodoAquisitivoFim: f.periodo_aquisitivo_fim as string, dataLimite: f.data_limite as string,
        dataInicio: (f.data_inicio as string) || undefined, dataFim: (f.data_fim as string) || undefined,
        dias: (f.dias as number) || 30,
        venderDias: (f.vender_dias as number) || 0,
        dataConfirmacao: (f.data_confirmacao as string) || undefined,
        status: f.status as string,
        alerta: (f.alerta as string) || undefined, observacao: (f.observacao as string) || undefined,
      })))

      const pData = pendenciasResult?.data
      setPendencias((pData || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        funcionarioId: p.funcionario_id as string,
        funcionarioNome: (p.funcionarios as Record<string, string> | null)?.nome || undefined,
        tipo: p.tipo as string,
        descricao: p.descricao as string,
        mesReferencia: (p.mes_referencia as number) || undefined,
        anoReferencia: (p.ano_referencia as number) || undefined,
        status: p.status as string,
        resposta: (p.resposta as string) || undefined,
        criadoEm: p.criado_em as string,
      })))

      const mData = motivosResult?.data
      setMotivosDesligamento((mData || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        descricao: m.descricao as string,
        categoria: (m.categoria as string) || 'voluntario',
        status: m.status as string,
      })))

      setConnected(true)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === HANDLERS ===

  const handleAddFuncionario = async (f: Omit<Funcionario, 'id' | 'cargoNome' | 'unidadeNome'>) => {
    const { data, error } = await supabase
      .from('funcionarios')
      .insert({
        nome: f.nome,
        cpf: f.cpf || null,
        telefone: f.telefone || null,
        email: f.email || null,
        cargo_id: f.cargoId || null,
        unidade_id: f.unidadeId || null,
        data_admissao: f.dataAdmissao || null,
        salario: f.salario || null,
        tipo_contrato: f.tipoContrato || null,
        jornada: f.jornada || null,
        status: f.status,
        observacao: f.observacao || null,
      })
      .select('*, cargos(nome), unidades(nome)')
      .single()
    if (error) throw error
    const novo: Funcionario = {
      id: data.id,
      nome: data.nome,
      cpf: data.cpf || undefined,
      telefone: data.telefone || undefined,
      email: data.email || undefined,
      cargoId: data.cargo_id || undefined,
      cargoNome: data.cargos?.nome || undefined,
      unidadeId: data.unidade_id || undefined,
      unidadeNome: data.unidades?.nome || undefined,
      dataAdmissao: data.data_admissao || undefined,
      salario: data.salario ? Number(data.salario) : undefined,
      tipoContrato: data.tipo_contrato || undefined,
      jornada: data.jornada || undefined,
      status: data.status,
      observacao: data.observacao || undefined,
    }
    setFuncionarios(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
  }

  const handleUpdateFuncionario = async (id: string, updates: Partial<Funcionario>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf || null
    if (updates.telefone !== undefined) dbUpdates.telefone = updates.telefone || null
    if (updates.email !== undefined) dbUpdates.email = updates.email || null
    if (updates.cargoId !== undefined) dbUpdates.cargo_id = updates.cargoId || null
    if (updates.unidadeId !== undefined) dbUpdates.unidade_id = updates.unidadeId || null
    if (updates.dataAdmissao !== undefined) dbUpdates.data_admissao = updates.dataAdmissao || null
    if (updates.salario !== undefined) dbUpdates.salario = updates.salario || null
    if (updates.tipoContrato !== undefined) dbUpdates.tipo_contrato = updates.tipoContrato || null
    if (updates.jornada !== undefined) dbUpdates.jornada = updates.jornada || null
    if (updates.observacao !== undefined) dbUpdates.observacao = updates.observacao || null
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.dataDemissao !== undefined) dbUpdates.data_demissao = updates.dataDemissao || null

    const { data, error } = await supabase
      .from('funcionarios')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, cargos(nome), unidades(nome)')
      .single()
    if (error) throw error

    setFuncionarios(prev => prev.map(f => f.id === id ? {
      ...f,
      ...updates,
      cargoNome: data.cargos?.nome || undefined,
      unidadeNome: data.unidades?.nome || undefined,
    } : f))
  }

  const handleDemitirFuncionario = async (id: string, dataDemissao: string, rescisao?: {
    tipoDemissao?: string; motivoDesligamentoId?: string; avisoPrevio?: string; observacaoRescisao?: string
  }) => {
    const updates: Record<string, unknown> = {
      status: 'inativo',
      data_demissao: dataDemissao,
      trct_status: 'pendente', // TRCT fica pendente até importar
    }
    if (rescisao) {
      if (rescisao.tipoDemissao) updates.tipo_demissao = rescisao.tipoDemissao
      if (rescisao.motivoDesligamentoId) updates.motivo_desligamento_id = rescisao.motivoDesligamentoId
      if (rescisao.avisoPrevio) updates.aviso_previo = rescisao.avisoPrevio
      if (rescisao.observacaoRescisao) updates.observacao_rescisao = rescisao.observacaoRescisao
    }
    const { error } = await supabase.from('funcionarios').update(updates).eq('id', id)
    if (error) throw error

    setFuncionarios(prev => prev.map(f => f.id === id ? {
      ...f, status: 'inativo', dataDemissao, trctStatus: 'pendente', ...rescisao,
    } : f))

    // Resolver pendências deste funcionário
    await supabase.from('pendencias_rh')
      .update({ status: 'resolvida', resposta: 'Desligado', resolvido_em: new Date().toISOString() })
      .eq('funcionario_id', id)
      .eq('status', 'pendente')
    setPendencias(prev => prev.filter(p => p.funcionarioId !== id))
  }

  const handleDescartarPendencia = async (pendenciaId: string) => {
    await supabase.from('pendencias_rh')
      .update({ status: 'descartada', resposta: 'Continua ativo', resolvido_em: new Date().toISOString() })
      .eq('id', pendenciaId)
    setPendencias(prev => prev.filter(p => p.id !== pendenciaId))
  }

  const handleImportTRCT = async (funcionarioId: string, trctData: Record<string, unknown>) => {
    // Validar CPF: verificar se o CPF do TRCT bate com o funcionário
    const func = funcionarios.find(f => f.id === funcionarioId)
    const cpfTRCT = ((trctData.cpfTrabalhador as string) || '').replace(/[.\-/\s]/g, '')
    const cpfFunc = (func?.cpf || '').replace(/[.\-/\s]/g, '')
    if (cpfTRCT && cpfFunc && cpfTRCT !== cpfFunc) {
      throw new Error(`CPF do TRCT (${trctData.cpfTrabalhador}) não confere com o funcionário ${func?.nome} (${func?.cpf}). Verifique se o documento é do funcionário correto.`)
    }

    const valorLiquido = Number(trctData.valorLiquido) || 0

    const updates: Record<string, unknown> = {
      trct_status: 'importado',
      trct_importado_em: new Date().toISOString(),
      causa_afastamento: trctData.causaAfastamento || null,
      cod_afastamento: trctData.codAfastamento || null,
      data_aviso_previo: trctData.dataAvisoPrevio || null,
      remuneracao_mes_anterior: trctData.remuneracaoMesAnterior || null,
      trct_saldo_salario: trctData.saldoSalario || 0,
      trct_13_proporcional: trctData.decimoTerceiroProporcional || 0,
      trct_ferias_proporcionais: trctData.feriasProporcionais || 0,
      trct_ferias_vencidas: trctData.feriasVencidas || 0,
      trct_terco_ferias: trctData.tercoFerias || 0,
      trct_aviso_indenizado: trctData.avisoIndenizado || 0,
      trct_multa_477: trctData.multa477 || 0,
      trct_multa_479: trctData.multa479 || 0,
      trct_horas_extras: trctData.horasExtras || 0,
      trct_total_bruto: trctData.totalBruto || 0,
      trct_inss: ((trctData.inss as number) || 0) + ((trctData.inss13 as number) || 0),
      trct_irrf: ((trctData.irrf as number) || 0) + ((trctData.irrf13 as number) || 0),
      trct_adiantamento: trctData.adiantamentoSalarial || 0,
      trct_pensao: trctData.pensaoAlimenticia || 0,
      trct_total_deducoes: trctData.totalDeducoes || 0,
      trct_valor_liquido: valorLiquido,
      valor_rescisao: valorLiquido,
      multa_fgts: trctData.multa479 || 0,
    }
    await supabase.from('funcionarios').update(updates).eq('id', funcionarioId)

    // Gerar conta a pagar se valor liquido > 0
    if (valorLiquido > 0 && func) {
      const dataDemissao = func.dataDemissao || new Date().toISOString().split('T')[0]
      const vencimento = new Date(dataDemissao + 'T12:00:00')
      vencimento.setDate(vencimento.getDate() + 10) // prazo legal: 10 dias

      // Buscar plano de contas "Gasto com Pessoal"
      const { data: planoData } = await supabase
        .from('plano_contas')
        .select('id')
        .ilike('nome', '%rescis%')
        .limit(1)
      // Fallback: buscar qualquer conta de gasto pessoal
      let planoId = planoData?.[0]?.id
      if (!planoId) {
        const { data: planoFb } = await supabase
          .from('plano_contas')
          .select('id')
          .eq('grupo', 'gasto_pessoal')
          .limit(1)
        planoId = planoFb?.[0]?.id
      }

      await supabase.from('contas').insert({
        descricao: `Rescisão - ${func.nome}`,
        valor: valorLiquido,
        data_documento: dataDemissao,
        data_vencimento: vencimento.toISOString().split('T')[0],
        plano_contas_id: planoId || null,
        unidade_id: func.unidadeId || null,
        situacao: 'pendente',
        recorrente: false,
        mes_referencia: vencimento.getMonth() + 1,
        ano_referencia: vencimento.getFullYear(),
        origem: 'plataforma',
      })
    }

    // Resolver pendencias
    await supabase.from('pendencias_rh')
      .update({ status: 'resolvida', resposta: 'TRCT importado', resolvido_em: new Date().toISOString() })
      .eq('funcionario_id', funcionarioId)
      .eq('status', 'pendente')

    // Recarregar dados
    loadData()
  }

  const handleAddOcorrencia = async (o: Omit<Ocorrencia, 'id' | 'funcionarioNome'>) => {
    const { data, error } = await supabase
      .from('ocorrencias')
      .insert({
        funcionario_id: o.funcionarioId,
        data: o.data,
        data_fim: o.dataFim || null,
        tipo: o.tipo,
        descricao: o.descricao || null,
        dias: o.dias,
        registrado_por: o.registradoPor || null,
      })
      .select('*, funcionarios(nome)')
      .single()
    if (error) throw error
    const nova: Ocorrencia = {
      id: data.id,
      funcionarioId: data.funcionario_id,
      funcionarioNome: data.funcionarios?.nome || undefined,
      data: data.data,
      dataFim: data.data_fim || undefined,
      tipo: data.tipo,
      descricao: data.descricao || undefined,
      dias: data.dias || 1,
      registradoPor: data.registrado_por || undefined,
    }
    setOcorrencias(prev => [nova, ...prev])
  }

  const handleUpdateOcorrencia = async (id: string, updates: Partial<Ocorrencia>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.funcionarioId !== undefined) dbUpdates.funcionario_id = updates.funcionarioId
    if (updates.data !== undefined) dbUpdates.data = updates.data
    if (updates.dataFim !== undefined) dbUpdates.data_fim = updates.dataFim || null
    if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo
    if (updates.descricao !== undefined) dbUpdates.descricao = updates.descricao || null
    if (updates.dias !== undefined) dbUpdates.dias = updates.dias
    if (updates.registradoPor !== undefined) dbUpdates.registrado_por = updates.registradoPor || null

    const { data, error } = await supabase
      .from('ocorrencias')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, funcionarios(nome)')
      .single()
    if (error) throw error

    setOcorrencias(prev => prev.map(o => o.id === id ? {
      ...o,
      ...updates,
      funcionarioNome: data.funcionarios?.nome || o.funcionarioNome,
    } : o))
  }

  const handleProgramarFerias = async (f: {
    funcionarioId: string; periodoAquisitivoInicio: string; periodoAquisitivoFim: string
    dataLimite: string; dataInicio: string; dataFim: string; dias: number
    venderDias: number; observacao?: string
  }) => {
    const { error } = await supabase
      .from('ferias')
      .insert({
        funcionario_id: f.funcionarioId,
        periodo_aquisitivo_inicio: f.periodoAquisitivoInicio,
        periodo_aquisitivo_fim: f.periodoAquisitivoFim,
        data_limite: f.dataLimite,
        data_inicio: f.dataInicio,
        data_fim: f.dataFim,
        dias: f.dias,
        vender_dias: f.venderDias,
        status: 'programada',
        observacao: f.observacao || null,
      })
      .select('id')
      .single()
    if (error) throw error
    // Reload ferias from view
    const { data: fData } = await supabase.from('vw_ferias_vencimentos').select('*')
    if (fData) {
      setFerias(fData.map((fr: Record<string, unknown>) => ({
        id: fr.id as string, funcionarioId: fr.funcionario_id as string,
        funcionarioNome: (fr.funcionario_nome as string) || undefined,
        unidadeNome: (fr.unidade_nome as string) || undefined,
        periodoAquisitivoInicio: fr.periodo_aquisitivo_inicio as string,
        periodoAquisitivoFim: fr.periodo_aquisitivo_fim as string,
        dataLimite: fr.data_limite as string,
        dataInicio: (fr.data_inicio as string) || undefined,
        dataFim: (fr.data_fim as string) || undefined,
        dias: (fr.dias as number) || 30,
        venderDias: (fr.vender_dias as number) || 0,
        dataConfirmacao: (fr.data_confirmacao as string) || undefined,
        status: fr.status as string,
        alerta: (fr.alerta as string) || undefined,
        observacao: (fr.observacao as string) || undefined,
      })))
    }
  }

  const handleConfirmarFerias = async (id: string) => {
    await supabase.from('ferias').update({
      status: 'em_andamento',
      data_confirmacao: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    setFerias(prev => prev.map(f => f.id === id ? { ...f, status: 'em_andamento' } : f))
  }

  const handleEditarFerias = async (id: string, updates: { dataInicio: string; dataFim: string; dias: number; venderDias: number; observacao?: string }) => {
    await supabase.from('ferias').update({
      data_inicio: updates.dataInicio,
      data_fim: updates.dataFim,
      dias: updates.dias,
      vender_dias: updates.venderDias,
      observacao: updates.observacao || null,
      status: 'programada',
    }).eq('id', id)
    // Reload
    const { data: fData } = await supabase.from('vw_ferias_vencimentos').select('*')
    if (fData) {
      setFerias(fData.map((fr: Record<string, unknown>) => ({
        id: fr.id as string, funcionarioId: fr.funcionario_id as string,
        funcionarioNome: (fr.funcionario_nome as string) || undefined,
        unidadeNome: (fr.unidade_nome as string) || undefined,
        periodoAquisitivoInicio: fr.periodo_aquisitivo_inicio as string,
        periodoAquisitivoFim: fr.periodo_aquisitivo_fim as string, dataLimite: fr.data_limite as string,
        dataInicio: (fr.data_inicio as string) || undefined, dataFim: (fr.data_fim as string) || undefined,
        dias: (fr.dias as number) || 30, venderDias: (fr.vender_dias as number) || 0,
        dataConfirmacao: (fr.data_confirmacao as string) || undefined,
        status: fr.status as string, alerta: (fr.alerta as string) || undefined,
        observacao: (fr.observacao as string) || undefined,
      })))
    }
  }

  const handleConcluirFerias = async (id: string) => {
    await supabase.from('ferias').update({ status: 'concluida' }).eq('id', id)
    setFerias(prev => prev.map(f => f.id === id ? { ...f, status: 'concluida' } : f))
  }

  const handleDeleteFerias = async (id: string) => {
    await supabase.from('ferias').delete().eq('id', id)
    setFerias(prev => prev.filter(f => f.id !== id))
  }

  const handleDeleteOcorrencia = async (id: string) => {
    await supabase.from('ocorrencias').delete().eq('id', id)
    setOcorrencias(prev => prev.filter(o => o.id !== id))
  }

  const handleDeleteFuncionario = async (id: string) => {
    // Limpar registros relacionados antes de excluir
    await supabase.from('pendencias_rh').delete().eq('funcionario_id', id)
    await supabase.from('folha_pagamento').delete().eq('funcionario_id', id)
    await supabase.from('ocorrencias').delete().eq('funcionario_id', id)
    await supabase.from('ferias').delete().eq('funcionario_id', id)
    await supabase.from('beneficios').delete().eq('funcionario_id', id)
    await supabase.from('historico_salarial').delete().eq('funcionario_id', id)
    await supabase.from('funcionarios').delete().eq('id', id)
    setFuncionarios(prev => prev.filter(f => f.id !== id))
    setOcorrencias(prev => prev.filter(o => o.funcionarioId !== id))
    setFerias(prev => prev.filter(f => f.funcionarioId !== id))
    setPendencias(prev => prev.filter(p => p.funcionarioId !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#E91E63] animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Carregando dados de pessoas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
          <WifiOff size={14} />
          Módulo de Pessoas está sem conexão com o banco de dados. Verifique sua internet e tente novamente.
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-[#FCE4EC] text-[#E91E63] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'indicadores' && (
        <IndicadoresRH
          funcionarios={funcionarios}
          ocorrencias={ocorrencias}
          ferias={ferias}
          unidadeSelecionada={unidadeSelecionada}
        />
      )}
      {activeTab === 'funcionarios' && (
        <FuncionarioManager
          funcionarios={funcionarios}
          cargos={cargos}
          unidades={unidades}
          pendencias={pendencias}
          motivosDesligamento={motivosDesligamento}
          onAdd={handleAddFuncionario}
          onUpdate={handleUpdateFuncionario}
          onDemitir={handleDemitirFuncionario}
          onDescartarPendencia={handleDescartarPendencia}
          onImportTRCT={handleImportTRCT}
          onDelete={handleDeleteFuncionario}
        />
      )}
      {activeTab === 'folha' && (
        <FolhaPagamentoManager
          funcionarios={funcionarios}
          unidadeSelecionada={unidadeSelecionada}
          onReloadFuncionarios={loadData}
        />
      )}
      {activeTab === 'cargos' && (
        <CargoManager cargos={cargos} />
      )}
      {activeTab === 'ocorrencias' && (
        <OcorrenciaManager
          ocorrencias={ocorrencias}
          funcionarios={funcionarios}
          onAdd={handleAddOcorrencia}
          onUpdate={handleUpdateOcorrencia}
          onDelete={handleDeleteOcorrencia}
        />
      )}
      {activeTab === 'ferias' && (
        <FeriasManager
          ferias={ferias}
          funcionarios={funcionarios}
          onProgramar={handleProgramarFerias}
          onConfirmar={handleConfirmarFerias}
          onConcluir={handleConcluirFerias}
          onEditar={handleEditarFerias}
          onDelete={handleDeleteFerias}
        />
      )}
    </div>
  )
}
