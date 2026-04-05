import { supabase } from './supabase'
import type { Unidade, Produto, Movimentacao, EstoquePorUnidade, OrdemProducao, ReceitaIngrediente } from '@/data/productTypes'

// ============================================
// UNIDADES
// ============================================

export async function fetchUnidades(): Promise<Unidade[]> {
  const { data, error } = await supabase
    .from('unidades')
    .select('*')
    .order('nome')
  if (error) throw error
  return (data || []).map(u => ({
    id: u.id,
    nome: u.nome,
    tipo: u.tipo,
    cnpj: u.cnpj || undefined,
    endereco: u.endereco || undefined,
    telefone: u.telefone || undefined,
    temFabricaSorvete: u.tem_fabrica_sorvete,
    temFabricaBolo: u.tem_fabrica_bolo,
    status: u.status,
    criadoEm: u.criado_em,
  }))
}

// ============================================
// PRODUTOS
// ============================================

export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('categoria, nome')
  if (error) throw error
  return (data || []).map(p => ({
    id: p.id,
    codigo: p.codigo || undefined,
    nome: p.nome,
    categoria: p.categoria,
    subcategoria: p.subcategoria || undefined,
    tipoProducao: p.tipo_producao || undefined,
    unidadeMedida: p.unidade_medida,
    custoMedio: p.custo_medio ? Number(p.custo_medio) : undefined,
    precoVenda: p.preco_venda ? Number(p.preco_venda) : undefined,
    pesoKg: p.peso_kg ? Number(p.peso_kg) : undefined,
    rendimento: p.rendimento ? Number(p.rendimento) : undefined,
    rendimentoUnidade: p.rendimento_unidade || undefined,
    status: p.status,
    criadoEm: p.criado_em,
  }))
}

export async function insertProduto(p: Omit<Produto, 'id' | 'criadoEm'>): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .insert({
      codigo: p.codigo || null,
      nome: p.nome,
      categoria: p.categoria,
      subcategoria: p.subcategoria || null,
      tipo_producao: p.tipoProducao || null,
      unidade_medida: p.unidadeMedida,
      custo_medio: p.custoMedio || null,
      preco_venda: p.precoVenda || null,
      peso_kg: p.pesoKg || null,
      status: p.status,
    })
    .select()
    .single()
  if (error) throw error
  return {
    id: data.id,
    codigo: data.codigo || undefined,
    nome: data.nome,
    categoria: data.categoria,
    subcategoria: data.subcategoria || undefined,
    tipoProducao: data.tipo_producao || undefined,
    unidadeMedida: data.unidade_medida,
    custoMedio: data.custo_medio ? Number(data.custo_medio) : undefined,
    precoVenda: data.preco_venda ? Number(data.preco_venda) : undefined,
    pesoKg: data.peso_kg ? Number(data.peso_kg) : undefined,
    status: data.status,
    criadoEm: data.criado_em,
  }
}

export async function updateProduto(id: string, updates: Partial<Produto>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}
  if (updates.nome !== undefined) dbUpdates.nome = updates.nome
  if (updates.codigo !== undefined) dbUpdates.codigo = updates.codigo
  if (updates.categoria !== undefined) dbUpdates.categoria = updates.categoria
  if (updates.subcategoria !== undefined) dbUpdates.subcategoria = updates.subcategoria
  if (updates.tipoProducao !== undefined) dbUpdates.tipo_producao = updates.tipoProducao
  if (updates.unidadeMedida !== undefined) dbUpdates.unidade_medida = updates.unidadeMedida
  if (updates.custoMedio !== undefined) dbUpdates.custo_medio = updates.custoMedio
  if (updates.precoVenda !== undefined) dbUpdates.preco_venda = updates.precoVenda
  if (updates.pesoKg !== undefined) dbUpdates.peso_kg = updates.pesoKg
  if (updates.rendimento !== undefined) dbUpdates.rendimento = updates.rendimento
  if (updates.rendimentoUnidade !== undefined) dbUpdates.rendimento_unidade = updates.rendimentoUnidade
  if (updates.status !== undefined) dbUpdates.status = updates.status

  const { error } = await supabase
    .from('produtos')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function toggleProdutoStatus(id: string, currentStatus: string): Promise<void> {
  const { error } = await supabase
    .from('produtos')
    .update({ status: currentStatus === 'ativo' ? 'inativo' : 'ativo' })
    .eq('id', id)
  if (error) throw error
}

// ============================================
// RECEITAS
// ============================================

export async function fetchReceitas(produtoDerivatoId: string): Promise<ReceitaIngrediente[]> {
  const { data, error } = await supabase
    .from('receitas')
    .select('*, produtos!receitas_produto_ingrediente_id_fkey(nome)')
    .eq('produto_derivado_id', produtoDerivatoId)
  if (error) throw error
  return (data || []).map(r => ({
    id: r.id,
    produtoDerivatoId: r.produto_derivado_id,
    produtoIngredienteId: r.produto_ingrediente_id,
    produtoIngredienteNome: r.produtos?.nome || '',
    quantidade: Number(r.quantidade),
    unidade: r.unidade,
  }))
}

export async function insertReceita(r: Omit<ReceitaIngrediente, 'id' | 'produtoIngredienteNome'>): Promise<void> {
  const { error } = await supabase
    .from('receitas')
    .insert({
      produto_derivado_id: r.produtoDerivatoId,
      produto_ingrediente_id: r.produtoIngredienteId,
      quantidade: r.quantidade,
      unidade: r.unidade,
    })
  if (error) throw error
}

export async function deleteReceita(id: string): Promise<void> {
  const { error } = await supabase.from('receitas').delete().eq('id', id)
  if (error) throw error
}

// ============================================
// MOVIMENTACOES (v2 - com produto_id e unidades)
// ============================================

export async function fetchMovimentacoesV2(): Promise<Movimentacao[]> {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      *,
      produtos(nome, codigo),
      unidade_origem:unidades!movimentacoes_unidade_origem_id_fkey(nome),
      unidade_destino:unidades!movimentacoes_unidade_destino_id_fkey(nome)
    `)
    .order('data', { ascending: false })
    .limit(1000)
  if (error) {
    // Fallback: tenta sem os joins das unidades (caso a migracao nao tenha rodado)
    const { data: fallback, error: fbError } = await supabase
      .from('movimentacoes')
      .select('*, sabores(nome)')
      .order('data', { ascending: false })
      .limit(1000)
    if (fbError) throw fbError
    return (fallback || []).map(m => ({
      id: m.id,
      data: m.data,
      produtoId: m.produto_id || m.sabor_id,
      produtoNome: m.produtos?.nome || m.sabores?.nome || '',
      quantidade: m.quantidade,
      unidade: m.unidade,
      tipo: m.tipo,
      destino: m.destino || undefined,
      responsavel: m.responsavel,
      origem: m.origem,
      observacao: m.observacao || undefined,
    }))
  }
  return (data || []).map(m => ({
    id: m.id,
    data: m.data,
    produtoId: m.produto_id || m.sabor_id,
    produtoNome: m.produtos?.nome || '',
    produtoCodigo: m.produtos?.codigo || undefined,
    quantidade: m.quantidade,
    unidade: m.unidade,
    tipo: m.tipo,
    destino: m.destino || undefined,
    unidadeOrigemId: m.unidade_origem_id || undefined,
    unidadeOrigemNome: m.unidade_origem?.nome || undefined,
    unidadeDestinoId: m.unidade_destino_id || undefined,
    unidadeDestinoNome: m.unidade_destino?.nome || undefined,
    responsavel: m.responsavel,
    origem: m.origem,
    observacao: m.observacao || undefined,
  }))
}

export async function insertMovimentacaoV2(mov: {
  produto_id: string
  quantidade: number
  unidade: string
  tipo: string
  destino?: string
  unidade_origem_id?: string
  unidade_destino_id?: string
  responsavel: string
  data?: string
  origem?: string
  observacao?: string
}): Promise<void> {
  const { error } = await supabase
    .from('movimentacoes')
    .insert({
      sabor_id: mov.produto_id,  // manter compatibilidade
      produto_id: mov.produto_id,
      quantidade: mov.quantidade,
      unidade: mov.unidade,
      tipo: mov.tipo,
      destino: mov.destino || null,
      unidade_origem_id: mov.unidade_origem_id || null,
      unidade_destino_id: mov.unidade_destino_id || null,
      responsavel: mov.responsavel,
      data: mov.data || new Date().toISOString(),
      origem: mov.origem || 'plataforma',
      observacao: mov.observacao || null,
    })
  if (error) throw error
}

// ============================================
// ESTOQUE POR UNIDADE
// ============================================

export async function fetchEstoquePorUnidade(unidadeId?: string): Promise<EstoquePorUnidade[]> {
  let query = supabase
    .from('vw_estoque_por_unidade')
    .select('*')

  if (unidadeId) {
    query = query.eq('unidade_id', unidadeId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(e => ({
    produtoId: e.produto_id,
    codigo: e.codigo || undefined,
    produto: e.produto,
    categoria: e.categoria,
    subcategoria: e.subcategoria || undefined,
    unidade: e.unidade || '',
    unidadeId: e.unidade_id || undefined,
    unidadeNome: e.unidade_nome || undefined,
    saldo: Number(e.saldo),
  }))
}

// ============================================
// ORDENS DE PRODUCAO
// ============================================

export async function fetchOrdensProducao(): Promise<OrdemProducao[]> {
  const { data, error } = await supabase
    .from('ordens_producao')
    .select('*, produtos(nome), unidades(nome)')
    .order('data', { ascending: false })
  if (error) throw error
  return (data || []).map(o => ({
    id: o.id,
    data: o.data,
    produtoId: o.produto_id,
    produtoNome: o.produtos?.nome || '',
    quantidade: Number(o.quantidade),
    unidade: o.unidade,
    status: o.status,
    responsavel: o.responsavel,
    unidadeId: o.unidade_id || undefined,
    unidadeNome: o.unidades?.nome || undefined,
    observacao: o.observacao || undefined,
    criadoEm: o.criado_em,
    finalizadoEm: o.finalizado_em || undefined,
  }))
}

export async function insertOrdemProducao(ordem: {
  produto_id: string
  quantidade: number
  unidade: string
  responsavel: string
  unidade_id?: string
  observacao?: string
}): Promise<void> {
  const { error } = await supabase
    .from('ordens_producao')
    .insert({
      data: new Date().toISOString().split('T')[0],
      produto_id: ordem.produto_id,
      quantidade: ordem.quantidade,
      unidade: ordem.unidade,
      responsavel: ordem.responsavel,
      unidade_id: ordem.unidade_id || null,
      observacao: ordem.observacao || null,
    })
  if (error) throw error
}

export async function updateOrdemProducaoStatus(id: string, status: string): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (status === 'finalizado') {
    updates.finalizado_em = new Date().toISOString()
  }
  const { error } = await supabase
    .from('ordens_producao')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

// ============================================
// VENDAS - UPLOADS & FATURAMENTO
// ============================================

export interface VendaUpload {
  id: string
  tipo: 'faturamento_diario' | 'produtos_vendidos'
  arquivoNome: string
  periodoInicio: string
  periodoFim: string
  unidadeId?: string
  totalGeral: number
  qtdRegistros: number
  criadoEm: string
}

export interface FaturamentoDiario {
  id?: string
  uploadId?: string
  data: string
  valeRefeicao: number
  valeAlimentacao: number
  pagInstantaneo: number
  dinheiro: number
  cartaoDebito: number
  cartaoCredito: number
  multibeneficios: number
  total: number
  unidadeId?: string
}

export interface VendaProduto {
  id?: string
  uploadId?: string
  descricao: string
  quantidade: number
  unidadeMedida: string
  custoTotal: number
  valorTotal: number
  lucro: number
  percentual: number
  periodoInicio?: string
  periodoFim?: string
  unidadeId?: string
}

export async function fetchVendaUploads(): Promise<VendaUpload[]> {
  const { data, error } = await supabase
    .from('vendas_uploads')
    .select('*, unidades(nome)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []).map(u => ({
    id: u.id,
    tipo: u.tipo,
    arquivoNome: u.arquivo_nome,
    periodoInicio: u.periodo_inicio,
    periodoFim: u.periodo_fim,
    unidadeId: u.unidade_id || undefined,
    unidadeNome: u.unidades?.nome || undefined,
    totalGeral: Number(u.total_geral),
    qtdRegistros: u.qtd_registros,
    criadoEm: u.criado_em,
  }))
}

export async function insertVendaUpload(upload: {
  tipo: 'faturamento_diario' | 'produtos_vendidos'
  arquivo_nome: string
  periodo_inicio: string
  periodo_fim: string
  unidade_id?: string
  total_geral: number
  qtd_registros: number
}): Promise<string> {
  const { data, error } = await supabase
    .from('vendas_uploads')
    .insert(upload)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function deleteVendaUpload(id: string): Promise<void> {
  const { error } = await supabase.from('vendas_uploads').delete().eq('id', id)
  if (error) throw error
}

export async function insertFaturamentoDiario(rows: {
  upload_id: string
  data: string
  vale_refeicao: number
  vale_alimentacao: number
  pag_instantaneo: number
  dinheiro: number
  cartao_debito: number
  cartao_credito: number
  multibeneficios: number
  total: number
  unidade_id?: string
}[]): Promise<void> {
  const { error } = await supabase.from('faturamento_diario').upsert(
    rows,
    { onConflict: 'data,unidade_id' }
  )
  if (error) throw error
}

export async function insertVendaProdutos(rows: {
  upload_id: string
  descricao: string
  quantidade: number
  unidade_medida: string
  custo_total: number
  valor_total: number
  lucro: number
  percentual: number
  periodo_inicio?: string
  periodo_fim?: string
  unidade_id?: string
}[]): Promise<void> {
  const { error } = await supabase.from('vendas_produtos').insert(rows)
  if (error) throw error
}

export async function fetchFaturamentoMensal(mes: number, ano: number, unidadeId?: string): Promise<{
  valeRefeicao: number
  valeAlimentacao: number
  pagInstantaneo: number
  dinheiro: number
  cartaoDebito: number
  cartaoCredito: number
  multibeneficios: number
  total: number
} | null> {
  let query = supabase
    .from('vw_faturamento_mensal')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)

  if (unidadeId) {
    query = query.eq('unidade_id', unidadeId)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return null

  // Consolidar se multiplas unidades
  const result = {
    valeRefeicao: 0, valeAlimentacao: 0, pagInstantaneo: 0,
    dinheiro: 0, cartaoDebito: 0, cartaoCredito: 0,
    multibeneficios: 0, total: 0,
  }
  for (const row of data) {
    result.valeRefeicao += Number(row.vale_refeicao || 0)
    result.valeAlimentacao += Number(row.vale_alimentacao || 0)
    result.pagInstantaneo += Number(row.pag_instantaneo || 0)
    result.dinheiro += Number(row.dinheiro || 0)
    result.cartaoDebito += Number(row.cartao_debito || 0)
    result.cartaoCredito += Number(row.cartao_credito || 0)
    result.multibeneficios += Number(row.multibeneficios || 0)
    result.total += Number(row.total || 0)
  }
  return result
}

// ============================================
// HEALTH CHECK V2
// ============================================

export async function checkConnectionV2(): Promise<{ connected: boolean; hasProdutos: boolean }> {
  try {
    const { data, error } = await supabase.from('produtos').select('id').limit(1)
    if (error) {
      // Tabela produtos nao existe ainda - tenta sabores
      const { error: sErr } = await supabase.from('sabores').select('id').limit(1)
      return { connected: !sErr, hasProdutos: false }
    }
    return { connected: true, hasProdutos: (data || []).length > 0 }
  } catch {
    return { connected: false, hasProdutos: false }
  }
}
