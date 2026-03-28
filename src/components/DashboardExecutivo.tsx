import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, Package, Users, AlertTriangle, ArrowUpRight, ArrowDownRight, Loader2, IceCream, Factory, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Unidade } from '@/data/productTypes'
import { supabase } from '@/lib/supabase'

interface DashboardExecutivoProps {
  unidades: Unidade[]
  unidadeSelecionada?: string
}

interface DashboardData {
  // Financeiro
  totalDespesasMes: number
  totalDespesasMesAnterior: number
  despesasPorGrupo: { nome: string; valor: number }[]
  contasPendentes: number
  contasAtrasadas: number
  // Estoque
  totalProdutos: number
  produtosComEstoque: number
  produtosZerados: number
  producaoHoje: number
  saidaHoje: number
  // Pessoas
  totalFuncionarios: number
  // Ultimas movimentacoes
  ultimasContas: { descricao: string; valor: number; situacao: string; vencimento: string }[]
}

const COLORS = ['#E91E63', '#F06292', '#9C27B0', '#2196F3', '#FF9800', '#4CAF50', '#795548']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function DashboardExecutivo({ unidades }: DashboardExecutivoProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [despesasMensais, setDespesasMensais] = useState<{ mes: string; valor: number }[]>([])

  const loadData = useCallback(async () => {
    try {
      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual
      const hoje = now.toISOString().split('T')[0]

      // Contas do mes atual
      const { data: contasMes } = await supabase
        .from('contas')
        .select('valor, situacao, plano_contas(nome, grupo)')
        .eq('mes_referencia', mesAtual)
        .eq('ano_referencia', anoAtual)
        .neq('situacao', 'cancelado')

      // Contas do mes anterior
      const { data: contasMesAnt } = await supabase
        .from('contas')
        .select('valor')
        .eq('mes_referencia', mesAnterior)
        .eq('ano_referencia', anoAnterior)
        .neq('situacao', 'cancelado')

      // Ultimas contas pendentes/atrasadas
      const { data: ultimasContas } = await supabase
        .from('contas')
        .select('descricao, valor, situacao, data_vencimento')
        .in('situacao', ['pendente', 'atrasado'])
        .order('data_vencimento')
        .limit(6)

      // Produtos
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('id')
        .eq('status', 'ativo')

      // Funcionarios ativos
      const { data: funcData } = await supabase
        .from('funcionarios')
        .select('id')
        .eq('status', 'ativo')

      // Movimentacoes de hoje
      const { data: movsHoje } = await supabase
        .from('movimentacoes')
        .select('tipo, quantidade')
        .gte('data', hoje + 'T00:00:00')

      // Despesas dos ultimos 6 meses pra grafico
      const mesesChart: { mes: string; valor: number }[] = []
      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anoAtual, mesAtual - 1 - i, 1)
        const m = d.getMonth() + 1
        const a = d.getFullYear()
        const { data: cMes } = await supabase
          .from('contas')
          .select('valor')
          .eq('mes_referencia', m)
          .eq('ano_referencia', a)
          .neq('situacao', 'cancelado')
        const total = (cMes || []).reduce((s: number, c: { valor: number }) => s + Number(c.valor), 0)
        mesesChart.push({ mes: `${mesesNomes[m - 1]}/${String(a).slice(2)}`, valor: total })
      }
      setDespesasMensais(mesesChart)

      // Calcular despesas por grupo
      const grupoMap = new Map<string, number>()
      const grupoLabels: Record<string, string> = {
        gasto_pessoal: 'Pessoal',
        custo_direto: 'Custos Diretos',
        ocupacao: 'Ocupacao',
        administrativo: 'Administrativo',
        impostos_financeiro: 'Impostos',
      }
      for (const c of (contasMes || [])) {
        const grupo = (c.plano_contas as { grupo?: string } | null)?.grupo || 'outros'
        const label = grupoLabels[grupo] || 'Outros'
        grupoMap.set(label, (grupoMap.get(label) || 0) + Number(c.valor))
      }
      const despesasPorGrupo = Array.from(grupoMap.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)

      const totalDespesasMes = (contasMes || []).reduce((s: number, c: { valor: number }) => s + Number(c.valor), 0)
      const totalDespesasMesAnterior = (contasMesAnt || []).reduce((s: number, c: { valor: number }) => s + Number(c.valor), 0)

      const producaoHoje = (movsHoje || [])
        .filter((m: { tipo: string }) => m.tipo === 'producao')
        .reduce((s: number, m: { quantidade: number }) => s + m.quantidade, 0)
      const saidaHoje = (movsHoje || [])
        .filter((m: { tipo: string }) => m.tipo === 'saida')
        .reduce((s: number, m: { quantidade: number }) => s + m.quantidade, 0)

      setData({
        totalDespesasMes,
        totalDespesasMesAnterior,
        despesasPorGrupo,
        contasPendentes: (ultimasContas || []).filter(c => c.situacao === 'pendente').length,
        contasAtrasadas: (ultimasContas || []).filter(c => c.situacao === 'atrasado').length,
        totalProdutos: (produtosData || []).length,
        produtosComEstoque: 0, // simplificado
        produtosZerados: 0,
        producaoHoje,
        saidaHoje,
        totalFuncionarios: (funcData || []).length,
        ultimasContas: (ultimasContas || []).map(c => ({
          descricao: c.descricao,
          valor: Number(c.valor),
          situacao: c.situacao,
          vencimento: c.data_vencimento,
        })),
      })
    } catch {
      // Se falhar, mostra estado vazio
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#E91E63] animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Carregando dashboard...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-sm text-amber-700">Conecte o Supabase para ver os dados do dashboard.</p>
      </div>
    )
  }

  const variacaoDespesas = data.totalDespesasMesAnterior > 0
    ? ((data.totalDespesasMes - data.totalDespesasMesAnterior) / data.totalDespesasMesAnterior) * 100
    : 0

  const mesesNomes = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const mesAtualNome = mesesNomes[new Date().getMonth()]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center">
              <Wallet size={22} className="text-red-500" />
            </div>
            {variacaoDespesas !== 0 && (
              <span className={cn(
                'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                variacaoDespesas > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
              )}>
                {variacaoDespesas > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(variacaoDespesas).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalDespesasMes)}</p>
          <p className="text-sm text-gray-500">Despesas {mesAtualNome}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 bg-[#FCE4EC] rounded-xl flex items-center justify-center">
              <IceCream size={22} className="text-[#E91E63]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.totalProdutos}</p>
          <p className="text-sm text-gray-500">Produtos ativos</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
              <Factory size={22} className="text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-blue-600">+{data.producaoHoje}</p>
            <p className="text-lg font-bold text-pink-600">-{data.saidaHoje}</p>
          </div>
          <p className="text-sm text-gray-500">Producao / Saida hoje</p>
        </div>

        <div className={cn(
          'bg-white rounded-2xl p-5 border hover:shadow-md transition-shadow',
          data.contasAtrasadas > 0 ? 'border-red-200' : 'border-gray-100'
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center',
              data.contasAtrasadas > 0 ? 'bg-red-50' : 'bg-amber-50'
            )}>
              <AlertTriangle size={22} className={data.contasAtrasadas > 0 ? 'text-red-500' : 'text-amber-500'} />
            </div>
          </div>
          <p className={cn('text-2xl font-bold', data.contasAtrasadas > 0 ? 'text-red-600' : 'text-gray-800')}>
            {data.contasPendentes + data.contasAtrasadas}
          </p>
          <p className="text-sm text-gray-500">
            {data.contasAtrasadas > 0 ? `${data.contasAtrasadas} atrasada(s)` : 'Contas pendentes'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Despesas mensais */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800">Despesas Mensais</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ultimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={despesasMensais} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [formatCurrency(Number(value)), 'Despesas']}
              />
              <Bar dataKey="valor" fill="#E91E63" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Despesas por categoria */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800">Despesas por Categoria</h2>
            <p className="text-xs text-gray-500 mt-0.5">{mesAtualNome}</p>
          </div>
          {data.despesasPorGrupo.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={data.despesasPorGrupo}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="valor"
                  >
                    {data.despesasPorGrupo.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.despesasPorGrupo.map((g, idx) => (
                  <div key={g.nome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs text-gray-600">{g.nome}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{formatCurrency(g.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
              Nenhuma despesa registrada neste mes
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Proximas contas */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="p-5 border-b border-gray-50">
            <h2 className="text-base font-bold text-gray-800">Proximas Contas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pendentes e atrasadas</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.ultimasContas.map((c, idx) => {
              const isAtrasado = c.situacao === 'atrasado'
              return (
                <div key={idx} className={cn('flex items-center justify-between px-5 py-3', isAtrasado && 'bg-red-50/30')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.descricao}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-bold text-gray-800">{formatCurrency(c.valor)}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      isAtrasado ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'
                    )}>
                      {isAtrasado ? 'Atrasado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )
            })}
            {data.ultimasContas.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">
                Nenhuma conta pendente
              </div>
            )}
          </div>
        </div>

        {/* Resumo rapido */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">Resumo do Negocio</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#FCE4EC]/30 rounded-xl">
              <div className="flex items-center gap-3">
                <IceCream size={18} className="text-[#E91E63]" />
                <span className="text-sm text-gray-700">Produtos cadastrados</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{data.totalProdutos}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-blue-600" />
                <span className="text-sm text-gray-700">Funcionarios ativos</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{data.totalFuncionarios}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-green-600" />
                <span className="text-sm text-gray-700">Unidades</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{unidades.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50/30 rounded-xl">
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-purple-600" />
                <span className="text-sm text-gray-700">Despesas mes anterior</span>
              </div>
              <span className="text-sm font-bold text-gray-800">
                {data.totalDespesasMesAnterior > 0 ? formatCurrency(data.totalDespesasMesAnterior) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
