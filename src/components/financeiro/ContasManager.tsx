import { useState } from 'react'
import { Plus, X, CheckCircle, AlertTriangle, Clock, DollarSign, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conta, PlanoContas, Fornecedor, SituacaoConta } from '@/data/financeData'
import type { Unidade } from '@/data/productTypes'
import { formatCurrency, formatDate, isOverdue, situacaoLabels, getMesAnoAtual } from '@/data/financeData'

interface ContasManagerProps {
  contas: Conta[]
  planoContas: PlanoContas[]
  fornecedores: Fornecedor[]
  unidades?: Unidade[]
  onAdd: (c: Omit<Conta, 'id'>) => void
  onAddParcelada: (contas: Omit<Conta, 'id'>[]) => void
  onUpdateSituacao: (id: string, situacao: SituacaoConta) => void
}

export function ContasManager({ contas, planoContas, fornecedores, unidades = [], onAdd, onAddParcelada, onUpdateSituacao }: ContasManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [filterSituacao, setFilterSituacao] = useState<SituacaoConta | 'todos'>('todos')
  const { mes, ano } = getMesAnoAtual()
  const [mesFiltro, setMesFiltro] = useState(mes)
  const [anoFiltro, setAnoFiltro] = useState(ano)
  const [sortCol, setSortCol] = useState<'descricao' | 'valor' | 'vencimento' | 'situacao'>('vencimento')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Form state
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [planoId, setPlanoId] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [unidadeId, setUnidadeId] = useState('')
  const [numeroNF, setNumeroNF] = useState('')
  const [dataDocumento, setDataDocumento] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [numParcelas, setNumParcelas] = useState(1)

  const activePlano = planoContas.filter(p => p.status === 'ativo')
  const activeFornecedores = fornecedores.filter(f => f.status === 'ativo')
  const activeUnidades = unidades.filter(u => u.status === 'ativo')

  // Atualizar atrasados
  const contasProcessadas = contas.map(c => ({
    ...c,
    situacao: isOverdue(c.dataVencimento, c.situacao) ? 'atrasado' as SituacaoConta : c.situacao,
  }))

  const filtered = contasProcessadas.filter(c => {
    if (filterSituacao !== 'todos' && c.situacao !== filterSituacao) return false
    if (c.mesReferencia && c.mesReferencia !== mesFiltro) return false
    if (c.anoReferencia && c.anoReferencia !== anoFiltro) return false
    return true
  }).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'descricao') return a.descricao.localeCompare(b.descricao) * dir
    if (sortCol === 'valor') return (a.valor - b.valor) * dir
    if (sortCol === 'situacao') return a.situacao.localeCompare(b.situacao) * dir
    return a.dataVencimento.localeCompare(b.dataVencimento) * dir
  })

  // KPIs
  const contasMes = contasProcessadas.filter(c => c.mesReferencia === mesFiltro && c.anoReferencia === anoFiltro)
  const totalPago = contasMes.filter(c => c.situacao === 'pago').reduce((s, c) => s + c.valor, 0)
  const totalPendente = contasMes.filter(c => c.situacao === 'pendente').reduce((s, c) => s + c.valor, 0)
  const totalAtrasado = contasMes.filter(c => c.situacao === 'atrasado').reduce((s, c) => s + c.valor, 0)
  const totalMes = contasMes.filter(c => c.situacao !== 'cancelado').reduce((s, c) => s + c.valor, 0)

  const resetForm = () => {
    setDescricao(''); setValor(''); setVencimento(''); setPlanoId(''); setFornecedorId('')
    setUnidadeId(''); setNumeroNF(''); setDataDocumento(''); setTipoPagamento('')
    setNumParcelas(1); setShowForm(false)
  }

  const handleAdd = () => {
    if (!descricao.trim() || !valor || !vencimento) return

    const valorTotal = parseFloat(valor)
    const plano = activePlano.find(p => p.id === planoId)
    const forn = activeFornecedores.find(f => f.id === fornecedorId)
    const unid = activeUnidades.find(u => u.id === unidadeId)

    if (numParcelas > 1) {
      // Gerar parcelas automaticamente
      const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100
      const parcelas: Omit<Conta, 'id'>[] = []

      for (let i = 0; i < numParcelas; i++) {
        const vencDate = new Date(vencimento + 'T12:00:00')
        vencDate.setMonth(vencDate.getMonth() + i)
        const vencStr = vencDate.toISOString().split('T')[0]

        // Ultima parcela pega a diferenca de arredondamento
        const vlr = i === numParcelas - 1
          ? valorTotal - valorParcela * (numParcelas - 1)
          : valorParcela

        parcelas.push({
          descricao: descricao.trim(),
          valor: vlr,
          dataDocumento: dataDocumento || undefined,
          dataVencimento: vencStr,
          planoContasId: planoId || undefined,
          planoContasNome: plano?.nome,
          fornecedorId: fornecedorId || undefined,
          fornecedorNome: forn?.nome,
          unidadeId: unidadeId || undefined,
          unidadeNome: unid?.nome,
          numeroNF: numeroNF || undefined,
          tipoPagamento: tipoPagamento || undefined,
          parcela: `${i + 1}/${numParcelas}`,
          totalParcelas: numParcelas,
          situacao: 'pendente',
          recorrente: false,
          mesReferencia: vencDate.getMonth() + 1,
          anoReferencia: vencDate.getFullYear(),
          origem: 'plataforma',
        })
      }

      onAddParcelada(parcelas)
    } else {
      const vencDate = new Date(vencimento + 'T12:00:00')
      onAdd({
        descricao: descricao.trim(),
        valor: valorTotal,
        dataDocumento: dataDocumento || undefined,
        dataVencimento: vencimento,
        planoContasId: planoId || undefined,
        planoContasNome: plano?.nome,
        fornecedorId: fornecedorId || undefined,
        fornecedorNome: forn?.nome,
        unidadeId: unidadeId || undefined,
        unidadeNome: unid?.nome,
        numeroNF: numeroNF || undefined,
        tipoPagamento: tipoPagamento || undefined,
        parcela: undefined,
        situacao: 'pendente',
        recorrente: false,
        mesReferencia: vencDate.getMonth() + 1,
        anoReferencia: vencDate.getFullYear(),
        origem: 'plataforma',
      })
    }

    resetForm()
  }

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  // Preview parcelamento
  const valorParcela = numParcelas > 1 && valor
    ? Math.round((parseFloat(valor) / numParcelas) * 100) / 100
    : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-gray-400" />
            <p className="text-xs text-gray-500">Total do mes</p>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-500" />
            <p className="text-xs text-gray-500">Pago</p>
          </div>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" />
            <p className="text-xs text-gray-500">Pendente</p>
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPendente)}</p>
        </div>
        <div className={cn('bg-white rounded-xl p-4 border', totalAtrasado > 0 ? 'border-red-200' : 'border-gray-100')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-xs text-gray-500">Atrasado</p>
          </div>
          <p className={cn('text-xl font-bold', totalAtrasado > 0 ? 'text-red-600' : 'text-gray-800')}>{formatCurrency(totalAtrasado)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <button onClick={() => { if (mesFiltro === 1) { setMesFiltro(12); setAnoFiltro(anoFiltro - 1) } else setMesFiltro(mesFiltro - 1) }}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">&lt;</button>
            <span className="text-sm font-semibold text-gray-800 min-w-[100px] text-center">{meses[mesFiltro - 1]} / {anoFiltro}</span>
            <button onClick={() => { if (mesFiltro === 12) { setMesFiltro(1); setAnoFiltro(anoFiltro + 1) } else setMesFiltro(mesFiltro + 1) }}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">&gt;</button>
            <select value={filterSituacao} onChange={e => setFilterSituacao(e.target.value as SituacaoConta | 'todos')}
              className="ml-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none">
              <option value="todos">Todas</option>
              {Object.entries(situacaoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Nova Conta'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Descricao *" value={descricao} onChange={e => setDescricao(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" autoFocus />
              <input type="number" placeholder="Valor total *" value={valor} onChange={e => setValor(e.target.value)} step="0.01" min="0"
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              <div>
                <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Vencimento (1a parcela se parcelado)</span>
              </div>
              <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                <option value="">Fornecedor</option>
                {activeFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <select value={planoId} onChange={e => setPlanoId(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                <option value="">Plano de contas</option>
                {activePlano.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              {activeUnidades.length > 0 && (
                <select value={unidadeId} onChange={e => setUnidadeId(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                  <option value="">Centro de custo (unidade)</option>
                  {activeUnidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              )}
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400 shrink-0" />
                <input type="text" placeholder="Numero NF" value={numeroNF} onChange={e => setNumeroNF(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
              </div>
              <div>
                <input type="date" value={dataDocumento} onChange={e => setDataDocumento(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Data do documento / NF</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="48" value={numParcelas} onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-[#F8BBD0]" />
                  <span className="text-sm text-gray-600">parcela(s)</span>
                </div>
                {valorParcela && (
                  <span className="text-[10px] text-purple-600 mt-0.5 block">
                    {numParcelas}x de {formatCurrency(valorParcela)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={handleAdd} disabled={!descricao.trim() || !valor || !vencimento}
                className="px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B] disabled:opacity-50 disabled:cursor-not-allowed">
                {numParcelas > 1 ? `Salvar ${numParcelas} parcelas` : 'Salvar'}
              </button>
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th onClick={() => toggleSort('descricao')} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700">
                  Descricao {sortCol === 'descricao' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => toggleSort('valor')} className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700">
                  Valor {sortCol === 'valor' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => toggleSort('vencimento')} className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700">
                  Vencimento {sortCol === 'vencimento' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Plano</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Unidade</th>
                <th onClick={() => toggleSort('situacao')} className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3 cursor-pointer hover:text-gray-700">
                  Situacao {sortCol === 'situacao' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">{c.descricao}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.fornecedorNome && <span className="text-xs text-gray-400">{c.fornecedorNome}</span>}
                      {c.parcela && <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">{c.parcela}</span>}
                      {c.numeroNF && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">NF {c.numeroNF}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{formatDate(c.dataVencimento)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{c.planoContasNome || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{c.unidadeNome || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {c.situacao === 'pago' ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">Pago</span>
                    ) : c.situacao === 'atrasado' ? (
                      <button onClick={() => onUpdateSituacao(c.id, 'pago')}
                        className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors">
                        Atrasado - Pagar
                      </button>
                    ) : c.situacao === 'cancelado' ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">Cancelado</span>
                    ) : (
                      <button onClick={() => onUpdateSituacao(c.id, 'pago')}
                        className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors">
                        Pendente - Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">Nenhuma conta encontrada neste periodo</div>}
        </div>
      </div>
    </div>
  )
}
