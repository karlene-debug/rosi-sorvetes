import { useState, useEffect, useCallback } from 'react'
import { Building, BookOpen, RefreshCw, FileText, Loader2, WifiOff, ShoppingCart, Calculator, BarChart3, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FornecedorManager } from './FornecedorManager'
import { PlanoContasView } from './PlanoContasView'
import { CustoFixoManager } from './CustoFixoManager'
import { ContasManager } from './ContasManager'
import { EntradaNFManager } from './EntradaNFManager'
import { CustoProducao } from './CustoProducao'
import { DREReport } from './DREReport'
import { ImportVendasManager } from './ImportVendasManager'
import type { PlanoContas, Fornecedor, CustoFixo, Conta, SituacaoConta } from '@/data/financeData'
import type { Unidade, Produto } from '@/data/productTypes'
import { supabase } from '@/lib/supabase'
import * as dbV2 from '@/lib/database_v2'

type FinTab = 'contas_pagar' | 'entrada_nf' | 'vendas' | 'dre' | 'custo_producao' | 'custos_fixos' | 'fornecedores' | 'plano_contas'

const tabs: { id: FinTab; label: string; icon: React.ReactNode }[] = [
  { id: 'contas_pagar', label: 'Contas a Pagar', icon: <FileText size={16} /> },
  { id: 'entrada_nf', label: 'Entrada NF', icon: <ShoppingCart size={16} /> },
  { id: 'vendas', label: 'Vendas (PDF)', icon: <Upload size={16} /> },
  { id: 'dre', label: 'DRE', icon: <BarChart3 size={16} /> },
  { id: 'custo_producao', label: 'Custo Produção', icon: <Calculator size={16} /> },
  { id: 'custos_fixos', label: 'Custos Fixos', icon: <RefreshCw size={16} /> },
  { id: 'fornecedores', label: 'Fornecedores', icon: <Building size={16} /> },
  { id: 'plano_contas', label: 'Plano de Contas', icon: <BookOpen size={16} /> },
]

interface FinanceiroSectionProps {
  unidades?: Unidade[]
}

export function FinanceiroSection({ unidades = [] }: FinanceiroSectionProps) {
  const [activeTab, setActiveTab] = useState<FinTab>('contas_pagar')
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [custosFixos, setCustosFixos] = useState<CustoFixo[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [useDb, setUseDb] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // Todas as queries em paralelo
      const [
        { data: pcData, error: pcErr },
        { data: fData, error: fErr },
        { data: cfData, error: cfErr },
        { data: ctData, error: ctErr },
        prods,
      ] = await Promise.all([
        supabase.from('plano_contas').select('*').order('grupo').order('nome'),
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('custos_fixos').select('*, plano_contas(nome), fornecedores(nome)').order('descricao'),
        supabase.from('contas').select('*, plano_contas(nome), fornecedores(nome), unidades(nome)').order('data_vencimento'),
        dbV2.fetchProdutos().catch(() => [] as Produto[]),
      ])

      if (pcErr) throw pcErr
      if (fErr) throw fErr
      if (cfErr) throw cfErr
      if (ctErr) throw ctErr

      setPlanoContas((pcData || []).map((p: Record<string, unknown>) => ({
        id: p.id as string, nome: p.nome as string, descricao: (p.descricao as string) || undefined,
        tipoCusto: p.tipo_custo as PlanoContas['tipoCusto'],
        grupo: p.grupo as PlanoContas['grupo'], condicao: p.condicao as PlanoContas['condicao'], status: p.status as 'ativo' | 'inativo',
      })))

      setFornecedores((fData || []).map((f: Record<string, unknown>) => ({
        id: f.id as string, nome: f.nome as string, contato: (f.contato as string) || undefined,
        telefone: (f.telefone as string) || undefined, email: (f.email as string) || undefined,
        observacao: (f.observacao as string) || undefined, status: f.status as 'ativo' | 'inativo', criadoEm: f.criado_em as string,
      })))

      setCustosFixos((cfData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string, descricao: c.descricao as string, valor: Number(c.valor),
        diaVencimento: c.dia_vencimento as number, planoContasId: (c.plano_contas_id as string) || undefined,
        planoContasNome: (c.plano_contas as Record<string, string> | null)?.nome,
        fornecedorId: (c.fornecedor_id as string) || undefined,
        fornecedorNome: (c.fornecedores as Record<string, string> | null)?.nome,
        status: c.status as 'ativo' | 'inativo',
      })))

      setContas((ctData || []).map((c: Record<string, unknown>) => ({
        id: c.id as string, descricao: c.descricao as string, valor: Number(c.valor),
        dataDocumento: (c.data_documento as string) || undefined, dataVencimento: c.data_vencimento as string,
        dataPagamento: (c.data_pagamento as string) || undefined,
        planoContasId: (c.plano_contas_id as string) || undefined,
        planoContasNome: (c.plano_contas as Record<string, string> | null)?.nome,
        fornecedorId: (c.fornecedor_id as string) || undefined,
        fornecedorNome: (c.fornecedores as Record<string, string> | null)?.nome,
        unidadeId: (c.unidade_id as string) || undefined,
        unidadeNome: (c.unidades as Record<string, string> | null)?.nome,
        numeroNF: (c.numero_nf as string) || undefined,
        tipoPagamento: (c.tipo_pagamento as string) || undefined, parcela: (c.parcela as string) || undefined,
        totalParcelas: (c.total_parcelas as number) || undefined,
        situacao: c.situacao as SituacaoConta, recorrente: c.recorrente as boolean,
        mesReferencia: c.mes_referencia as number, anoReferencia: c.ano_referencia as number,
        origem: c.origem as 'plataforma' | 'importado',
      })))

      setProdutos(prods)

      setUseDb(true)
    } catch {
      setUseDb(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === HANDLERS ===

  const handleAddFornecedor = async (f: Omit<Fornecedor, 'id' | 'criadoEm'>) => {
    if (useDb) {
      const { data, error } = await supabase.from('fornecedores').insert(f).select().single()
      if (!error && data) {
        setFornecedores(prev => [...prev, { ...f, id: data.id, criadoEm: data.criado_em }])
      }
    }
  }

  const handleToggleFornecedor = async (id: string) => {
    const f = fornecedores.find(x => x.id === id)
    if (!f) return
    const newStatus = f.status === 'ativo' ? 'inativo' : 'ativo'
    setFornecedores(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x))
    if (useDb) await supabase.from('fornecedores').update({ status: newStatus }).eq('id', id)
  }

  const handleAddPlanoContas = async (p: Omit<PlanoContas, 'id' | 'status'>) => {
    if (useDb) {
      const { data, error } = await supabase.from('plano_contas').insert({
        nome: p.nome, descricao: p.descricao || null, tipo_custo: p.tipoCusto, grupo: p.grupo, condicao: p.condicao,
      }).select().single()
      if (!error && data) {
        setPlanoContas(prev => [...prev, { ...p, id: data.id, status: 'ativo' }])
      }
    }
  }

  const handleTogglePlanoContas = async (id: string) => {
    const p = planoContas.find(x => x.id === id)
    if (!p) return
    const newStatus = p.status === 'ativo' ? 'inativo' : 'ativo'
    setPlanoContas(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x))
    if (useDb) await supabase.from('plano_contas').update({ status: newStatus }).eq('id', id)
  }

  const handleAddCustoFixo = async (c: Omit<CustoFixo, 'id'>) => {
    if (useDb) {
      const { data, error } = await supabase.from('custos_fixos').insert({
        descricao: c.descricao, valor: c.valor, dia_vencimento: c.diaVencimento,
        plano_contas_id: c.planoContasId || null, fornecedor_id: c.fornecedorId || null,
      }).select('*, plano_contas(nome), fornecedores(nome)').single()
      if (!error && data) {
        setCustosFixos(prev => [...prev, {
          ...c, id: data.id,
          planoContasNome: data.plano_contas?.nome,
          fornecedorNome: data.fornecedores?.nome,
        }])
      }
    }
  }

  const handleToggleCustoFixo = async (id: string) => {
    const c = custosFixos.find(x => x.id === id)
    if (!c) return
    const newStatus = c.status === 'ativo' ? 'inativo' : 'ativo'
    setCustosFixos(prev => prev.map(x => x.id === id ? { ...x, status: newStatus } : x))
    if (useDb) await supabase.from('custos_fixos').update({ status: newStatus }).eq('id', id)
  }

  const handleAddConta = async (c: Omit<Conta, 'id'>) => {
    if (useDb) {
      const { data, error } = await supabase.from('contas').insert({
        descricao: c.descricao, valor: c.valor, data_documento: c.dataDocumento || null,
        data_vencimento: c.dataVencimento, plano_contas_id: c.planoContasId || null,
        fornecedor_id: c.fornecedorId || null, unidade_id: c.unidadeId || null,
        numero_nf: c.numeroNF || null, tipo_pagamento: c.tipoPagamento || null,
        parcela: c.parcela || null, total_parcelas: c.totalParcelas || null,
        situacao: c.situacao, recorrente: c.recorrente,
        mes_referencia: c.mesReferencia, ano_referencia: c.anoReferencia,
      }).select('*, plano_contas(nome), fornecedores(nome), unidades(nome)').single()
      if (!error && data) {
        setContas(prev => [...prev, {
          ...c, id: data.id,
          planoContasNome: data.plano_contas?.nome,
          fornecedorNome: data.fornecedores?.nome,
          unidadeNome: data.unidades?.nome,
        }])
      }
    }
  }

  // Handler para adicionar multiplas parcelas de uma vez
  const handleAddContaParcelada = async (contas: Omit<Conta, 'id'>[]) => {
    for (const c of contas) {
      await handleAddConta(c)
    }
  }

  // Handler para entrada de NF: cria movimentacoes de estoque + contas a pagar (agrupadas por plano de contas)
  const handleEntradaNF = async (data: {
    numeroNF: string
    dataDocumento: string
    fornecedorId: string
    fornecedorNome: string
    unidadeId?: string
    itens: { produtoId: string; produtoNome: string; quantidade: number; unidade: string; valorUnitario: number; planoContasId?: string; planoContasNome?: string }[]
    totalNF: number
    numParcelas: number
    dataVencimento: string
  }) => {
    if (!useDb) return

    const unid = activeUnidades.find(u => u.id === data.unidadeId)

    // 1. Dar entrada no estoque de cada item
    for (const item of data.itens) {
      await dbV2.insertMovimentacaoV2({
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        unidade: item.unidade,
        tipo: 'producao', // entrada
        unidade_destino_id: data.unidadeId,
        responsavel: 'NF ' + data.numeroNF,
        origem: 'plataforma',
        observacao: `NF ${data.numeroNF} - ${data.fornecedorNome}`,
      })
    }

    // 2. Agrupar itens por plano de contas para criar contas separadas
    const grupos = new Map<string, { planoContasId?: string; planoContasNome?: string; total: number; itensNomes: string[] }>()
    for (const item of data.itens) {
      const key = item.planoContasId || '__sem_plano__'
      const grupo = grupos.get(key) || { planoContasId: item.planoContasId, planoContasNome: item.planoContasNome, total: 0, itensNomes: [] }
      grupo.total += item.quantidade * item.valorUnitario
      grupo.itensNomes.push(item.produtoNome)
      grupos.set(key, grupo)
    }

    // 3. Criar conta(s) a pagar por grupo
    for (const [, grupo] of grupos) {
      const descNF = grupos.size > 1
        ? `NF ${data.numeroNF} - ${data.fornecedorNome} (${grupo.itensNomes.slice(0, 3).join(', ')}${grupo.itensNomes.length > 3 ? '...' : ''})`
        : `NF ${data.numeroNF} - ${data.fornecedorNome}`

      if (data.numParcelas > 1) {
        const valorParcela = Math.round((grupo.total / data.numParcelas) * 100) / 100
        for (let i = 0; i < data.numParcelas; i++) {
          const vencDate = new Date(data.dataVencimento + 'T12:00:00')
          vencDate.setMonth(vencDate.getMonth() + i)
          const vlr = i === data.numParcelas - 1
            ? grupo.total - valorParcela * (data.numParcelas - 1)
            : valorParcela
          await handleAddConta({
            descricao: descNF,
            valor: vlr,
            dataDocumento: data.dataDocumento,
            dataVencimento: vencDate.toISOString().split('T')[0],
            planoContasId: grupo.planoContasId,
            planoContasNome: grupo.planoContasNome,
            fornecedorId: data.fornecedorId,
            fornecedorNome: data.fornecedorNome,
            unidadeId: data.unidadeId,
            unidadeNome: unid?.nome,
            numeroNF: data.numeroNF,
            parcela: `${i + 1}/${data.numParcelas}`,
            totalParcelas: data.numParcelas,
            situacao: 'pendente',
            recorrente: false,
            mesReferencia: vencDate.getMonth() + 1,
            anoReferencia: vencDate.getFullYear(),
            origem: 'plataforma',
          })
        }
      } else {
        const vencDate = new Date(data.dataVencimento + 'T12:00:00')
        await handleAddConta({
          descricao: descNF,
          valor: grupo.total,
          dataDocumento: data.dataDocumento,
          dataVencimento: data.dataVencimento,
          planoContasId: grupo.planoContasId,
          planoContasNome: grupo.planoContasNome,
          fornecedorId: data.fornecedorId,
          fornecedorNome: data.fornecedorNome,
          unidadeId: data.unidadeId,
          unidadeNome: unid?.nome,
          numeroNF: data.numeroNF,
          situacao: 'pendente',
          recorrente: false,
          mesReferencia: vencDate.getMonth() + 1,
          anoReferencia: vencDate.getFullYear(),
          origem: 'plataforma',
        })
      }
    }
  }

  const activeUnidades = unidades.filter(u => u.status === 'ativo')

  const handleUpdateSituacao = async (id: string, situacao: SituacaoConta) => {
    setContas(prev => prev.map(c => c.id === id ? {
      ...c, situacao, dataPagamento: situacao === 'pago' ? new Date().toISOString().split('T')[0] : undefined,
    } : c))
    if (useDb) {
      await supabase.from('contas').update({
        situacao,
        data_pagamento: situacao === 'pago' ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#E91E63] animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Carregando dados financeiros...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!useDb && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
          <WifiOff size={14} />
          Modo offline - configure o Supabase para salvar permanentemente
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id ? 'bg-[#FCE4EC] text-[#E91E63] shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contas_pagar' && (
        <ContasManager contas={contas} planoContas={planoContas} fornecedores={fornecedores}
          unidades={unidades} onAdd={handleAddConta} onAddParcelada={handleAddContaParcelada}
          onUpdateSituacao={handleUpdateSituacao} />
      )}
      {activeTab === 'entrada_nf' && (
        <EntradaNFManager
          produtos={produtos}
          fornecedores={fornecedores}
          planoContas={planoContas}
          unidades={unidades}
          onSubmit={handleEntradaNF}
        />
      )}
      {activeTab === 'vendas' && (
        <ImportVendasManager unidades={unidades} />
      )}
      {activeTab === 'dre' && (
        <DREReport contas={contas} planoContas={planoContas} unidades={unidades} />
      )}
      {activeTab === 'custo_producao' && (
        <CustoProducao produtos={produtos} />
      )}
      {activeTab === 'custos_fixos' && (
        <CustoFixoManager custosFixos={custosFixos} planoContas={planoContas} fornecedores={fornecedores}
          onAdd={handleAddCustoFixo} onToggleStatus={handleToggleCustoFixo} />
      )}
      {activeTab === 'fornecedores' && (
        <FornecedorManager fornecedores={fornecedores} onAdd={handleAddFornecedor} onToggleStatus={handleToggleFornecedor} />
      )}
      {activeTab === 'plano_contas' && (
        <PlanoContasView planoContas={planoContas} onAdd={handleAddPlanoContas} onToggleStatus={handleTogglePlanoContas} />
      )}
    </div>
  )
}
