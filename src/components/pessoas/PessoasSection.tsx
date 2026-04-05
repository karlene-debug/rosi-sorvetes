import { useState, useEffect, useCallback } from 'react'
import { Users, Briefcase, AlertCircle, Loader2, WifiOff, Palmtree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FuncionarioManager } from './FuncionarioManager'
import { CargoManager } from './CargoManager'
import { OcorrenciaManager } from './OcorrenciaManager'
import { FeriasManager } from './FeriasManager'
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
  status: string
  alerta?: string
  observacao?: string
}

type PessoasTab = 'funcionarios' | 'cargos' | 'ocorrencias' | 'ferias'

const tabs: { id: PessoasTab; label: string; icon: React.ReactNode }[] = [
  { id: 'funcionarios', label: 'Funcionarios', icon: <Users size={16} /> },
  { id: 'cargos', label: 'Cargos', icon: <Briefcase size={16} /> },
  { id: 'ocorrencias', label: 'Ocorrencias', icon: <AlertCircle size={16} /> },
  { id: 'ferias', label: 'Ferias', icon: <Palmtree size={16} /> },
]

interface PessoasSectionProps {
  unidades: Unidade[]
}

export function PessoasSection({ unidades }: PessoasSectionProps) {
  const [activeTab, setActiveTab] = useState<PessoasTab>('funcionarios')
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [ferias, setFerias] = useState<Ferias[]>([])
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
      ] = await Promise.all([
        supabase.from('cargos').select('*').order('nome'),
        supabase.from('funcionarios').select('*, cargos(nome), unidades(nome)').order('nome'),
        supabase.from('ocorrencias').select('*, funcionarios(nome)').order('data', { ascending: false }).limit(200),
        supabase.from('vw_ferias_vencimentos').select('*').then(
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
        dias: (f.dias as number) || 30, status: f.status as string,
        alerta: (f.alerta as string) || undefined, observacao: (f.observacao as string) || undefined,
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

  const handleDemitirFuncionario = async (id: string, dataDemissao: string) => {
    const { error } = await supabase
      .from('funcionarios')
      .update({ status: 'inativo', data_demissao: dataDemissao })
      .eq('id', id)
    if (error) throw error

    setFuncionarios(prev => prev.map(f => f.id === id ? {
      ...f,
      status: 'inativo',
      dataDemissao,
    } : f))
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
          Modulo de Pessoas esta sem conexao com o banco de dados. Verifique sua internet e tente novamente.
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
      {activeTab === 'funcionarios' && (
        <FuncionarioManager
          funcionarios={funcionarios}
          cargos={cargos}
          unidades={unidades}
          onAdd={handleAddFuncionario}
          onUpdate={handleUpdateFuncionario}
          onDemitir={handleDemitirFuncionario}
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
        />
      )}
      {activeTab === 'ferias' && (
        <FeriasManager
          ferias={ferias}
          funcionarios={funcionarios}
        />
      )}
    </div>
  )
}
