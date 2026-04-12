import { useState, useEffect, useMemo } from 'react'
import { Calculator, Loader2, AlertCircle } from 'lucide-react'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'
import { formatCurrency } from '@/data/financeData'
import * as dbV2 from '@/lib/database_v2'

interface CustoProducaoProps {
  produtos: Produto[]
}

interface CustoProduto {
  id: string
  nome: string
  codigo?: string
  categoria: CategoriaProduto
  rendimento?: number
  rendimentoUnidade?: string
  custoTotal: number | null
  custoUnitario: number | null
  precoVenda?: number
  margem: number | null
  ingredientes: { nome: string; quantidade: number; unidade: string; custoUnit: number | null; custoLinha: number | null }[]
  incompleto: boolean
}

const categoriasProducao: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
]

export function CustoProducao({ produtos }: CustoProducaoProps) {
  const [loading, setLoading] = useState(true)
  const [custos, setCustos] = useState<CustoProduto[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const produtosProducao = useMemo(() =>
    produtos.filter(p => p.status === 'ativo' && categoriasProducao.includes(p.categoria)),
    [produtos]
  )

  // Mapa de custo medio por produto (do campo custoMedio)
  const custoMedioMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of produtos) {
      if (p.custoMedio) map.set(p.id, p.custoMedio)
    }
    return map
  }, [produtos])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const result: CustoProduto[] = []

      for (const p of produtosProducao) {
        try {
          const receita = await dbV2.fetchReceitas(p.id)
          if (receita.length === 0) {
            result.push({
              id: p.id, nome: p.nome, codigo: p.codigo, categoria: p.categoria,
              rendimento: p.rendimento, rendimentoUnidade: p.rendimentoUnidade,
              custoTotal: null, custoUnitario: null, precoVenda: p.precoVenda,
              margem: null, ingredientes: [], incompleto: true,
            })
            continue
          }

          let custoTotal = 0
          let incompleto = false
          const ingredientes = receita.map(r => {
            const custoUnit = custoMedioMap.get(r.produtoIngredienteId) || null
            const custoLinha = custoUnit !== null ? custoUnit * r.quantidade : null
            if (custoLinha !== null) custoTotal += custoLinha
            else incompleto = true
            return {
              nome: r.produtoIngredienteNome || '',
              quantidade: r.quantidade,
              unidade: r.unidade,
              custoUnit,
              custoLinha,
            }
          })

          const rendimento = p.rendimento || 1
          const custoUnitario = !incompleto ? custoTotal / rendimento : null
          const margem = custoUnitario !== null && p.precoVenda
            ? ((p.precoVenda - custoUnitario) / p.precoVenda) * 100
            : null

          result.push({
            id: p.id, nome: p.nome, codigo: p.codigo, categoria: p.categoria,
            rendimento: p.rendimento, rendimentoUnidade: p.rendimentoUnidade,
            custoTotal: !incompleto ? custoTotal : null,
            custoUnitario, precoVenda: p.precoVenda, margem,
            ingredientes, incompleto,
          })
        } catch {
          // ignora erro individual
        }
      }

      setCustos(result.sort((a, b) => a.nome.localeCompare(b.nome)))
      setLoading(false)
    }

    load()
  }, [produtosProducao, custoMedioMap])

  const comCusto = custos.filter(c => c.custoTotal !== null)
  const semReceita = custos.filter(c => c.ingredientes.length === 0)
  const incompletos = custos.filter(c => c.incompleto && c.ingredientes.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-[#E91E63] animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Calculando custos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Com custo calculado</p>
          <p className="text-2xl font-bold text-green-600">{comCusto.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Sem receita</p>
          <p className="text-2xl font-bold text-gray-400">{semReceita.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Receita incompleta</p>
          <p className="text-2xl font-bold text-amber-500">{incompletos.length}</p>
        </div>
      </div>

      {incompletos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-700">
          <AlertCircle size={14} />
          Alguns produtos tem receita mas faltam custos nos ingredientes. Cadastre o custo medio nos Produtos ou lance NFs.
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <Calculator size={18} className="text-[#E91E63]" />
          <h3 className="text-sm font-semibold text-gray-800">Custo de Produção por Produto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Produto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Rendimento</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Custo/un</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Preco venda</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {custos.map(c => (
                <>
                  <tr
                    key={c.id}
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.codigo && <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.codigo}</span>}
                        <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                        {c.ingredientes.length === 0 && <span className="text-[10px] text-gray-400">(sem receita)</span>}
                        {c.incompleto && c.ingredientes.length > 0 && <span className="text-[10px] text-amber-500">(incompleto)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{categoriaLabels[c.categoria]}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {c.rendimento ? `${c.rendimento} ${c.rendimentoUnidade || ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">
                      {c.custoUnitario !== null ? (
                        <span className="text-gray-800">{formatCurrency(c.custoUnitario)}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 hidden sm:table-cell">
                      {c.precoVenda ? formatCurrency(c.precoVenda) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {c.margem !== null ? (
                        <span className={`text-sm font-semibold ${c.margem >= 50 ? 'text-green-600' : c.margem >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                          {c.margem.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === c.id && c.ingredientes.length > 0 && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={6} className="px-8 py-3 bg-gray-50/50">
                        <div className="space-y-1">
                          {c.ingredientes.map((ing, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{ing.nome}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-400">{ing.quantidade} {ing.unidade}</span>
                                <span className="text-gray-400">x {ing.custoUnit !== null ? formatCurrency(ing.custoUnit) : '?'}</span>
                                <span className="font-medium text-gray-700 w-20 text-right">
                                  {ing.custoLinha !== null ? formatCurrency(ing.custoLinha) : '-'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {c.custoTotal !== null && (
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 mt-1">
                              <span className="font-semibold text-gray-700">Total da receita</span>
                              <span className="font-semibold text-gray-800">{formatCurrency(c.custoTotal)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {custos.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Nenhum produto de producao cadastrado</div>
          )}
        </div>
      </div>
    </div>
  )
}
