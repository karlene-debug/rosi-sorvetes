import { useState, useMemo, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conta, PlanoContas, GrupoContas } from '@/data/financeData'
import type { Unidade } from '@/data/productTypes'
import { formatCurrency, grupoLabels, getMesAnoAtual } from '@/data/financeData'
import * as dbV2 from '@/lib/database_v2'

interface DREReportProps {
  contas: Conta[]
  planoContas: PlanoContas[]
  unidades: Unidade[]
}

const gruposOrdem: GrupoContas[] = [
  'custo_direto',
  'gasto_pessoal',
  'ocupacao',
  'administrativo',
  'impostos_financeiro',
]

const mesesNomes = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function DREReport({ contas, planoContas, unidades }: DREReportProps) {
  const { mes, ano } = getMesAnoAtual()
  const [mesFiltro, setMesFiltro] = useState(mes)
  const [anoFiltro, setAnoFiltro] = useState(ano)
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas')

  const activeUnidades = unidades.filter(u => u.status === 'ativo')

  // Faturamento real do Supabase
  const [faturamento, setFaturamento] = useState<{
    valeRefeicao: number; valeAlimentacao: number; pagInstantaneo: number
    dinheiro: number; cartaoDebito: number; cartaoCredito: number
    multibeneficios: number; total: number
  } | null>(null)
  const [faturamentoAnterior, setFaturamentoAnterior] = useState<number>(0)

  const loadFaturamento = useCallback(async () => {
    try {
      const uid = unidadeFiltro !== 'todas' ? unidadeFiltro : undefined
      const data = await dbV2.fetchFaturamentoMensal(mesFiltro, anoFiltro, uid)
      setFaturamento(data)

      // Mes anterior
      const mAnt = mesFiltro === 1 ? 12 : mesFiltro - 1
      const aAnt = mesFiltro === 1 ? anoFiltro - 1 : anoFiltro
      const dataAnt = await dbV2.fetchFaturamentoMensal(mAnt, aAnt, uid)
      setFaturamentoAnterior(dataAnt?.total || 0)
    } catch {
      // table may not exist yet
    }
  }, [mesFiltro, anoFiltro, unidadeFiltro])

  useEffect(() => { loadFaturamento() }, [loadFaturamento])

  // Mapa de plano de contas por id
  const planoMap = useMemo(() => {
    const map = new Map<string, PlanoContas>()
    for (const p of planoContas) map.set(p.id, p)
    return map
  }, [planoContas])

  // Filtrar contas do periodo e unidade
  const contasFiltradas = useMemo(() =>
    contas.filter(c => {
      if (c.situacao === 'cancelado') return false
      if (c.mesReferencia !== mesFiltro || c.anoReferencia !== anoFiltro) return false
      if (unidadeFiltro !== 'todas' && c.unidadeId && c.unidadeId !== unidadeFiltro) return false
      return true
    }),
    [contas, mesFiltro, anoFiltro, unidadeFiltro]
  )

  // Agrupar despesas por grupo do plano de contas
  const despesasPorGrupo = useMemo(() => {
    const map = new Map<GrupoContas, { total: number; itens: { nome: string; valor: number }[] }>()
    for (const g of gruposOrdem) {
      map.set(g, { total: 0, itens: [] })
    }

    for (const c of contasFiltradas) {
      const plano = c.planoContasId ? planoMap.get(c.planoContasId) : null
      // Sem plano de contas -> vai para "Nao classificado" (renderizado separado abaixo)
      if (!plano) continue
      const grupo = plano.grupo
      const entry = map.get(grupo)!

      // Agrupar por descricao/plano
      const nomeItem = plano?.nome || c.descricao
      const existing = entry.itens.find(i => i.nome === nomeItem)
      if (existing) {
        existing.valor += c.valor
      } else {
        entry.itens.push({ nome: nomeItem, valor: c.valor })
      }
      entry.total += c.valor
    }

    // Ordenar itens por valor desc
    for (const entry of map.values()) {
      entry.itens.sort((a, b) => b.valor - a.valor)
    }

    return map
  }, [contasFiltradas, planoMap])

  const totalDespesas = Array.from(despesasPorGrupo.values()).reduce((sum, g) => sum + g.total, 0)

  // Receita real do faturamento importado
  const receita = faturamento?.total || 0
  const resultado = receita - totalDespesas

  // Variacao receita vs mes anterior
  const variacaoReceita = faturamentoAnterior > 0
    ? ((receita - faturamentoAnterior) / faturamentoAnterior) * 100
    : null

  // DRE comparativo: mes anterior
  const mesAnterior = mesFiltro === 1 ? 12 : mesFiltro - 1
  const anoAnterior = mesFiltro === 1 ? anoFiltro - 1 : anoFiltro

  const contasMesAnterior = useMemo(() =>
    contas.filter(c => {
      if (c.situacao === 'cancelado') return false
      if (c.mesReferencia !== mesAnterior || c.anoReferencia !== anoAnterior) return false
      if (unidadeFiltro !== 'todas' && c.unidadeId && c.unidadeId !== unidadeFiltro) return false
      return true
    }),
    [contas, mesAnterior, anoAnterior, unidadeFiltro]
  )

  const totalDespesasMesAnterior = contasMesAnterior.reduce((sum, c) => sum + c.valor, 0)
  const variacaoDespesas = totalDespesasMesAnterior > 0
    ? ((totalDespesas - totalDespesasMesAnterior) / totalDespesasMesAnterior) * 100
    : null

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => { if (mesFiltro === 1) { setMesFiltro(12); setAnoFiltro(anoFiltro - 1) } else setMesFiltro(mesFiltro - 1) }}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >&lt;</button>
            <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
              {mesesNomes[mesFiltro - 1]} / {anoFiltro}
            </span>
            <button
              onClick={() => { if (mesFiltro === 12) { setMesFiltro(1); setAnoFiltro(anoFiltro + 1) } else setMesFiltro(mesFiltro + 1) }}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >&gt;</button>
          </div>
          {activeUnidades.length > 0 && (
            <select
              value={unidadeFiltro}
              onChange={e => setUnidadeFiltro(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="todas">Todas as unidades (consolidado)</option>
              {activeUnidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 mb-1">Receita Bruta</p>
            {variacaoReceita !== null && (
              <span className={cn(
                'text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
                variacaoReceita > 0 ? 'bg-green-50 text-green-600' : variacaoReceita < 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
              )}>
                {variacaoReceita > 0 ? <TrendingUp size={10} /> : variacaoReceita < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                {Math.abs(variacaoReceita).toFixed(1)}% vs mes ant.
              </span>
            )}
          </div>
          <p className={cn('text-xl font-bold', receita > 0 ? 'text-green-600' : 'text-gray-300')}>
            {receita > 0 ? formatCurrency(receita) : 'Importar PDF'}
          </p>
          {receita === 0 && <p className="text-[10px] text-gray-400 mt-1">Aba Vendas (PDF)</p>}
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 mb-1">Total Despesas</p>
            {variacaoDespesas !== null && (
              <span className={cn(
                'text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
                variacaoDespesas > 0 ? 'bg-red-50 text-red-600' : variacaoDespesas < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
              )}>
                {variacaoDespesas > 0 ? <TrendingUp size={10} /> : variacaoDespesas < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                {Math.abs(variacaoDespesas).toFixed(1)}% vs mes ant.
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', resultado >= 0 ? 'border-green-200' : 'border-red-200')}>
          <p className="text-xs text-gray-500 mb-1">Resultado</p>
          <p className={cn('text-xl font-bold', receita === 0 ? 'text-gray-300' : resultado >= 0 ? 'text-green-600' : 'text-red-600')}>
            {receita > 0 ? formatCurrency(resultado) : '-'}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Receita - Despesas</p>
        </div>
      </div>

      {/* DRE Detalhado */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            DRE - {mesesNomes[mesFiltro - 1]} {anoFiltro}
            {unidadeFiltro !== 'todas' && (
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({activeUnidades.find(u => u.id === unidadeFiltro)?.nome})
              </span>
            )}
          </h3>
        </div>

        <div className="divide-y divide-gray-50">
          {/* Receita */}
          <div className="px-4 py-3 flex items-center justify-between bg-green-50/30">
            <span className="text-sm font-semibold text-gray-800">Receita Bruta</span>
            <span className={cn('text-sm font-bold', receita > 0 ? 'text-green-700' : 'text-gray-300')}>
              {receita > 0 ? formatCurrency(receita) : 'Importar via Vendas (PDF)'}
            </span>
          </div>
          {faturamento && receita > 0 && (
            <>
              {faturamento.cartaoCredito > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Cartao Credito</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.cartaoCredito)}</span>
                </div>
              )}
              {faturamento.cartaoDebito > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Cartao Debito</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.cartaoDebito)}</span>
                </div>
              )}
              {faturamento.pagInstantaneo > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Pag. Instantaneo (Pix)</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.pagInstantaneo)}</span>
                </div>
              )}
              {faturamento.dinheiro > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Dinheiro</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.dinheiro)}</span>
                </div>
              )}
              {faturamento.valeRefeicao > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Vale Refeicao</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.valeRefeicao)}</span>
                </div>
              )}
              {faturamento.valeAlimentacao > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Vale Alimentacao</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.valeAlimentacao)}</span>
                </div>
              )}
              {faturamento.multibeneficios > 0 && (
                <div className="px-8 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Multibeneficios</span>
                  <span className="text-xs text-gray-500">{formatCurrency(faturamento.multibeneficios)}</span>
                </div>
              )}
            </>
          )}

          {/* Grupos de despesa */}
          {gruposOrdem.map(grupo => {
            const data = despesasPorGrupo.get(grupo)!
            if (data.total === 0) return null
            return (
              <div key={grupo}>
                <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
                  <span className="text-sm font-semibold text-gray-700">(-) {grupoLabels[grupo]}</span>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(data.total)}</span>
                </div>
                {data.itens.map((item, idx) => (
                  <div key={idx} className="px-8 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-gray-600">{item.nome}</span>
                    <span className="text-xs text-gray-500">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            )
          })}

          {/* Sem plano (nao classificado) */}
          {contasFiltradas.filter(c => !c.planoContasId).length > 0 && (
            <div>
              <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
                <span className="text-sm font-semibold text-gray-700">(-) Nao classificado</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(contasFiltradas.filter(c => !c.planoContasId).reduce((s, c) => s + c.valor, 0))}
                </span>
              </div>
              {(() => {
                const naoClass = new Map<string, number>()
                for (const c of contasFiltradas.filter(c => !c.planoContasId)) {
                  naoClass.set(c.descricao, (naoClass.get(c.descricao) || 0) + c.valor)
                }
                return Array.from(naoClass.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([desc, val], idx) => (
                    <div key={idx} className="px-8 py-1.5 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{desc}</span>
                      <span className="text-xs text-gray-500">{formatCurrency(val)}</span>
                    </div>
                  ))
              })()}
            </div>
          )}

          {/* Total */}
          <div className="px-4 py-3 flex items-center justify-between bg-gray-100">
            <span className="text-sm font-bold text-gray-800">TOTAL DESPESAS</span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(totalDespesas)}</span>
          </div>

          {/* Resultado */}
          {receita > 0 && (
            <div className={cn('px-4 py-3 flex items-center justify-between', resultado >= 0 ? 'bg-green-50' : 'bg-red-50')}>
              <span className="text-sm font-bold text-gray-800">RESULTADO DO PERIODO</span>
              <span className={cn('text-sm font-bold', resultado >= 0 ? 'text-green-700' : 'text-red-700')}>
                {formatCurrency(resultado)}
              </span>
            </div>
          )}

          {totalDespesas === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Nenhuma despesa registrada neste periodo.
              {unidadeFiltro !== 'todas' && ' Verifique se as contas tem unidade (centro de custo) atribuida.'}
            </div>
          )}
        </div>
      </div>

      {/* Dica sobre receita */}
      {receita === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <strong>Sobre a Receita:</strong> Importe o PDF de Faturamento Diario do DataCaixa na aba "Vendas (PDF)"
          para que a receita apareca aqui automaticamente.
          Por enquanto, o DRE mostra apenas as despesas agrupadas por categoria do plano de contas.
        </div>
      )}
    </div>
  )
}
