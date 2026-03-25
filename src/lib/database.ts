import { supabase } from './supabase'
import type { Flavor, StockMovement, Colaborador, InventoryCount, InventoryItem } from '@/data/stockData'

// ============================================
// TIPOS DO BANCO (Supabase)
// ============================================

interface DbSabor {
  id: string
  nome: string
  categoria: string
  unidades: string[]
  status: string
  criado_em: string
}

interface DbColaborador {
  id: string
  nome: string
  status: string
  criado_em: string
  desativado_em: string | null
}

interface DbMovimentacao {
  id: string
  data: string
  sabor_id: string
  quantidade: number
  unidade: string
  tipo: string
  destino: string | null
  responsavel: string
  origem: string
  observacao: string | null
  sabores?: { nome: string }
}

interface DbInventario {
  id: string
  data: string
  responsavel: string
  observacao: string | null
}

interface DbInventarioItem {
  id: string
  inventario_id: string
  sabor_id: string
  unidade: string
  contagem: number
  esperado: number
  divergencia: number
  sabores?: { nome: string }
}

// ============================================
// CONVERSORES: Banco → App
// ============================================

function dbToFlavor(db: DbSabor): Flavor {
  return {
    id: db.id,
    nome: db.nome,
    categoria: db.categoria as Flavor['categoria'],
    unidades: db.unidades as Flavor['unidades'],
    status: db.status as Flavor['status'],
    criadoEm: db.criado_em,
  }
}

function dbToColaborador(db: DbColaborador): Colaborador {
  return {
    id: db.id,
    nome: db.nome,
    status: db.status as Colaborador['status'],
    criadoEm: db.criado_em,
    desativadoEm: db.desativado_em || undefined,
  }
}

function dbToMovement(db: DbMovimentacao): StockMovement {
  return {
    id: db.id,
    data: db.data,
    saborId: db.sabor_id,
    sabor: db.sabores?.nome || '',
    quantidade: db.quantidade,
    unidade: db.unidade as StockMovement['unidade'],
    tipo: db.tipo as StockMovement['tipo'],
    destino: (db.destino as StockMovement['destino']) || undefined,
    responsavel: db.responsavel,
    origem: db.origem as StockMovement['origem'],
    observacao: db.observacao || undefined,
  }
}

// ============================================
// SABORES
// ============================================

export async function fetchSabores(): Promise<Flavor[]> {
  const { data, error } = await supabase
    .from('sabores')
    .select('*')
    .order('nome')
  if (error) throw error
  return (data as DbSabor[]).map(dbToFlavor)
}

export async function insertSabor(flavor: Omit<Flavor, 'id' | 'criadoEm'>): Promise<Flavor> {
  const { data, error } = await supabase
    .from('sabores')
    .insert({
      nome: flavor.nome,
      categoria: flavor.categoria,
      unidades: flavor.unidades,
      status: flavor.status,
    })
    .select()
    .single()
  if (error) throw error
  return dbToFlavor(data as DbSabor)
}

export async function toggleSaborStatus(id: string, currentStatus: string): Promise<void> {
  const { error } = await supabase
    .from('sabores')
    .update({ status: currentStatus === 'ativo' ? 'inativo' : 'ativo' })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// COLABORADORES
// ============================================

export async function fetchColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('nome')
  if (error) throw error
  return (data as DbColaborador[]).map(dbToColaborador)
}

export async function insertColaborador(nome: string): Promise<Colaborador> {
  const { data, error } = await supabase
    .from('colaboradores')
    .insert({ nome })
    .select()
    .single()
  if (error) throw error
  return dbToColaborador(data as DbColaborador)
}

export async function toggleColaboradorStatus(id: string, currentStatus: string): Promise<void> {
  const { error } = await supabase
    .from('colaboradores')
    .update({
      status: currentStatus === 'ativo' ? 'inativo' : 'ativo',
      desativado_em: currentStatus === 'ativo' ? new Date().toISOString() : null,
    })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// MOVIMENTACOES
// ============================================

export async function fetchMovimentacoes(): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*, sabores(nome)')
    .order('data', { ascending: false })
  if (error) throw error
  return (data as DbMovimentacao[]).map(dbToMovement)
}

export async function insertMovimentacoes(movements: {
  sabor_id: string
  quantidade: number
  unidade: string
  tipo: string
  responsavel: string
  origem?: string
  observacao?: string
}[]): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('movimentacoes')
    .insert(movements.map(m => ({
      ...m,
      origem: m.origem || 'plataforma',
    })))
    .select('*, sabores(nome)')
  if (error) throw error
  return (data as DbMovimentacao[]).map(dbToMovement)
}

// Importacao em lote com data customizada (para dados historicos)
export async function insertMovimentacoesImport(movements: {
  sabor_id: string
  quantidade: number
  unidade: string
  tipo: string
  destino?: string
  responsavel: string
  data: string
  observacao?: string
}[]): Promise<number> {
  // Insere em lotes de 500 para evitar limite do Supabase
  const BATCH_SIZE = 500
  let totalInserted = 0

  for (let i = 0; i < movements.length; i += BATCH_SIZE) {
    const batch = movements.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('movimentacoes')
      .insert(batch.map(m => ({
        sabor_id: m.sabor_id,
        quantidade: m.quantidade,
        unidade: m.unidade,
        tipo: m.tipo,
        destino: m.destino || null,
        responsavel: m.responsavel,
        data: m.data,
        origem: 'importado' as const,
        observacao: m.observacao || null,
      })))
    if (error) throw error
    totalInserted += batch.length
  }

  return totalInserted
}

// ============================================
// INVENTARIOS
// ============================================

export async function fetchInventarios(): Promise<InventoryCount[]> {
  const { data: inventarios, error: invError } = await supabase
    .from('inventarios')
    .select('*')
    .order('data', { ascending: false })
  if (invError) throw invError

  const results: InventoryCount[] = []
  for (const inv of inventarios as DbInventario[]) {
    const { data: itens, error: itensError } = await supabase
      .from('inventario_itens')
      .select('*, sabores(nome)')
      .eq('inventario_id', inv.id)
    if (itensError) throw itensError

    results.push({
      id: inv.id,
      data: inv.data,
      responsavel: inv.responsavel,
      observacao: inv.observacao || undefined,
      itens: (itens as DbInventarioItem[]).map(item => ({
        saborId: item.sabor_id,
        sabor: item.sabores?.nome || '',
        unidade: item.unidade as InventoryItem['unidade'],
        contagem: item.contagem,
        esperado: item.esperado,
        divergencia: item.divergencia,
      })),
    })
  }
  return results
}

export async function insertInventario(
  responsavel: string,
  itens: { sabor_id: string; unidade: string; contagem: number; esperado: number; divergencia: number }[],
  observacao?: string
): Promise<void> {
  const { data: inv, error: invError } = await supabase
    .from('inventarios')
    .insert({ responsavel, observacao })
    .select()
    .single()
  if (invError) throw invError

  const { error: itensError } = await supabase
    .from('inventario_itens')
    .insert(itens.map(item => ({
      inventario_id: (inv as DbInventario).id,
      sabor_id: item.sabor_id,
      unidade: item.unidade,
      contagem: item.contagem,
      esperado: item.esperado,
      divergencia: item.divergencia,
    })))
  if (itensError) throw itensError
}

// ============================================
// HEALTH CHECK - testa conexao com o banco
// ============================================

export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sabores').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}
