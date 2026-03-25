import { useState } from 'react'
import { Send, Factory, BarChart3, List, IceCream } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StockExitForm } from './StockExitForm'
import { ProductionForm } from './ProductionForm'
import { StockDashboard } from './StockDashboard'
import { StockMovements } from './StockMovements'
import { FlavorManager } from './FlavorManager'
import type { Flavor, StockMovement } from '@/data/stockData'
import { initialFlavors, initialMovements } from '@/data/stockData'

type EstoqueTab = 'indicadores' | 'saida' | 'producao' | 'historico' | 'sabores'

const tabs: { id: EstoqueTab; label: string; icon: React.ReactNode }[] = [
  { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
  { id: 'saida', label: 'Saida p/ Balcao', icon: <Send size={16} /> },
  { id: 'producao', label: 'Producao', icon: <Factory size={16} /> },
  { id: 'historico', label: 'Historico', icon: <List size={16} /> },
  { id: 'sabores', label: 'Sabores', icon: <IceCream size={16} /> },
]

export function EstoqueSection() {
  const [activeTab, setActiveTab] = useState<EstoqueTab>('indicadores')
  const [flavors, setFlavors] = useState<Flavor[]>(initialFlavors)
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)

  const handleAddMovements = (newMovements: StockMovement[]) => {
    setMovements(prev => [...prev, ...newMovements])
  }

  const handleAddFlavor = (flavor: Flavor) => {
    setFlavors(prev => [...prev, flavor])
  }

  const handleToggleFlavorStatus = (id: string) => {
    setFlavors(prev => prev.map(f =>
      f.id === id ? { ...f, status: f.status === 'ativo' ? 'inativo' : 'ativo' } : f
    ))
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-[#FCE4EC] text-[#E91E63] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'indicadores' && (
        <StockDashboard flavors={flavors} movements={movements} />
      )}
      {activeTab === 'saida' && (
        <StockExitForm flavors={flavors} onSubmit={handleAddMovements} />
      )}
      {activeTab === 'producao' && (
        <ProductionForm flavors={flavors} onSubmit={handleAddMovements} />
      )}
      {activeTab === 'historico' && (
        <StockMovements movements={movements} />
      )}
      {activeTab === 'sabores' && (
        <FlavorManager
          flavors={flavors}
          onAddFlavor={handleAddFlavor}
          onToggleStatus={handleToggleFlavorStatus}
        />
      )}
    </div>
  )
}
