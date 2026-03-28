import { useMemo } from 'react'
import { AlertTriangle, TrendingDown, Package, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import type { StockMovement } from '@/data/stockData'
import { categoriaLabels } from '@/data/productTypes'

interface AlertasEstoqueProps {
  produtos: Produto[]
  movements: StockMovement[]
}

// Categorias relevantes pra alerta de estoque
const categoriasAlerta: CategoriaProduto[] = [
  'sorvete', 'bolo', 'acai', 'milkshake', 'taca', 'calda', 'cobertura',
  'insumo', 'embalagem', 'bebida', 'complemento', 'descartavel', 'limpeza',
]

interface ProdutoAlerta {
  id: string
  nome: string
  codigo?: string
  categoria: CategoriaProduto
  saldo: number
  unidade: string
  mediaSaidaDiaria: number
  diasRestantes: number | null
  nivel: 'critico' | 'baixo' | 'esgotado' | 'negativo'
}

export function AlertasEstoque({ produtos, movements }: AlertasEstoqueProps) {
  // Calcular saldo por produto
  const saldoMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of movements) {
      const current = map.get(m.saborId) || 0
      const delta = m.tipo === 'producao' ? m.quantidade : m.tipo === 'saida' ? -m.quantidade : m.quantidade
      map.set(m.saborId, current + delta)
    }
    return map
  }, [movements])

  // Calcular media de saida diaria dos ultimos 30 dias
  const mediaSaidaMap = useMemo(() => {
    const map = new Map<string, number>()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const saidasRecentes = movements.filter(m => m.tipo === 'saida' && new Date(m.data) >= cutoff)
    for (const m of saidasRecentes) {
      map.set(m.saborId, (map.get(m.saborId) || 0) + m.quantidade)
    }
    // Dividir por 30 pra ter media diaria
    for (const [id, total] of map) {
      map.set(id, total / 30)
    }
    return map
  }, [movements])

  const alertas: ProdutoAlerta[] = useMemo(() => {
    const result: ProdutoAlerta[] = []

    for (const p of produtos) {
      if (p.status !== 'ativo' || !categoriasAlerta.includes(p.categoria)) continue

      const saldo = saldoMap.get(p.id) || 0
      const mediaDiaria = mediaSaidaMap.get(p.id) || 0
      const diasRestantes = mediaDiaria > 0 ? Math.floor(saldo / mediaDiaria) : null

      let nivel: ProdutoAlerta['nivel'] | null = null

      if (saldo < 0) {
        nivel = 'negativo'
      } else if (saldo === 0) {
        nivel = 'esgotado'
      } else if (diasRestantes !== null && diasRestantes <= 3) {
        nivel = 'critico'
      } else if (diasRestantes !== null && diasRestantes <= 7) {
        nivel = 'baixo'
      } else if (saldo <= 2) {
        nivel = 'critico'
      }

      if (nivel) {
        result.push({
          id: p.id,
          nome: p.nome,
          codigo: p.codigo,
          categoria: p.categoria,
          saldo,
          unidade: p.unidadeMedida,
          mediaSaidaDiaria: Math.round(mediaDiaria * 10) / 10,
          diasRestantes,
          nivel,
        })
      }
    }

    // Ordenar: negativos primeiro, depois esgotados, criticos, baixos
    const ordem = { negativo: 0, esgotado: 1, critico: 2, baixo: 3 }
    return result.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
  }, [produtos, saldoMap, mediaSaidaMap])

  const negativos = alertas.filter(a => a.nivel === 'negativo')
  const esgotados = alertas.filter(a => a.nivel === 'esgotado')
  const criticos = alertas.filter(a => a.nivel === 'critico')
  const baixos = alertas.filter(a => a.nivel === 'baixo')

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cn('bg-white rounded-xl p-4 border', negativos.length > 0 ? 'border-red-300' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <p className="text-xs text-gray-500">Negativo</p>
          </div>
          <p className={cn('text-2xl font-bold', negativos.length > 0 ? 'text-red-600' : 'text-gray-300')}>{negativos.length}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', esgotados.length > 0 ? 'border-red-200' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-red-400" />
            <p className="text-xs text-gray-500">Esgotado</p>
          </div>
          <p className={cn('text-2xl font-bold', esgotados.length > 0 ? 'text-red-500' : 'text-gray-300')}>{esgotados.length}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', criticos.length > 0 ? 'border-amber-200' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-xs text-gray-500">Critico (3 dias)</p>
          </div>
          <p className={cn('text-2xl font-bold', criticos.length > 0 ? 'text-amber-600' : 'text-gray-300')}>{criticos.length}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', baixos.length > 0 ? 'border-yellow-200' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDown size={16} className="text-yellow-500" />
            <p className="text-xs text-gray-500">Baixo (7 dias)</p>
          </div>
          <p className={cn('text-2xl font-bold', baixos.length > 0 ? 'text-yellow-600' : 'text-gray-300')}>{baixos.length}</p>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <Package size={32} className="text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-800">Estoque saudavel!</p>
          <p className="text-xs text-green-600 mt-1">Nenhum produto com estoque baixo ou esgotado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Produto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Saldo</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Media/dia</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Dias restantes</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alertas.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.codigo && <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{a.codigo}</span>}
                        <span className="text-sm font-medium text-gray-800">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{categoriaLabels[a.categoria]}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-sm font-semibold',
                        a.saldo < 0 ? 'text-red-600' : a.saldo === 0 ? 'text-red-500' : 'text-amber-600'
                      )}>
                        {a.saldo} <span className="text-xs font-normal text-gray-400">{a.unidade}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 hidden sm:table-cell">
                      {a.mediaSaidaDiaria > 0 ? `${a.mediaSaidaDiaria}/dia` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-sm font-semibold',
                        a.diasRestantes === null ? 'text-gray-400' :
                        a.diasRestantes <= 0 ? 'text-red-600' :
                        a.diasRestantes <= 3 ? 'text-amber-600' : 'text-yellow-600'
                      )}>
                        {a.diasRestantes !== null ? (a.diasRestantes <= 0 ? '0' : a.diasRestantes) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium',
                        a.nivel === 'negativo' ? 'bg-red-100 text-red-700' :
                        a.nivel === 'esgotado' ? 'bg-red-50 text-red-600' :
                        a.nivel === 'critico' ? 'bg-amber-50 text-amber-700' :
                        'bg-yellow-50 text-yellow-700'
                      )}>
                        {a.nivel === 'negativo' ? 'Negativo' :
                         a.nivel === 'esgotado' ? 'Esgotado' :
                         a.nivel === 'critico' ? 'Critico' : 'Baixo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
