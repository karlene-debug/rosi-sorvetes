import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, Package, ArrowDown, ArrowUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Flavor, StockMovement } from '@/data/stockData'
import { calcularSaldo, getTopFlavors, getMonthlyStats } from '@/data/stockData'

interface StockDashboardProps {
  flavors: Flavor[]
  movements: StockMovement[]
}

const COLORS = ['#E91E63', '#F06292', '#F48FB1', '#F8BBD0', '#FCE4EC', '#AD1457', '#C2185B', '#D81B60', '#EC407A', '#FF80AB']

export function StockDashboard({ flavors, movements }: StockDashboardProps) {
  const [viewMode, setViewMode] = useState<'balcao' | 'estoque'>('estoque')

  const saldos = calcularSaldo(movements, flavors)
  const topFlavors = getTopFlavors(movements, 10)
  const monthlyStats = getMonthlyStats(movements)

  // KPIs
  const totalEstoque = saldos.reduce((sum, s) => sum + s.balde + s.caixa5l + s.poteCreme, 0)
  const saboresComEstoque = saldos.filter(s => (s.balde + s.caixa5l + s.poteCreme) > 0).length
  const saboresZerados = saldos.filter(s => (s.balde + s.caixa5l + s.poteCreme) === 0).length
  const saboresNegativos = saldos.filter(s => (s.balde + s.caixa5l + s.poteCreme) < 0).length

  const today = new Date().toISOString().split('T')[0]
  const movHoje = movements.filter(m => m.data.startsWith(today))
  const producaoHoje = movHoje.filter(m => m.tipo === 'producao').reduce((s, m) => s + m.quantidade, 0)
  const saidaHoje = movHoje.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0)

  // Sabores criticos (estoque <= 2)
  const saboresCriticos = saldos
    .map(s => ({ ...s, total: s.balde + s.caixa5l + s.poteCreme }))
    .filter(s => s.total <= 2)
    .sort((a, b) => a.total - b.total)

  // Pie chart data
  const pieData = topFlavors.slice(0, 6).map(f => ({ name: f.sabor, value: f.total }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Estoque Total"
          value={totalEstoque}
          subtitle={`${saboresComEstoque} sabores com estoque`}
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
          value={saboresZerados + saboresNegativos}
          subtitle={`${saboresNegativos} negativo(s) · ${saboresZerados} zerado(s)`}
          icon={<AlertTriangle size={20} />}
          color="red"
          alert={saboresNegativos > 0}
        />
      </div>

      {/* Sabores Criticos */}
      {saboresCriticos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Sabores com estoque critico (2 ou menos)</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {saboresCriticos.map(s => (
              <span
                key={s.saborId}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full font-medium',
                  s.total < 0 ? 'bg-red-100 text-red-700' : s.total === 0 ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                )}
              >
                {s.sabor}: {s.total}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top sabores mais saem */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Top 10 - Sabores mais saem</h3>
              <p className="text-xs text-gray-500">Total historico de saidas</p>
            </div>
            <TrendingUp size={18} className="text-[#E91E63]" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topFlavors} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="sabor" tick={{ fontSize: 11 }} width={130} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value} un.`, 'Total saidas']}
              />
              <Bar dataKey="total" fill="#E91E63" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuicao por sabor */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Distribuicao de saidas</h3>
              <p className="text-xs text-gray-500">Top 6 sabores por volume</p>
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

      {/* Saldo por sabor */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Saldo em Estoque por Sabor</h3>
            <p className="text-xs text-gray-500">Quantidade atual disponivel</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as 'balcao' | 'estoque')}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="estoque">Todos</option>
              <option value="balcao">Somente com estoque</option>
            </select>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-2">Sabor</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-2">Balde</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-2">Caixa 5L</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-2">Pote Creme</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {saldos
                .filter(s => viewMode === 'estoque' || (s.balde + s.caixa5l + s.poteCreme) > 0)
                .map(s => {
                  const total = s.balde + s.caixa5l + s.poteCreme
                  return (
                    <tr key={s.saborId} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-sm text-gray-800">{s.sabor}</td>
                      <td className="px-4 py-2 text-center">
                        <StockBadge value={s.balde} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <StockBadge value={s.caixa5l} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <StockBadge value={s.poteCreme} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <StockBadge value={total} bold />
                      </td>
                    </tr>
                  )
                })}
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
