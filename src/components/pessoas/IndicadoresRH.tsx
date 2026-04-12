import { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, TrendingDown, DollarSign, Clock, AlertTriangle, UserPlus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Funcionario, Ocorrencia, Ferias } from './PessoasSection'

interface IndicadoresRHProps {
  funcionarios: Funcionario[]
  ocorrencias: Ocorrencia[]
  ferias: Ferias[]
  unidadeSelecionada?: string
}

interface FolhaRealData {
  funcionarioId: string
  salarioBruto: number
  descontos: number
  encargos: number
  horasExtras: number
  custoTotal: number
}

const COLORS = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#795548', '#607D8B', '#F06292']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function IndicadoresRH({ funcionarios, ocorrencias, ferias, unidadeSelecionada }: IndicadoresRHProps) {
  const [folhaReal, setFolhaReal] = useState<FolhaRealData[]>([])
  const [temFolhaReal, setTemFolhaReal] = useState(false)

  // Buscar dados reais da folha do mes atual
  useEffect(() => {
    const now = new Date()
    const mes = now.getMonth() + 1
    const ano = now.getFullYear()
    supabase
      .from('folha_pagamento')
      .select('funcionario_id, salario_bruto, descontos, encargos_empresa, horas_extras, custo_total')
      .eq('mes', mes)
      .eq('ano', ano)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setFolhaReal(data.map(r => ({
            funcionarioId: r.funcionario_id,
            salarioBruto: Number(r.salario_bruto),
            descontos: Number(r.descontos),
            encargos: Number(r.encargos_empresa),
            horasExtras: Number(r.horas_extras),
            custoTotal: Number(r.custo_total),
          })))
          setTemFolhaReal(true)
        }
      }, () => {})
  }, [])

  const dados = useMemo(() => {
    // Filtrar por unidade se selecionada
    const funcs = unidadeSelecionada && unidadeSelecionada !== 'todas'
      ? funcionarios.filter(f => f.unidadeId === unidadeSelecionada)
      : funcionarios

    const ativos = funcs.filter(f => f.status === 'ativo')
    const inativos = funcs.filter(f => f.status === 'inativo')

    // --- Headcount por departamento (via cargo) ---
    // Precisamos mapear cargos pra departamentos a partir dos dados disponíveis
    const porUnidade = new Map<string, number>()
    for (const f of ativos) {
      const key = f.unidadeNome || 'Sem unidade'
      porUnidade.set(key, (porUnidade.get(key) || 0) + 1)
    }

    const porContrato = new Map<string, number>()
    const contratoLabels: Record<string, string> = {
      clt: 'CLT', diarista: 'Diarista', socio: 'Socio(a)', pj: 'PJ', estagiario: 'Estagiario',
    }
    for (const f of ativos) {
      const key = contratoLabels[f.tipoContrato || ''] || f.tipoContrato || 'Outro'
      porContrato.set(key, (porContrato.get(key) || 0) + 1)
    }

    // --- Custos (usa folha real se disponivel) ---
    let salarioTotal: number
    let encargosTotal: number
    let custoEstimadoTotal: number
    let usandoFolhaReal = false

    if (temFolhaReal && folhaReal.length > 0) {
      // Filtrar folha real por funcionarios ativos da unidade selecionada
      const folhaFiltrada = folhaReal.filter(fr => ativos.some(a => a.id === fr.funcionarioId))
      salarioTotal = folhaFiltrada.reduce((s, f) => s + f.salarioBruto, 0)
      encargosTotal = folhaFiltrada.reduce((s, f) => s + f.encargos, 0)
      custoEstimadoTotal = folhaFiltrada.reduce((s, f) => s + f.custoTotal, 0)
      usandoFolhaReal = folhaFiltrada.length > 0
    } else {
      salarioTotal = ativos.reduce((s, f) => s + (f.salario || 0), 0)
      encargosTotal = ativos
        .filter(f => f.tipoContrato === 'clt')
        .reduce((s, f) => s + (f.salario || 0) * 0.4744, 0)
      custoEstimadoTotal = salarioTotal + encargosTotal
    }
    const salarioMedio = ativos.length > 0 ? salarioTotal / ativos.length : 0

    // --- Turnover (ultimos 12 meses) ---
    const hoje = new Date()
    const umAnoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate())
    const admissoes12m = funcs.filter(f =>
      f.dataAdmissao && new Date(f.dataAdmissao) >= umAnoAtras
    ).length
    const demissoes12m = inativos.filter(f =>
      f.dataDemissao && new Date(f.dataDemissao) >= umAnoAtras
    ).length
    const mediaFunc = ativos.length > 0 ? ativos.length : 1
    const turnover = ((admissoes12m + demissoes12m) / 2 / mediaFunc) * 100

    // --- Turnover por mes (ultimos 6 meses) ---
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const turnoverMensal: { mes: string; admissoes: number; demissoes: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const m = d.getMonth()
      const a = d.getFullYear()
      const adm = funcs.filter(f => {
        if (!f.dataAdmissao) return false
        const dt = new Date(f.dataAdmissao)
        return dt.getMonth() === m && dt.getFullYear() === a
      }).length
      const dem = funcs.filter(f => {
        if (!f.dataDemissao) return false
        const dt = new Date(f.dataDemissao)
        return dt.getMonth() === m && dt.getFullYear() === a
      }).length
      turnoverMensal.push({ mes: `${mesesAbrev[m]}/${String(a).slice(2)}`, admissoes: adm, demissoes: dem })
    }

    // --- Absenteismo (ultimos 30 dias) ---
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ocsRecentes = ocorrencias.filter(o => {
      const dt = new Date(o.data)
      return dt >= trintaDiasAtras
    })
    const faltas = ocsRecentes.filter(o => ['falta', 'falta_justificada', 'atestado'].includes(o.tipo))
    const diasPerdidos = faltas.reduce((s, o) => s + o.dias, 0)
    const diasTrabalhaveis30 = ativos.length * 22 // ~22 dias úteis
    const taxaAbsenteismo = diasTrabalhaveis30 > 0 ? (diasPerdidos / diasTrabalhaveis30) * 100 : 0

    // Absenteismo por tipo
    const absPorTipo = new Map<string, number>()
    const tipoOcLabels: Record<string, string> = {
      falta: 'Falta', falta_justificada: 'Falta Just.', atestado: 'Atestado',
      atraso: 'Atraso', advertencia: 'Advertencia', suspensao: 'Suspensao',
    }
    for (const o of ocsRecentes) {
      const key = tipoOcLabels[o.tipo] || o.tipo
      absPorTipo.set(key, (absPorTipo.get(key) || 0) + o.dias)
    }

    // --- Ferias ---
    const feriasVencidas = ferias.filter(f => f.alerta === 'vencida').length
    const feriasUrgentes = ferias.filter(f => f.alerta === 'urgente').length
    const feriasAtencao = ferias.filter(f => f.alerta === 'atencao').length
    const feriasEmAndamento = ferias.filter(f => f.status === 'em_andamento').length

    // --- Tempo de casa medio ---
    const temposCasa = ativos
      .filter(f => f.dataAdmissao)
      .map(f => {
        const diff = hoje.getTime() - new Date(f.dataAdmissao!).getTime()
        return diff / (1000 * 60 * 60 * 24 * 30) // meses
      })
    const tempoCasaMedio = temposCasa.length > 0
      ? temposCasa.reduce((a, b) => a + b, 0) / temposCasa.length
      : 0

    return {
      ativos, inativos,
      porUnidade: Array.from(porUnidade.entries()).map(([nome, valor]) => ({ nome, valor })),
      porContrato: Array.from(porContrato.entries()).map(([nome, valor]) => ({ nome, valor })),
      salarioTotal, salarioMedio, encargosTotal, custoEstimadoTotal, usandoFolhaReal,
      admissoes12m, demissoes12m, turnover, turnoverMensal,
      taxaAbsenteismo, diasPerdidos,
      absPorTipo: Array.from(absPorTipo.entries()).map(([nome, valor]) => ({ nome, valor })),
      feriasVencidas, feriasUrgentes, feriasAtencao, feriasEmAndamento,
      tempoCasaMedio,
    }
  }, [funcionarios, ocorrencias, ferias, unidadeSelecionada, folhaReal, temFolhaReal])

  const KpiCard = ({ icon, label, value, sub, color = 'gray' }: {
    icon: React.ReactNode; label: string; value: string; sub?: string; color?: string
  }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center',
          color === 'pink' && 'bg-[#FCE4EC]',
          color === 'green' && 'bg-green-50',
          color === 'blue' && 'bg-blue-50',
          color === 'red' && 'bg-red-50',
          color === 'amber' && 'bg-amber-50',
          color === 'purple' && 'bg-purple-50',
        )}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users size={22} className="text-[#E91E63]" />}
          label="Funcionários ativos"
          value={String(dados.ativos.length)}
          sub={dados.inativos.length > 0 ? `${dados.inativos.length} desligado(s)` : undefined}
          color="pink"
        />
        <KpiCard
          icon={<DollarSign size={22} className="text-green-600" />}
          label={dados.usandoFolhaReal ? "Folha real (importada)" : "Folha estimada"}
          value={formatCurrency(dados.custoEstimadoTotal)}
          sub={dados.usandoFolhaReal
            ? `Proventos ${formatCurrency(dados.salarioTotal)} + Encargos ${formatCurrency(dados.encargosTotal)}`
            : `Salarios ${formatCurrency(dados.salarioTotal)} + Encargos est. ${formatCurrency(dados.encargosTotal)}`}
          color="green"
        />
        <KpiCard
          icon={<TrendingDown size={22} className="text-blue-600" />}
          label="Turnover 12 meses"
          value={`${dados.turnover.toFixed(1)}%`}
          sub={`${dados.admissoes12m} admissao(oes) / ${dados.demissoes12m} desligamento(s)`}
          color="blue"
        />
        <KpiCard
          icon={<AlertTriangle size={22} className="text-amber-500" />}
          label="Absenteismo (30 dias)"
          value={`${dados.taxaAbsenteismo.toFixed(1)}%`}
          sub={`${dados.diasPerdidos} dia(s) perdido(s)`}
          color="amber"
        />
      </div>

      {/* Row 2: Cards menores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Salário médio</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(dados.salarioMedio)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Tempo medio de casa</span>
          </div>
          <p className="text-lg font-bold text-gray-800">
            {dados.tempoCasaMedio >= 12
              ? `${(dados.tempoCasaMedio / 12).toFixed(1)} anos`
              : `${dados.tempoCasaMedio.toFixed(0)} meses`}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Férias em andamento</span>
          </div>
          <p className="text-lg font-bold text-gray-800">{dados.feriasEmAndamento}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', dados.feriasVencidas > 0 ? 'border-red-200' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={dados.feriasVencidas > 0 ? 'text-red-500' : 'text-gray-400'} />
            <span className="text-xs text-gray-500">Férias vencidas</span>
          </div>
          <p className={cn('text-lg font-bold', dados.feriasVencidas > 0 ? 'text-red-600' : 'text-gray-800')}>
            {dados.feriasVencidas}
            {dados.feriasUrgentes > 0 && <span className="text-sm font-normal text-amber-500 ml-1">+{dados.feriasUrgentes} urgente(s)</span>}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Turnover mensal */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800">Movimentação de Pessoal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Admissões e desligamentos - últimos 6 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dados.turnoverMensal} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="admissoes" name="Admissoes" fill="#4CAF50" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="demissoes" name="Desligamentos" fill="#F44336" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuicao por contrato */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="mb-4">
            <h3 className="text-base font-bold text-gray-800">Distribuição por Contrato</h3>
            <p className="text-xs text-gray-500 mt-0.5">Funcionários ativos por tipo de vínculo</p>
          </div>
          {dados.porContrato.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={dados.porContrato} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="valor">
                    {dados.porContrato.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {dados.porContrato.map((g, idx) => (
                  <div key={g.nome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs text-gray-600">{g.nome}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{g.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">Nenhum dado</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Distribuicao por unidade */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-4">Quadro por Unidade</h3>
          <div className="space-y-2">
            {dados.porUnidade.map(u => {
              const pct = dados.ativos.length > 0 ? (u.valor / dados.ativos.length) * 100 : 0
              return (
                <div key={u.nome} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate">{u.nome}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div className="bg-[#E91E63] h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 10)}%` }}>
                      <span className="text-xs font-bold text-white">{u.valor}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
            {dados.porUnidade.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum funcionario ativo</p>
            )}
          </div>
        </div>

        {/* Ocorrencias recentes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-4">Ocorrências (últimos 30 dias)</h3>
          {dados.absPorTipo.length > 0 ? (
            <div className="space-y-3">
              {dados.absPorTipo.sort((a, b) => b.valor - a.valor).map((t, idx) => (
                <div key={t.nome} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-sm text-gray-700">{t.nome}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{t.valor} dia(s)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <UserPlus size={32} className="mb-2 text-green-300" />
              <p className="text-sm">Nenhuma ocorrencia nos ultimos 30 dias</p>
            </div>
          )}
        </div>
      </div>

      {/* Custo estimado por funcionário */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h3 className="text-base font-bold text-gray-800">
            {dados.usandoFolhaReal ? 'Custo Real por Funcionário' : 'Custo Estimado por Funcionário'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {dados.usandoFolhaReal
              ? 'Valores reais importados do espelho da folha (mes atual).'
              : 'Salário + encargos CLT estimados (~47%). Importe o espelho da folha para valores reais.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Nome</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600 hidden sm:table-cell">Cargo</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600 hidden md:table-cell">Unidade</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Contrato</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Salário</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600 hidden sm:table-cell">Encargos est.</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Custo total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dados.ativos
                .sort((a, b) => (b.salario || 0) - (a.salario || 0))
                .map(f => {
                  const encargos = f.tipoContrato === 'clt' ? (f.salario || 0) * 0.4744 : 0
                  const custo = (f.salario || 0) + encargos
                  const contratoLabels: Record<string, string> = {
                    clt: 'CLT', diarista: 'Diarista', socio: 'Socio', pj: 'PJ', estagiario: 'Estagio',
                  }
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{f.nome}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{f.cargoNome || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{f.unidadeNome || '-'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {contratoLabels[f.tipoContrato || ''] || f.tipoContrato || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-800">{formatCurrency(f.salario || 0)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">{encargos > 0 ? formatCurrency(encargos) : '-'}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-800">{formatCurrency(custo)}</td>
                    </tr>
                  )
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-4 py-2.5 font-bold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-gray-800">{formatCurrency(dados.salarioTotal)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-gray-500 hidden sm:table-cell">{formatCurrency(dados.encargosTotal)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-[#E91E63]">{formatCurrency(dados.custoEstimadoTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
