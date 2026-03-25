import { useState, useEffect, useCallback } from 'react'
import { Send, Factory, BarChart3, List, IceCream, Users, ClipboardCheck, Loader2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StockExitForm } from './StockExitForm'
import { ProductionForm } from './ProductionForm'
import { StockDashboard } from './StockDashboard'
import { StockMovements } from './StockMovements'
import { FlavorManager } from './FlavorManager'
import { ColaboradorManager } from './ColaboradorManager'
import { InventoryModule } from './InventoryModule'
import type { Flavor, StockMovement, Colaborador, InventoryCount } from '@/data/stockData'
import { initialFlavors, initialMovements, initialColaboradores, initialInventories, getActiveColaboradores } from '@/data/stockData'
import * as db from '@/lib/database'

type EstoqueTab = 'indicadores' | 'saida' | 'producao' | 'inventario' | 'historico' | 'sabores' | 'colaboradores'

const tabs: { id: EstoqueTab; label: string; icon: React.ReactNode }[] = [
  { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
  { id: 'saida', label: 'Saida p/ Balcao', icon: <Send size={16} /> },
  { id: 'producao', label: 'Producao', icon: <Factory size={16} /> },
  { id: 'inventario', label: 'Inventario', icon: <ClipboardCheck size={16} /> },
  { id: 'historico', label: 'Historico', icon: <List size={16} /> },
  { id: 'sabores', label: 'Sabores', icon: <IceCream size={16} /> },
  { id: 'colaboradores', label: 'Equipe', icon: <Users size={16} /> },
]

export function EstoqueSection() {
  const [activeTab, setActiveTab] = useState<EstoqueTab>('indicadores')
  const [flavors, setFlavors] = useState<Flavor[]>(initialFlavors)
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [colaboradores, setColaboradores] = useState<Colaborador[]>(initialColaboradores)
  const [inventories, setInventories] = useState<InventoryCount[]>(initialInventories)
  const [loading, setLoading] = useState(true)
  const [useSupabase, setUseSupabase] = useState(false)

  // Tenta carregar dados do Supabase; se falhar, usa dados locais
  const loadData = useCallback(async () => {
    try {
      const connected = await db.checkConnection()
      if (!connected) {
        setUseSupabase(false)
        setLoading(false)
        return
      }
      setUseSupabase(true)

      const [sabores, colabs, movs, invs] = await Promise.all([
        db.fetchSabores(),
        db.fetchColaboradores(),
        db.fetchMovimentacoes(),
        db.fetchInventarios(),
      ])

      setFlavors(sabores.length > 0 ? sabores : initialFlavors)
      setColaboradores(colabs.length > 0 ? colabs : initialColaboradores)
      setMovements(movs.length > 0 ? movs : initialMovements)
      setInventories(invs.length > 0 ? invs : initialInventories)
    } catch {
      setUseSupabase(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const activeNames = getActiveColaboradores(colaboradores)

  // === HANDLERS COM SUPABASE ===

  const handleAddMovements = async (newMovements: StockMovement[]) => {
    setMovements(prev => [...newMovements, ...prev])
    if (useSupabase) {
      try {
        await db.insertMovimentacoes(newMovements.map(m => ({
          sabor_id: m.saborId,
          quantidade: m.quantidade,
          unidade: m.unidade,
          tipo: m.tipo,
          responsavel: m.responsavel,
        })))
      } catch (err) {
        console.error('Erro ao salvar movimentacao:', err)
      }
    }
  }

  const handleAddFlavor = async (flavor: Flavor) => {
    if (useSupabase) {
      try {
        const saved = await db.insertSabor({
          nome: flavor.nome,
          categoria: flavor.categoria,
          unidades: flavor.unidades,
          status: flavor.status,
        })
        setFlavors(prev => [...prev, saved])
        return
      } catch (err) {
        console.error('Erro ao salvar sabor:', err)
      }
    }
    setFlavors(prev => [...prev, flavor])
  }

  const handleToggleFlavorStatus = async (id: string) => {
    const flavor = flavors.find(f => f.id === id)
    if (!flavor) return

    setFlavors(prev => prev.map(f =>
      f.id === id ? { ...f, status: f.status === 'ativo' ? 'inativo' : 'ativo' } : f
    ))
    if (useSupabase) {
      try {
        await db.toggleSaborStatus(id, flavor.status)
      } catch (err) {
        console.error('Erro ao atualizar sabor:', err)
      }
    }
  }

  const handleAddColaborador = async (colaborador: Colaborador) => {
    if (useSupabase) {
      try {
        const saved = await db.insertColaborador(colaborador.nome)
        setColaboradores(prev => [...prev, saved])
        return
      } catch (err) {
        console.error('Erro ao salvar colaborador:', err)
      }
    }
    setColaboradores(prev => [...prev, colaborador])
  }

  const handleToggleColaboradorStatus = async (id: string) => {
    const colab = colaboradores.find(c => c.id === id)
    if (!colab) return

    setColaboradores(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        status: c.status === 'ativo' ? 'inativo' : 'ativo',
        desativadoEm: c.status === 'ativo' ? new Date().toISOString().split('T')[0] : undefined,
      } : c
    ))
    if (useSupabase) {
      try {
        await db.toggleColaboradorStatus(id, colab.status)
      } catch (err) {
        console.error('Erro ao atualizar colaborador:', err)
      }
    }
  }

  const handleSaveInventory = async (inventory: InventoryCount) => {
    setInventories(prev => [inventory, ...prev])
    if (useSupabase) {
      try {
        await db.insertInventario(
          inventory.responsavel,
          inventory.itens.map(i => ({
            sabor_id: i.saborId,
            unidade: i.unidade,
            contagem: i.contagem,
            esperado: i.esperado,
            divergencia: i.divergencia,
          })),
          inventory.observacao,
        )
      } catch (err) {
        console.error('Erro ao salvar inventario:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#E91E63] animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Carregando dados...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection status */}
      {!useSupabase && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
          <WifiOff size={14} />
          Modo offline - dados locais (configure o Supabase para salvar permanentemente)
        </div>
      )}

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
        <StockExitForm flavors={flavors} colaboradores={activeNames} onSubmit={handleAddMovements} />
      )}
      {activeTab === 'producao' && (
        <ProductionForm flavors={flavors} colaboradores={activeNames} onSubmit={handleAddMovements} />
      )}
      {activeTab === 'inventario' && (
        <InventoryModule
          flavors={flavors}
          movements={movements}
          inventories={inventories}
          colaboradores={activeNames}
          onSaveInventory={handleSaveInventory}
        />
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
      {activeTab === 'colaboradores' && (
        <ColaboradorManager
          colaboradores={colaboradores}
          onAdd={handleAddColaborador}
          onToggleStatus={handleToggleColaboradorStatus}
        />
      )}
    </div>
  )
}
