import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, Package, ArrowDown, ArrowUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'
import type { StockMovement } from '@/data/stockData'

interface StockDashboardProps {
  produtos: Produto[]
  movements: StockMovement[]
}

interface SaldoProduto {
  produtoId: string
  produto: string
  codigo?: string
  categoria: CategoriaProduto
  unidadeMedida: string
  saldo: number
}

interface TopProduto {
  produtoId: string
  produto: string
  total: number
}

interface MonthStat {
  mes: string
  producao: number
  saida: number
}

const COLORS = ['#E91E63', '#F06292', '#F48FB1', '#F8BBD0', '#FCE4EC', '#AD1457', '#C2185B', '#D81B60', '#EC407A', '#FF80AB']

function calcularSaldos(movements: StockMovement[], produtos: Produto[]): SaldoProduto[] {
  // Accumulate saldo per produtoId (saborId in StockMovement maps to produtoId)
  const saldoMap = new Map<string, number>()

  for (const m of movements) {
    const id = m.saborId
    const prev = saldoMap.get(id) ?? 0
    if (m.tipo === 'producao') {
      saldoMap.set(id, prev + m.quantidade)
    } else if (m.tipo === 'saida') {
      saldoMap.set(id, prev - m.quantidade)
    } else if (m.tipo === 'ajuste') {
      saldoMap.set(id, prev + m.quantidade)
    }
  }

  // Build result from produtos list, merging with calculated saldo
  const result: SaldoProduto[] = produtos.map(p => ({
    produtoId: p.id,
    produto: p.nome,
    codigo: p.codigo,
    categoria: p.categoria,
    unidadeMedida: p.unidadeMedida,
    saldo: saldoMap.get(p.id) ?? 0,
  }))

  // Include produtos that appear in movements but are not in the produtos list
  for (const [id, saldo] of saldoMap.entries()) {
    if (!result.find(r => r.produtoId === id)) {
      const mov = movements.find(m => m.saborId === id)
      result.push({
        produtoId: id,
        produto: mov?.sabor ?? id,
        categoria: 'outros',
        unidadeMedida: 'un',
        saldo,
      })
    }
  }

  return result.sort((a, b) => a.produto.localeCompare(b.produto))
}

function getTopProdutos(movements: StockMovement[], limit: number): TopProduto[] {
  const map = new Map<string, TopProduto>()

  for (const m of movements) {
    if (m.tipo === 'saida') {
      const entry = map.get(m.saborId)
      if (entry) {
        entry.total += m.quantidade
      } else {
        map.set(m.saborId, { produtoId: m.saborId, produto: m.sabor, total: m.quantidade })
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

function getMonthlyStats(movements: StockMovement[]): MonthStat[] {
  const map = new Map<string, { producao: number; saida: number }>()

  for (const m of movements) {
    const mes = m.data.slice(0, 7) // "YYYY-MM"
    const entry = map.get(mes) ?? { producao: 0, saida: 0 }
    if (m.tipo === 'producao') entry.producao += m.quantidade
    else if (m.tipo === 'saida') entry.saida += m.quantidade
    map.set(mes, entry)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, stats]) => ({ mes, ...stats }))
}

export function StockDashboard({ produtos, movements }: StockDashboardProps) {
  const [viewMode, setViewMode] = useState<'todos' | 'comEstoque'>('todos')

  const saldos = useMemo(() => calcularSaldos(movements, produtos), [movements, produtos])
  const topProdutos = useMemo(() => getTopProdutos(movements, 10), [movements])
  const monthlyStats = useMemo(() => getMonthlyStats(movements), [movements])

  // KPIs
  const totalEstoque = saldos.reduce((sum, s) => sum + Math.max(0, s.saldo), 0)
  const produtosComEstoque = saldos.filter(s => s.saldo > 0).length
  const produtosZerados = saldos.filter(s => s.saldo === 0).length
  const produtosNegativos = saldos.filter(s => s.saldo < 0).length

  const today = new Date().toISOString().split('T')[0]
  const movHoje = movements.filter(m => m.data.startsWith(today))
  const producaoHoje = movHoje.filter(m => m.tipo === 'producao').reduce((s, m) => s + m.quantidade, 0)
  const saidaHoje = movHoje.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0)

  // Produtos criticos (saldo <= 2)
  const produtosCriticos = saldos
    .filter(s => s.saldo <= 2)
    .sort((a, b) => a.saldo - b.saldo)

  // Pie chart data
  const pieData = topProdutos.slice(0, 6).map(p => ({ name: p.produto, value: p.total }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Estoque Total"
          value={totalEstoque}
          subtitle={`${produtosComEstoque} produto(s) com estoque`}
          icon={<Package size={20} />}
          color="pink"
        />
        <KPICard
          title="Producao Hoje"
          value={producaoHoje}
          subtitle="unidades produzidas"
          icon={<ArrowUp size={20} />}
          color="blue"
        />
        <KPICard
          title="Saidas Hoje"
          value={saidaHoje}
          subtitle="unidades p/ balcao"
          icon={<ArrowDown size={20} />}
          color="orange"
        />
        <KPICard
          title="Alertas"
          value={produtosZerados + produtosNegativos}
          subtitle={`${produtosNegativos} negativo(s) · ${produtosZerados} zerado(s)`}
          icon={<AlertTriangle size={20} />}
          color="red"
          alert={produtosNegativos > 0}
        />
      </div>

      {/* Produtos Criticos */}
      {produtosCriticos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Produtos com estoque critico (2 ou menos)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {produtosCriticos.map(s => (
              <span
                key={s.produtoId}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full font-medium',
                  s.saldo < 0 ? 'bg-red-100 text-red-700' : s.saldo === 0 ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                )}
              >
                {s.produto}: {s.saldo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top produtos mais saem */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Top 10 - Produtos mais saem</h3>
              <p className="text-xs text-gray-500">Total historico de saidas</p>
            </div>
            <TrendingUp size={18} className="text-[#E91E63]" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProdutos} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="produto" tick={{ fontSize: 11 }} width={130} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value} un.`, 'Total saidas']}
              />
              <Bar dataKey="total" fill="#E91E63" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuicao por produto */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Distribuicao de saidas</h3>
              <p className="text-xs text-gray-500">Top 6 produtos por volume</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#999', strokeWidth: 1 }}
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} un.`, 'Saidas']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Producao x Saida mensal */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Producao vs Saida - Mensal</h3>
            <p className="text-xs text-gray-500">Comparativo de entrada e saida por mes</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyStats} margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Line type="monotone" dataKey="producao" stroke="#2196F3" strokeWidth={2} name="Producao" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="saida" stroke="#E91E63" strokeWidth={2} name="Saida" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Saldo por produto */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Saldo em Estoque por Produto</h3>
            <p className="text-xs text-gray-500">Quantidade atual disponivel</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as 'todos' | 'comEstoque')}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="comEstoque">Somente com estoque</option>
            </select>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-2">Produto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-2">Codigo</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-2">Categoria</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-2">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {saldos
                .filter(s => viewMode === 'todos' || s.saldo > 0)
                .map(s => (
                  <tr key={s.produtoId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-sm text-gray-800">{s.produto}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{s.codigo ?? '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{categoriaLabels[s.categoria] ?? s.categoria}</td>
                    <td className="px-4 py-2 text-center">
                      <StockBadge value={s.saldo} bold />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon, color, alert }: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  color: 'pink' | 'blue' | 'orange' | 'red'
  alert?: boolean
}) {
  const colors = {
    pink: 'bg-[#FCE4EC] text-[#E91E63]',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className={cn('bg-white rounded-xl border p-4', alert ? 'border-red-200' : 'border-gray-100')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{title}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors[color])}>
          {icon}
        </div>
      </div>
      <p className={cn('text-2xl font-bold', alert ? 'text-red-600' : 'text-gray-800')}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

function StockBadge({ value, bold }: { value: number; bold?: boolean }) {
  if (value === 0) return <span className="text-xs text-gray-300">-</span>
  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full',
      bold ? 'font-semibold' : '',
      value < 0 ? 'bg-red-50 text-red-600' : value <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700'
    )}>
      {value}
    </span>
  )
}
