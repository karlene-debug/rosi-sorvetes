import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react'
import { kpiData } from '@/data/mockData'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface KPICardProps {
  title: string
  value: string
  variation: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

function KPICard({ title, value, variation, icon, color, bgColor }: KPICardProps) {
  const isPositive = variation >= 0
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 ${bgColor} rounded-xl flex items-center justify-center`}>
          <span className={color}>{icon}</span>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
          isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
        }`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(variation)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">vs. mês anterior</p>
    </div>
  )
}

export function KPICards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KPICard
        title="Receita Mensal"
        value={formatCurrency(kpiData.receitaMensal)}
        variation={kpiData.receitaVariacao}
        icon={<DollarSign size={22} />}
        color="text-[#E91E63]"
        bgColor="bg-[#FCE4EC]"
      />
      <KPICard
        title="Despesas Mensais"
        value={formatCurrency(kpiData.despesasMensais)}
        variation={-kpiData.despesasVariacao}
        icon={<TrendingDown size={22} />}
        color="text-orange-500"
        bgColor="bg-orange-50"
      />
      <KPICard
        title="Lucro Líquido"
        value={formatCurrency(kpiData.lucroLiquido)}
        variation={kpiData.lucroVariacao}
        icon={<TrendingUp size={22} />}
        color="text-green-500"
        bgColor="bg-green-50"
      />
      <KPICard
        title="Margem de Lucro"
        value={`${kpiData.margemLucro}%`}
        variation={kpiData.margemVariacao}
        icon={<Percent size={22} />}
        color="text-purple-500"
        bgColor="bg-purple-50"
      />
    </div>
  )
}
