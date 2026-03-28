import { useState, useEffect } from 'react'
import { Layers, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import type { Produto, ReceitaIngrediente } from '@/data/productTypes'
import * as dbV2 from '@/lib/database_v2'

interface MontagemFormProps {
  produtos: Produto[]
  colaboradores: string[]
  onSubmit: (
    derivadoId: string,
    derivadoNome: string,
    quantidade: number,
    unidade: string,
    ingredientes: { produtoId: string; produtoNome: string; quantidade: number; unidade: string }[],
    responsavel: string,
  ) => void
}

export function MontagemForm({ produtos, colaboradores, onSubmit }: MontagemFormProps) {
  const [selectedProdutoId, setSelectedProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [responsavel, setResponsavel] = useState('')
  const [receita, setReceita] = useState<ReceitaIngrediente[]>([])
  const [loadingReceita, setLoadingReceita] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Produtos derivados que podem ser montados
  const produtosDerivados = produtos
    .filter(p => p.status === 'ativo' && (
      p.tipoProducao === 'derivado' ||
      p.subcategoria === 'montagem_caixa' ||
      p.subcategoria === 'montagem_massa'
    ))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const selectedProduto = produtos.find(p => p.id === selectedProdutoId)

  // Carregar receita ao selecionar produto
  useEffect(() => {
    if (!selectedProdutoId) {
      setReceita([])
      return
    }
    setLoadingReceita(true)
    setError('')
    dbV2.fetchReceitas(selectedProdutoId)
      .then(data => {
        if (data.length === 0) {
          setError('Este produto nao tem receita cadastrada. Cadastre na aba Receitas primeiro.')
        }
        setReceita(data)
      })
      .catch(() => {
        setError('Erro ao carregar receita')
        setReceita([])
      })
      .finally(() => setLoadingReceita(false))
  }, [selectedProdutoId])

  const isValid = selectedProdutoId && quantidade > 0 && responsavel && receita.length > 0

  const handleSubmit = async () => {
    if (!isValid || !selectedProduto) return
    setSubmitting(true)

    const ingredientes = receita.map(r => ({
      produtoId: r.produtoIngredienteId,
      produtoNome: r.produtoIngredienteNome || '',
      quantidade: r.quantidade,
      unidade: r.unidade,
    }))

    onSubmit(
      selectedProdutoId,
      selectedProduto.nome,
      quantidade,
      selectedProduto.unidadeMedida,
      ingredientes,
      responsavel,
    )

    setSubmitting(false)
    setSelectedProdutoId('')
    setQuantidade(1)
    setResponsavel('')
    setReceita([])
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Montagem registrada com sucesso!</p>
            <p className="text-xs text-green-600">Saida dos ingredientes + entrada do produto derivado</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Layers size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Montagem Automatizada</h3>
            <p className="text-xs text-gray-500">
              Selecione o produto derivado e a quantidade. O sistema registra automaticamente a saida dos ingredientes e a entrada do produto montado.
            </p>
          </div>
        </div>

        {produtosDerivados.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhum produto derivado cadastrado. Cadastre produtos com tipo "Derivado" na aba Produtos.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Responsavel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel</label>
              <select
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
              >
                <option value="">Selecione seu nome...</option>
                {colaboradores.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Produto derivado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto a montar</label>
              <select
                value={selectedProdutoId}
                onChange={e => setSelectedProdutoId(e.target.value)}
                className="w-full sm:w-96 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
              >
                <option value="">Selecione o produto derivado...</option>
                {produtosDerivados.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:border-purple-300"
                />
                {selectedProduto && (
                  <span className="text-sm text-gray-500">{selectedProduto.unidadeMedida}</span>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Preview da receita */}
            {loadingReceita && (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Carregando receita...
              </div>
            )}

            {receita.length > 0 && (
              <div className="border border-purple-100 bg-purple-50/30 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-purple-700 uppercase mb-3">
                  Movimentacoes que serao registradas
                </h4>

                {/* Saidas */}
                <div className="space-y-1.5 mb-3">
                  <span className="text-[10px] font-semibold text-red-500 uppercase">Saida de ingredientes</span>
                  {receita.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm px-2 py-1 bg-white rounded">
                      <span className="text-gray-700">{r.produtoIngredienteNome}</span>
                      <span className="text-red-600 font-medium">
                        -{r.quantidade * quantidade} {r.unidade}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Entrada */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-green-600 uppercase">Entrada do produto montado</span>
                  <div className="flex items-center justify-between text-sm px-2 py-1 bg-white rounded">
                    <span className="text-gray-700 font-medium">{selectedProduto?.nome}</span>
                    <span className="text-green-600 font-medium">
                      +{quantidade} {selectedProduto?.unidadeMedida}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Layers size={16} />
                )}
                Registrar Montagem
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
