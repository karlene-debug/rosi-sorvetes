import { useState, useEffect, useCallback } from 'react'
import { Send, Factory, BarChart3, List, ClipboardCheck, Loader2, WifiOff, Upload, Package, BookOpen, Layers, ArrowRightLeft, IceCream, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StockExitForm } from './StockExitForm'
import { ProductionForm } from './ProductionForm'
import { MontagemForm } from './MontagemForm'
import { TransferenciaForm } from './TransferenciaForm'
import { StockDashboard } from './StockDashboard'
import { StockMovements } from './StockMovements'
import { InventoryModule } from './InventoryModule'
import { DataImportTool } from './DataImportTool'
import { ProductManager } from './ProductManager'
import { ReceitasManager } from './ReceitasManager'
import { VitrineDigital } from './VitrineDigital'
import { AlertasEstoque } from './AlertasEstoque'
import type { StockMovement, InventoryCount } from '@/data/stockData'
import type { Produto, Unidade } from '@/data/productTypes'
import { initialMovements, initialInventories } from '@/data/stockData'
import { supabase } from '@/lib/supabase'
import * as db from '@/lib/database'
import * as dbV2 from '@/lib/database_v2'

type EstoqueTab = 'indicadores' | 'vitrine' | 'alertas' | 'saida' | 'producao' | 'montagem' | 'transferencia' | 'receitas' | 'inventario' | 'historico' | 'importar' | 'produtos'

const tabs: { id: EstoqueTab; label: string; icon: React.ReactNode }[] = [
  { id: 'indicadores', label: 'Indicadores', icon: <BarChart3 size={16} /> },
  { id: 'vitrine', label: 'Vitrine', icon: <IceCream size={16} /> },
  { id: 'alertas', label: 'Alertas', icon: <Bell size={16} /> },
  { id: 'saida', label: 'Saida p/ Balcao', icon: <Send size={16} /> },
  { id: 'producao', label: 'Producao', icon: <Factory size={16} /> },
  { id: 'montagem', label: 'Montagem', icon: <Layers size={16} /> },
  { id: 'transferencia', label: 'Transferencia', icon: <ArrowRightLeft size={16} /> },
  { id: 'receitas', label: 'Receitas', icon: <BookOpen size={16} /> },
  { id: 'inventario', label: 'Inventario', icon: <ClipboardCheck size={16} /> },
  { id: 'historico', label: 'Historico', icon: <List size={16} /> },
  { id: 'importar', label: 'Importar CSV', icon: <Upload size={16} /> },
  { id: 'produtos', label: 'Produtos', icon: <Package size={16} /> },
]

export function EstoqueSection() {
  const [activeTab, setActiveTab] = useState<EstoqueTab>('indicadores')
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [inventories, setInventories] = useState<InventoryCount[]>(initialInventories)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [nomesFuncionarios, setNomesFuncionarios] = useState<string[]>([])
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

      const [movs, invs] = await Promise.all([
        db.fetchMovimentacoes(),
        db.fetchInventarios(),
      ])

      setMovements(movs.length > 0 ? movs : initialMovements)
      setInventories(invs.length > 0 ? invs : initialInventories)

      // Carregar funcionarios ativos (modulo Pessoas) para usar como responsaveis
      try {
        const { data: funcData } = await supabase
          .from('funcionarios')
          .select('nome')
          .eq('status', 'ativo')
          .order('nome')
        if (funcData && funcData.length > 0) {
          setNomesFuncionarios(funcData.map(f => f.nome))
        }
      } catch {
        // Tabela funcionarios pode nao existir ainda
      }

      // Carregar produtos e unidades v2
      try {
        const [prods, unids] = await Promise.all([
          dbV2.fetchProdutos(),
          dbV2.fetchUnidades(),
        ])
        setProdutos(prods)
        setUnidades(unids)
      } catch {
        // Tabelas podem nao existir ainda
      }
    } catch {
      setUseSupabase(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === HANDLERS COM SUPABASE ===

  // Handler v2: producao e saida usando tabela produtos
  // Na producao: se o produto tem receita, desconta ingredientes automaticamente
  const handleAddMovementsV2 = async (
    tipo: 'producao' | 'saida',
    items: { produtoId: string; produtoNome: string; quantidade: number; unidade: string; responsavel?: string }[],
  ) => {
    const now = new Date().toISOString()
    const localMovements: StockMovement[] = items.map((item, idx) => ({
      id: `local_${Date.now()}_${idx}`,
      data: now,
      saborId: item.produtoId,
      sabor: item.produtoNome,
      quantidade: item.quantidade,
      unidade: item.unidade as StockMovement['unidade'],
      tipo,
      responsavel: item.responsavel || '',
      origem: 'plataforma' as const,
    }))

    // Se producao, verificar receitas e descontar ingredientes
    if (tipo === 'producao' && useSupabase) {
      for (const item of items) {
        try {
          const receita = await dbV2.fetchReceitas(item.produtoId)
          if (receita.length > 0) {
            const prod = produtos.find(p => p.id === item.produtoId)
            const rendimento = prod?.rendimento || 1
            const fator = item.quantidade / rendimento

            for (const r of receita) {
              const qtdDescontar = r.quantidade * fator
              // Movimentacao local
              localMovements.push({
                id: `local_${Date.now()}_ing_${r.id}`,
                data: now,
                saborId: r.produtoIngredienteId,
                sabor: r.produtoIngredienteNome || '',
                quantidade: qtdDescontar,
                unidade: r.unidade as StockMovement['unidade'],
                tipo: 'saida',
                responsavel: item.responsavel || '',
                origem: 'plataforma' as const,
              })
              // Supabase
              await dbV2.insertMovimentacaoV2({
                produto_id: r.produtoIngredienteId,
                quantidade: qtdDescontar,
                unidade: r.unidade,
                tipo: 'montagem_saida',
                destino: 'montagem',
                responsavel: item.responsavel || '',
                observacao: `Auto: producao de ${item.quantidade}x ${item.produtoNome}`,
              })
            }
          }
        } catch {
          // Se nao tem receita, segue sem descontar
        }
      }
    }

    setMovements(prev => [...localMovements, ...prev])

    if (useSupabase) {
      try {
        await Promise.all(items.map(item =>
          dbV2.insertMovimentacaoV2({
            produto_id: item.produtoId,
            quantidade: item.quantidade,
            unidade: item.unidade,
            tipo,
            destino: tipo === 'saida' ? 'balcao' : undefined,
            responsavel: item.responsavel || '',
          })
        ))
      } catch (err) {
        console.error('Erro ao salvar movimentacao v2:', err)
      }
    }
  }

  // Handler montagem: saida dos primarios + entrada do derivado
  const handleMontagem = async (
    derivadoId: string,
    derivadoNome: string,
    quantidade: number,
    unidade: string,
    ingredientes: { produtoId: string; produtoNome: string; quantidade: number; unidade: string }[],
    responsavel: string,
  ) => {
    const now = new Date().toISOString()
    const localMovements: StockMovement[] = []

    // Saida dos ingredientes
    ingredientes.forEach((ing, idx) => {
      localMovements.push({
        id: `local_${Date.now()}_out_${idx}`,
        data: now,
        saborId: ing.produtoId,
        sabor: ing.produtoNome,
        quantidade: ing.quantidade * quantidade,
        unidade: ing.unidade as StockMovement['unidade'],
        tipo: 'saida',
        responsavel,
        origem: 'plataforma' as const,
      })
    })

    // Entrada do derivado
    localMovements.push({
      id: `local_${Date.now()}_in`,
      data: now,
      saborId: derivadoId,
      sabor: derivadoNome,
      quantidade,
      unidade: unidade as StockMovement['unidade'],
      tipo: 'producao',
      responsavel,
      origem: 'plataforma' as const,
    })

    setMovements(prev => [...localMovements, ...prev])

    if (useSupabase) {
      try {
        // Registrar saida de cada ingrediente
        await Promise.all(ingredientes.map(ing =>
          dbV2.insertMovimentacaoV2({
            produto_id: ing.produtoId,
            quantidade: ing.quantidade * quantidade,
            unidade: ing.unidade,
            tipo: 'montagem_saida',
            destino: 'montagem',
            responsavel,
            observacao: `Montagem: ${derivadoNome}`,
          })
        ))

        // Registrar entrada do derivado
        await dbV2.insertMovimentacaoV2({
          produto_id: derivadoId,
          quantidade,
          unidade,
          tipo: 'montagem_entrada',
          responsavel,
          observacao: `Montagem de ${quantidade}x ${derivadoNome}`,
        })
      } catch (err) {
        console.error('Erro ao salvar montagem:', err)
      }
    }
  }

  // Handler transferencia
  const handleTransferencia = async (data: {
    origemId: string
    destinoId: string
    responsavel: string
    itens: { produtoId: string; produtoNome: string; quantidade: number; unidade: string }[]
  }) => {
    const origemNome = unidades.find(u => u.id === data.origemId)?.nome || ''
    const destinoNome = unidades.find(u => u.id === data.destinoId)?.nome || ''
    const now = new Date().toISOString()

    // Local state
    const localMovements: StockMovement[] = []
    data.itens.forEach((item, idx) => {
      localMovements.push({
        id: `local_${Date.now()}_tr_${idx}`,
        data: now,
        saborId: item.produtoId,
        sabor: item.produtoNome,
        quantidade: item.quantidade,
        unidade: item.unidade as StockMovement['unidade'],
        tipo: 'saida',
        responsavel: data.responsavel,
        origem: 'plataforma' as const,
      })
    })
    setMovements(prev => [...localMovements, ...prev])

    if (useSupabase) {
      try {
        for (const item of data.itens) {
          await dbV2.insertMovimentacaoV2({
            produto_id: item.produtoId,
            quantidade: item.quantidade,
            unidade: item.unidade,
            tipo: 'transferencia',
            unidade_origem_id: data.origemId,
            unidade_destino_id: data.destinoId,
            responsavel: data.responsavel,
            observacao: `Transferencia: ${origemNome} → ${destinoNome}`,
          })
        }
      } catch (err) {
        console.error('Erro ao salvar transferencia:', err)
      }
    }
  }

  const handleAddProduto = async (p: Omit<Produto, 'id' | 'criadoEm'>) => {
    if (useSupabase) {
      try {
        const saved = await dbV2.insertProduto(p)
        setProdutos(prev => [...prev, saved].sort((a, b) => a.nome.localeCompare(b.nome)))
      } catch (err) {
        console.error('Erro ao salvar produto:', err)
      }
    }
  }

  const handleUpdateProduto = async (id: string, updates: Partial<Produto>) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    if (useSupabase) {
      try {
        await dbV2.updateProduto(id, updates)
      } catch (err) {
        console.error('Erro ao atualizar produto:', err)
      }
    }
  }

  const handleDeleteProduto = async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
    if (!useSupabase) return { ok: false, motivo: 'Sem conexao com banco' }
    try {
      // Verificar se tem movimentacoes
      const { data: movs } = await supabase
        .from('movimentacoes')
        .select('id')
        .or(`produto_id.eq.${id},sabor_id.eq.${id}`)
        .limit(1)
      if (movs && movs.length > 0) {
        return { ok: false, motivo: 'Este produto tem movimentacoes registradas e nao pode ser apagado. Use "Inativo" em vez disso.' }
      }
      // Verificar se tem receitas
      const { data: recs } = await supabase
        .from('receitas')
        .select('id')
        .or(`produto_derivado_id.eq.${id},produto_ingrediente_id.eq.${id}`)
        .limit(1)
      if (recs && recs.length > 0) {
        return { ok: false, motivo: 'Este produto esta vinculado a uma receita e nao pode ser apagado.' }
      }
      // Pode apagar
      const { error } = await supabase.from('produtos').delete().eq('id', id)
      if (error) return { ok: false, motivo: error.message }
      setProdutos(prev => prev.filter(p => p.id !== id))
      return { ok: true }
    } catch {
      return { ok: false, motivo: 'Erro ao verificar dependencias' }
    }
  }

  const handleToggleProdutoStatus = async (id: string) => {
    const prod = produtos.find(p => p.id === id)
    if (!prod) return
    setProdutos(prev => prev.map(p =>
      p.id === id ? { ...p, status: p.status === 'ativo' ? 'inativo' : 'ativo' } : p
    ))
    if (useSupabase) {
      try {
        await dbV2.toggleProdutoStatus(id, prod.status)
      } catch (err) {
        console.error('Erro ao atualizar produto:', err)
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
        <StockDashboard produtos={produtos} movements={movements} />
      )}
      {activeTab === 'vitrine' && (
        <VitrineDigital produtos={produtos} movements={movements} />
      )}
      {activeTab === 'alertas' && (
        <AlertasEstoque produtos={produtos} movements={movements} />
      )}
      {activeTab === 'saida' && (
        <StockExitForm
          produtos={produtos}
          colaboradores={nomesFuncionarios}
          onSubmit={(items) => handleAddMovementsV2('saida', items)}
        />
      )}
      {activeTab === 'producao' && (
        <ProductionForm
          produtos={produtos}
          colaboradores={nomesFuncionarios}
          onSubmit={(items) => handleAddMovementsV2('producao', items)}
        />
      )}
      {activeTab === 'montagem' && (
        <MontagemForm
          produtos={produtos}
          colaboradores={nomesFuncionarios}
          onSubmit={handleMontagem}
        />
      )}
      {activeTab === 'transferencia' && (
        <TransferenciaForm
          produtos={produtos}
          unidades={unidades}
          colaboradores={nomesFuncionarios}
          onSubmit={handleTransferencia}
        />
      )}
      {activeTab === 'receitas' && (
        <ReceitasManager
          produtos={produtos}
          onUpdateRendimento={async (id, rend, rendUn) => {
            await dbV2.updateProduto(id, { rendimento: rend, rendimentoUnidade: rendUn })
            setProdutos(prev => prev.map(p => p.id === id ? { ...p, rendimento: rend, rendimentoUnidade: rendUn } : p))
          }}
        />
      )}
      {activeTab === 'inventario' && (
        <InventoryModule
          produtos={produtos}
          movements={movements}
          inventories={inventories}
          colaboradores={nomesFuncionarios}
          onSaveInventory={handleSaveInventory}
        />
      )}
      {activeTab === 'historico' && (
        <StockMovements movements={movements} />
      )}
      {activeTab === 'importar' && (
        <DataImportTool
          flavors={[]}
          useSupabase={useSupabase}
          onImportComplete={loadData}
        />
      )}
      {activeTab === 'produtos' && (
        <ProductManager
          produtos={produtos}
          onToggleStatus={handleToggleProdutoStatus}
          onAdd={handleAddProduto}
          onUpdate={handleUpdateProduto}
          onDelete={handleDeleteProduto}
        />
      )}
    </div>
  )
}
