import { custosFixos } from '@/data/mockData'
import { Building2, Zap, Users, Package, Wifi, Calculator } from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const iconMap: Record<string, React.ReactNode> = {
  building: <Building2 size={20} />,
  zap: <Zap size={20} />,
  users: <Users size={20} />,
  package: <Package size={20} />,
  wifi: <Wifi size={20} />,
  calculator: <Calculator size={20} />,
}

export function FixedCosts() {
  const total = custosFixos.reduce((acc, c) => acc + c.valor, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Custos Fixos Mensais</h2>
            <p className="text-xs text-gray-500 mt-0.5">Despesas recorrentes do negócio</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total mensal</p>
            <p className="text-lg font-bold text-[#E91E63]">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {custosFixos.map((custo) => (
          <div key={custo.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FCE4EC]/20 transition-colors">
            <div className="w-10 h-10 bg-[#FCE4EC] rounded-xl flex items-center justify-center text-[#E91E63] flex-shrink-0">
              {iconMap[custo.icone]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{custo.categoria}</p>
              <p className="text-xs text-gray-400 truncate">{custo.descricao}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-800">{formatCurrency(custo.valor)}</p>
              <p className="text-xs text-gray-400">{((custo.valor / total) * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <div className="bg-[#FCE4EC] rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#E91E63]">Total dos Custos Fixos</span>
          <span className="text-base font-bold text-[#E91E63]">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
