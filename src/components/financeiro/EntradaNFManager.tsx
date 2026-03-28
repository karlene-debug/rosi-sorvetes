import { useState, useMemo } from 'react'
import { Plus, Trash2, FileText, CheckCircle, Package, DollarSign, Loader2 } from 'lucide-react'
import type { Produto, CategoriaProduto } from '@/data/productTypes'
import type { Fornecedor, PlanoContas } from '@/data/financeData'
import type { Unidade } from '@/data/productTypes'
import { categoriaLabels } from '@/data/productTypes'
import { formatCurrency } from '@/data/financeData'

interface ItemNF {
  id: number
  produtoId: string
  quantidade: number
  unidade: string
  valorUnitario: number
}

interface EntradaNFManagerProps {
  produtos: Produto[]
  fornecedores: Fornecedor[]
  planoContas: PlanoContas[]
  unidades: Unidade[]
  onSubmit: (data: {
    numeroNF: string
    dataDocumento: string
    fornecedorId: string
    fornecedorNome: string
    unidadeId?: string
    planoContasId?: string
    itens: { produtoId: string; produtoNome: string; quantidade: number; unidade: string; valorUnitario: number }[]
    totalNF: number
    numParcelas: number
    dataVencimento: string
  }) => Promise<void>
}

// Categorias de insumos/materias-primas que entram via NF
const categoriasEntrada: CategoriaProduto[] = [
  'insumo', 'embalagem', 'limpeza', 'bebida', 'complemento', 'descartavel',
  'sorvete', 'bolo', 'acai', 'calda', 'cobertura', 'outros',
]

export function EntradaNFManager({ produtos, fornecedores, planoContas, unidades, onSubmit }: EntradaNFManagerProps) {
  const [numeroNF, setNumeroNF] = useState('')
  const [dataDocumento, setDataDocumento] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [unidadeId, setUnidadeId] = useState('')
  const [planoContasId, setPlanoContasId] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [numParcelas, setNumParcelas] = useState(1)
  const [items, setItems] = useState<ItemNF[]>([
    { id: 1, produtoId: '', quantidade: 1, unidade: '', valorUnitario: 0 },
  ])
  const [nextId, setNextId] = useState(2)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const activeFornecedores = fornecedores.filter(f => f.status === 'ativo')
  const activeUnidades = unidades.filter(u => u.status === 'ativo')
  const activePlano = planoContas.filter(p => p.status === 'ativo')

  const produtosAtivos = useMemo(() =>
    produtos
      .filter(p => p.status === 'ativo' && categoriasEntrada.includes(p.categoria))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos]
  )

  const grouped = useMemo(() =>
    categoriasEntrada
      .map(cat => ({
        cat,
        label: categoriaLabels[cat],
        prods: produtosAtivos.filter(p => p.categoria === cat),
      }))
      .filter(g => g.prods.length > 0),
    [produtosAtivos]
  )

  const addLine = () => {
    setItems([...items, { id: nextId, produtoId: '', quantidade: 1, unidade: '', valorUnitario: 0 }])
    setNextId(nextId + 1)
  }

  const removeLine = (id: number) => {
    if (items.length <= 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateLine = (id: number, field: keyof ItemNF, value: string | number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i
      if (field === 'produtoId') {
        const prod = produtosAtivos.find(p => p.id === value)
        return { ...i, produtoId: value as string, unidade: prod?.unidadeMedida || '' }
      }
      return { ...i, [field]: value }
    }))
  }

  const totalNF = items.reduce((sum, i) => sum + (i.quantidade * i.valorUnitario), 0)
  const valorParcela = numParcelas > 1 ? Math.round((totalNF / numParcelas) * 100) / 100 : totalNF
  const itensValidos = items.filter(i => i.produtoId && i.quantidade > 0)
  const isValid = numeroNF && dataDocumento && fornecedorId && dataVencimento && itensValidos.length > 0 && totalNF > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)

    const forn = activeFornecedores.find(f => f.id === fornecedorId)
    const submitItems = itensValidos.map(item => {
      const prod = produtosAtivos.find(p => p.id === item.produtoId)!
      return {
        produtoId: item.produtoId,
        produtoNome: prod.nome,
        quantidade: item.quantidade,
        unidade: item.unidade || prod.unidadeMedida,
        valorUnitario: item.valorUnitario,
      }
    })

    try {
      await onSubmit({
        numeroNF,
        dataDocumento,
        fornecedorId,
        fornecedorNome: forn?.nome || '',
        unidadeId: unidadeId || undefined,
        planoContasId: planoContasId || undefined,
        itens: submitItems,
        totalNF,
        numParcelas,
        dataVencimento,
      })

      // Reset form
      setNumeroNF('')
      setDataDocumento('')
      setFornecedorId('')
      setDataVencimento('')
      setNumParcelas(1)
      setItems([{ id: nextId, produtoId: '', quantidade: 1, unidade: '', valorUnitario: 0 }])
      setNextId(nextId + 1)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 4000)
    } catch (err) {
      console.error('Erro ao registrar NF:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Nota Fiscal registrada com sucesso!</p>
            <p className="text-xs text-green-600">Entrada no estoque + conta a pagar gerados automaticamente</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
            <FileText size={20} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Entrada de Nota Fiscal</h3>
            <p className="text-xs text-gray-500">
              Lance a NF do fornecedor. O sistema da entrada no estoque e cria a conta a pagar automaticamente.
            </p>
          </div>
        </div>

        {/* Cabecalho da NF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numero NF *</label>
            <input
              type="text"
              value={numeroNF}
              onChange={e => setNumeroNF(e.target.value)}
              placeholder="Ex: 001234"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data do documento *</label>
            <input
              type="date"
              value={dataDocumento}
              onChange={e => setDataDocumento(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor *</label>
            <select
              value={fornecedorId}
              onChange={e => setFornecedorId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
            >
              <option value="">Selecione...</option>
              {activeFornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          {activeUnidades.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidade (destino)</label>
              <select
                value={unidadeId}
                onChange={e => setUnidadeId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
              >
                <option value="">Todas</option>
                {activeUnidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plano de contas</label>
            <select
              value={planoContasId}
              onChange={e => setPlanoContasId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
            >
              <option value="">Selecione...</option>
              {activePlano.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Itens da NF */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Itens da Nota</h4>
          </div>

          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_80px_32px] gap-2 px-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">Produto</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Qtd</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Unidade</span>
              <span className="text-xs font-semibold text-gray-500 uppercase">Valor Unit.</span>
              <span className="text-xs font-semibold text-gray-500 uppercase text-right">Subtotal</span>
              <span></span>
            </div>

            {items.map((item, index) => {
              const selectedProd = produtosAtivos.find(p => p.id === item.produtoId)
              const subtotal = item.quantidade * item.valorUnitario
              return (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_100px_80px_32px] gap-2 items-center p-2 sm:p-0 bg-gray-50 sm:bg-transparent rounded-lg sm:rounded-none">
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Produto</span>}
                    <select
                      value={item.produtoId}
                      onChange={e => updateLine(item.id, 'produtoId', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
                    >
                      <option value="">Selecione...</option>
                      {grouped.map(g => (
                        <optgroup key={g.cat} label={g.label}>
                          {g.prods.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Qtd</span>}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantidade}
                      onChange={e => updateLine(item.id, 'quantidade', Math.max(0.01, parseFloat(e.target.value) || 0))}
                      className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-teal-300"
                    />
                  </div>
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Unidade</span>}
                    <input
                      type="text"
                      value={selectedProd ? selectedProd.unidadeMedida : item.unidade}
                      readOnly
                      className="w-full px-2 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Valor Unit.</span>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valorUnitario || ''}
                      onChange={e => updateLine(item.id, 'valorUnitario', Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="R$"
                      className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-teal-300"
                    />
                  </div>
                  <div className="text-right">
                    {index === 0 && <span className="text-xs text-gray-500 sm:hidden mb-1 block">Subtotal</span>}
                    <span className="text-sm font-medium text-gray-700">
                      {subtotal > 0 ? formatCurrency(subtotal) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeLine(item.id)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={addLine}
            className="mt-2 flex items-center justify-center gap-2 px-4 py-2 text-teal-600 border border-dashed border-teal-300 rounded-lg text-sm font-medium hover:bg-teal-50/30 transition-colors w-full"
          >
            <Plus size={16} />
            Adicionar item
          </button>
        </div>

        {/* Pagamento */}
        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Pagamento</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vencimento (1a parcela) *</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parcelas</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={numParcelas}
                  onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-teal-300"
                />
                <span className="text-sm text-gray-500">x</span>
                {numParcelas > 1 && totalNF > 0 && (
                  <span className="text-sm text-purple-600 font-medium">
                    {formatCurrency(valorParcela)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-teal-50 rounded-lg border border-teal-200">
                <span className="text-xs text-teal-600 block">Total da NF</span>
                <span className="text-lg font-bold text-teal-700">{formatCurrency(totalNF)}</span>
                <span className="text-xs text-teal-500 block">{itensValidos.length} item(ns)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-gray-400">
            Ao salvar: entrada no estoque de cada item + {numParcelas > 1 ? `${numParcelas} parcelas` : 'conta a pagar'} no financeiro
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Registrar Nota Fiscal
          </button>
        </div>
      </div>
    </div>
  )
}
