import { useState, useCallback, useEffect } from 'react'
import { Upload, Trash2, CheckCircle2, AlertCircle, Loader2, Calendar, DollarSign, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/data/financeData'
import type { Unidade } from '@/data/productTypes'
import * as dbV2 from '@/lib/database_v2'
import type { VendaUpload } from '@/lib/database_v2'
import { parsePDFFile, type ParsedReport } from '@/lib/pdfParser'

interface ImportVendasManagerProps {
  unidades: Unidade[]
}

type Step = 'upload' | 'preview' | 'success'

export function ImportVendasManager({ unidades }: ImportVendasManagerProps) {
  const [step, setStep] = useState<Step>('upload')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedReport | null>(null)
  const [fileName, setFileName] = useState('')
  const [unidadeId, setUnidadeId] = useState<string>('')
  const [uploads, setUploads] = useState<VendaUpload[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const activeUnidades = unidades.filter(u => u.status === 'ativo')

  const loadHistory = useCallback(async () => {
    try {
      const data = await dbV2.fetchVendaUploads()
      setUploads(data)
    } catch {
      // table may not exist yet
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Selecione um arquivo PDF.')
      return
    }

    setError(null)
    setUploading(true)
    setFileName(file.name)

    try {
      const result = await parsePDFFile(file)
      setParsedData(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar o PDF. Verifique se é um relatório do DataCaixa.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!parsedData) return

    setSaving(true)
    setError(null)

    try {
      const uploadId = await dbV2.insertVendaUpload({
        tipo: parsedData.tipo,
        arquivo_nome: fileName,
        periodo_inicio: parsedData.periodoInicio,
        periodo_fim: parsedData.periodoFim,
        unidade_id: unidadeId || undefined,
        total_geral: parsedData.totalGeral,
        qtd_registros: parsedData.tipo === 'faturamento_diario'
          ? parsedData.faturamento!.length
          : parsedData.produtos!.length,
      })

      if (parsedData.tipo === 'faturamento_diario' && parsedData.faturamento) {
        await dbV2.insertFaturamentoDiario(
          parsedData.faturamento.map(f => ({
            upload_id: uploadId,
            data: f.data,
            vale_refeicao: f.valeRefeicao,
            vale_alimentacao: f.valeAlimentacao,
            pag_instantaneo: f.pagInstantaneo,
            dinheiro: f.dinheiro,
            cartao_debito: f.cartaoDebito,
            cartao_credito: f.cartaoCredito,
            multibeneficios: f.multibeneficios,
            total: f.total,
            unidade_id: unidadeId || undefined,
          }))
        )
      } else if (parsedData.tipo === 'produtos_vendidos' && parsedData.produtos) {
        await dbV2.insertVendaProdutos(
          parsedData.produtos.map(p => ({
            upload_id: uploadId,
            descricao: p.descricao,
            quantidade: p.quantidade,
            unidade_medida: p.unidadeMedida,
            custo_total: p.custoTotal,
            valor_total: p.valorTotal,
            lucro: p.lucro,
            percentual: p.percentual,
            periodo_inicio: parsedData.periodoInicio,
            periodo_fim: parsedData.periodoFim,
            unidade_id: unidadeId || undefined,
          }))
        )
      }

      setStep('success')
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar dados.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUpload = async (id: string) => {
    if (!confirm('Excluir este upload e todos os dados relacionados?')) return
    try {
      await dbV2.deleteVendaUpload(id)
      setUploads(prev => prev.filter(u => u.id !== id))
    } catch {
      alert('Erro ao excluir upload.')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setParsedData(null)
    setFileName('')
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Importar Relatorio de Vendas</h3>
          <p className="text-xs text-gray-500 mb-4">
            Faca upload do PDF exportado do DataCaixa. O sistema detecta automaticamente se e
            um Relatorio de Faturamento Diario ou de Produtos Vendidos.
          </p>

          {/* Unidade selector */}
          {activeUnidades.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-gray-600 mb-1 block">Unidade (loja)</label>
              <select
                value={unidadeId}
                onChange={e => setUnidadeId(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-pink-300"
              >
                <option value="">Selecione a unidade</option>
                {activeUnidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Upload area */}
          <label className={cn(
            'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors',
            uploading ? 'border-pink-300 bg-pink-50' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/30'
          )}>
            {uploading ? (
              <>
                <Loader2 size={32} className="text-pink-500 animate-spin mb-2" />
                <span className="text-sm text-pink-600">Processando PDF...</span>
              </>
            ) : (
              <>
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 font-medium">Clique para selecionar o PDF</span>
                <span className="text-xs text-gray-400 mt-1">Relatorio de Faturamento Diario ou Produtos Vendidos</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && parsedData && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    parsedData.tipo === 'faturamento_diario'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  )}>
                    {parsedData.tipo === 'faturamento_diario' ? 'Faturamento Diario' : 'Produtos Vendidos'}
                  </span>
                  <span className="text-xs text-gray-500">{fileName}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Periodo: {formatDate(parsedData.periodoInicio)} a {formatDate(parsedData.periodoFim)}
                  {' | '}Total: {formatCurrency(parsedData.totalGeral)}
                  {' | '}{parsedData.tipo === 'faturamento_diario' ? parsedData.faturamento!.length + ' dias' : parsedData.produtos!.length + ' produtos'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-1.5 text-xs bg-[#E91E63] text-white rounded-lg hover:bg-[#C2185B] disabled:opacity-50 flex items-center gap-1">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  {saving ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Preview table: Faturamento */}
            {parsedData.tipo === 'faturamento_diario' && parsedData.faturamento && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-2 py-2 font-semibold text-gray-600">Data</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">V.Refeicao</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">V.Aliment.</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Pag.Inst.</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Dinheiro</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">C.Debito</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">C.Credito</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Multi.</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-800">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.faturamento.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-2 py-1.5 text-gray-700">{formatDate(row.data)}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.valeRefeicao > 0 ? formatCurrency(row.valeRefeicao) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.valeAlimentacao > 0 ? formatCurrency(row.valeAlimentacao) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.pagInstantaneo > 0 ? formatCurrency(row.pagInstantaneo) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.dinheiro > 0 ? formatCurrency(row.dinheiro) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.cartaoDebito > 0 ? formatCurrency(row.cartaoDebito) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.cartaoCredito > 0 ? formatCurrency(row.cartaoCredito) : '-'}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.multibeneficios > 0 ? formatCurrency(row.multibeneficios) : '-'}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-gray-800">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-2 py-2 text-gray-800">TOTAL</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.valeRefeicao, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.valeAlimentacao, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.pagInstantaneo, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.dinheiro, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.cartaoDebito, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.cartaoCredito, 0))}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.faturamento.reduce((s, r) => s + r.multibeneficios, 0))}</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-800">{formatCurrency(parsedData.totalGeral)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Preview table: Produtos */}
            {parsedData.tipo === 'produtos_vendidos' && parsedData.produtos && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-2 py-2 font-semibold text-gray-600">Produto</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Qtd</th>
                      <th className="text-center px-2 py-2 font-semibold text-gray-600">Unid.</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Custo</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Valor Total</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">Lucro</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-600">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.produtos.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-2 py-1.5 text-gray-700">{row.descricao}</td>
                        <td className="px-2 py-1.5 text-right text-gray-600">{row.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: row.unidadeMedida === 'KG' ? 2 : 0 })}</td>
                        <td className="px-2 py-1.5 text-center text-gray-500">{row.unidadeMedida}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{formatCurrency(row.custoTotal)}</td>
                        <td className="px-2 py-1.5 text-right text-gray-700 font-medium">{formatCurrency(row.valorTotal)}</td>
                        <td className="px-2 py-1.5 text-right text-green-600">{formatCurrency(row.lucro)}</td>
                        <td className="px-2 py-1.5 text-right text-gray-500">{row.percentual.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-2 py-2 text-gray-800">TOTAL ({parsedData.produtos.length} produtos)</td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(parsedData.produtos.reduce((s, r) => s + r.custoTotal, 0))}</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-800">{formatCurrency(parsedData.totalGeral)}</td>
                      <td className="px-2 py-2 text-right text-green-700">{formatCurrency(parsedData.produtos.reduce((s, r) => s + r.lucro, 0))}</td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="bg-white rounded-xl border border-green-200 p-6 text-center">
          <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Importacao concluida!</h3>
          <p className="text-xs text-gray-500 mb-4">
            {parsedData?.tipo === 'faturamento_diario'
              ? `${parsedData.faturamento!.length} dias de faturamento importados.`
              : `${parsedData?.produtos!.length} produtos importados.`
            }
            {' '}Total: {formatCurrency(parsedData?.totalGeral || 0)}
          </p>
          <p className="text-xs text-green-600 mb-4">
            Os dados de receita ja aparecem no DRE.
          </p>
          <button onClick={handleReset}
            className="px-4 py-2 text-sm bg-[#E91E63] text-white rounded-lg hover:bg-[#C2185B]">
            Importar outro relatorio
          </button>
        </div>
      )}

      {/* Upload History */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Historico de Importacoes</h3>
          <span className="text-xs text-gray-500">{uploads.length} upload(s)</span>
        </div>

        {loadingHistory ? (
          <div className="p-6 text-center">
            <Loader2 size={20} className="text-gray-400 animate-spin mx-auto" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            Nenhum relatorio importado ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {uploads.map(upload => (
              <div key={upload.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    upload.tipo === 'faturamento_diario' ? 'bg-blue-50' : 'bg-purple-50'
                  )}>
                    {upload.tipo === 'faturamento_diario'
                      ? <DollarSign size={14} className="text-blue-600" />
                      : <ShoppingBag size={14} className="text-purple-600" />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800">{upload.arquivoNome}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px]',
                        upload.tipo === 'faturamento_diario' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      )}>
                        {upload.tipo === 'faturamento_diario' ? 'Faturamento' : 'Produtos'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(upload.periodoInicio)} - {formatDate(upload.periodoFim)}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {formatCurrency(upload.totalGeral)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {upload.qtdRegistros} registros
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteUpload(upload.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Excluir upload"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <strong>Relatorios aceitos (DataCaixa):</strong>
        <ul className="mt-1 ml-4 list-disc space-y-0.5">
          <li><strong>Relatorio de Faturamento Diario</strong> — receita por dia e forma de pagamento (alimenta o DRE)</li>
          <li><strong>Relatorio de Produtos Vendidos</strong> — detalhamento de vendas por produto</li>
        </ul>
      </div>
    </div>
  )
}
