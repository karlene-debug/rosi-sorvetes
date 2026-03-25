import { useState, useMemo } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2, HelpCircle } from 'lucide-react'
import type { Flavor } from '@/data/stockData'
import * as db from '@/lib/database'

// ============================================
// TIPOS
// ============================================

interface ParsedRow {
  date: string       // ISO date string
  flavor: string     // nome do sabor (como veio do CSV)
  quantity: number
  unit: string
  type: 'producao' | 'saida'
  destino?: 'balcao' | 'montagem_massa'
  responsible: string
}

interface MatchedRow extends ParsedRow {
  saborId: string | null
  matchedName: string | null
  status: 'matched' | 'unmatched' | 'error'
  errorMsg?: string
}

type ImportStep = 'paste' | 'preview' | 'importing' | 'done'

interface DataImportToolProps {
  flavors: Flavor[]
  useSupabase: boolean
  onImportComplete: () => void
}

// ============================================
// HELPERS - Parsing
// ============================================

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length

  if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t'
  if (semicolonCount >= commaCount) return ';'
  return ','
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()

  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    const d = new Date(+year, +month - 1, +day, 12)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    const d = new Date(+year, +month - 1, +day, 12)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  // MM/DD/YYYY fallback (if month > 12 it won't match)
  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (usMatch && +usMatch[1] > 12) {
    const [, day, month, year] = usMatch
    const d = new Date(+year, +month - 1, +day, 12)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  return null
}

// Mapa de aliases: nomes que vem do Google Sheets → nome no sistema
const FLAVOR_ALIASES: Record<string, string> = {
  // Abreviacoes comuns
  'iogurte c/frutas verm': 'iogurte c/ frutas vermelhas',
  'iogurte c/ frutas verm': 'iogurte c/ frutas vermelhas',
  'iogurte c/frutas vermelhas': 'iogurte c/ frutas vermelhas',
  'iogurte com frutas vermelhas': 'iogurte c/ frutas vermelhas',
  'iogurte s/recheio': 'iogurte s/ recheio',
  'iogurte sem recheio': 'iogurte s/ recheio',
  'mousse c amendoa': 'mousse choc. c/ amendoa',
  'mousse c/ amendoa': 'mousse choc. c/ amendoa',
  'mousse de chocolate com amendoas': 'mousse choc. c/ amendoa',
  'musse de chocolate com amendoas': 'mousse choc. c/ amendoa',
  'mousse choc. c/ amendoa': 'mousse choc. c/ amendoa',
  'mousse maracuja': 'mousse maracuja',
  'mousse de maracuja': 'mousse maracuja',
  // Variantes de escrita
  'folhado doce de leite': 'folhado doce de leite',
  'passas ao rum': 'passas ao rum',
  'merengue de morango': 'merengue de morango',
  'sonho de moca': 'sonho de moca',
  'torta de limao': 'torta de limao',
  'leite ninho trufado': 'leite ninho trufado',
  'leite n.trufado': 'leite ninho trufado',
  'leite n. trufado': 'leite ninho trufado',
  'blue ice': 'blue ice',
  // Montagem caixa
  'chocolate com laka': 'chocolate com laka',
  'sensacao com flocos': 'sensacao com flocos',
  'ferrero rocher/leite ninho trufado': 'ferrero rocher / leite ninho trufado',
  'ferrero rocher / leite ninho trufado': 'ferrero rocher / leite ninho trufado',
  'iogurte com frutas vermelhas/leite ninho trufado': 'iogurte frutas verm. / leite ninho trufado',
  'iogurte frutas verm./leite ninho trufado': 'iogurte frutas verm. / leite ninho trufado',
  'iogurte frutas verm. / leite ninho trufado': 'iogurte frutas verm. / leite ninho trufado',
  // Montagem massa
  'acai/leite ninho': 'acai / leite ninho',
  'acai / leite ninho': 'acai / leite ninho',
  'nata/pave': 'nata / pave',
  'nata / pave': 'nata / pave',
  // Zero acucar variantes
  'zero acucar - chocolate': 'zero acucar - chocolate',
  'zero acucar chocolate': 'zero acucar - chocolate',
  'zero acucar - morango': 'zero acucar - morango',
  'zero acucar morango': 'zero acucar - morango',
  'zero acucar - torta de limao': 'zero acucar - torta de limao',
  'zero acucar torta de limao': 'zero acucar - torta de limao',
  'zero acucar - mousse de maracuja': 'zero acucar - mousse de maracuja',
  'zero acucar mousse de maracuja': 'zero acucar - mousse de maracuja',
  'amendoim zero': 'zero acucar - amendoim',
  'zero acucar - amendoim': 'zero acucar - amendoim',
  'zero acucar iogurte com frutas silvestres': 'zero acucar - iogurte com frutas silvestres',
  'zero acucar - iogurte com frutas silvestres': 'zero acucar - iogurte com frutas silvestres',
  'iogurte 0%': 'zero acucar - iogurte',
  // Outros nomes comuns
  'pave': 'pave',
  'bolo de sorvete': 'sorvete de bolo',
  'sorvete de bolo': 'sorvete de bolo',
  'abacaxi sem vinho': 'abacaxi sem vinho',
  'acai com banana': 'acai com banana',
  'cafe': 'cafe',
  'cafe com avela': 'cafe com avela',
  'iogurte grego': 'iogurte grego',
  'iogurte com frutas silvestres': 'iogurte com frutas silvestres',
  'iogurte com nutella': 'iogurte com nutella',
}

function matchFlavor(name: string, flavors: Flavor[]): { id: string; nome: string } | null {
  const normalized = normalizeText(name)
  if (!normalized) return null

  // 1. Exact match (normalized, strips accents)
  for (const f of flavors) {
    if (normalizeText(f.nome) === normalized) return { id: f.id, nome: f.nome }
  }

  // 2. Check alias table
  const aliasTarget = FLAVOR_ALIASES[normalized]
  if (aliasTarget) {
    for (const f of flavors) {
      if (normalizeText(f.nome) === aliasTarget) return { id: f.id, nome: f.nome }
    }
  }

  // 3. Normalize separators and retry: remove extra spaces, normalize / and -
  const cleanNorm = normalized.replace(/\s*[\/]\s*/g, ' / ').replace(/\s+/g, ' ')
  for (const f of flavors) {
    const cleanF = normalizeText(f.nome).replace(/\s*[\/]\s*/g, ' / ').replace(/\s+/g, ' ')
    if (cleanF === cleanNorm) return { id: f.id, nome: f.nome }
  }

  // 4. Partial match: CSV name contains flavor name or vice versa
  for (const f of flavors) {
    const fn = normalizeText(f.nome)
    if (fn.length > 3 && normalized.length > 3) {
      if (fn.includes(normalized) || normalized.includes(fn)) {
        return { id: f.id, nome: f.nome }
      }
    }
  }

  // 5. Word-based fuzzy: check if main words match
  const words = normalized.split(/[\s\/,]+/).filter(w => w.length > 2)
  if (words.length > 0) {
    let bestMatch: { id: string; nome: string; score: number } | null = null
    for (const f of flavors) {
      const fn = normalizeText(f.nome)
      const fWords = fn.split(/[\s\/,]+/).filter(w => w.length > 2)
      const matchedWords = words.filter(w => fWords.some(fw => fw.includes(w) || w.includes(fw)))
      const score = matchedWords.length / Math.max(words.length, fWords.length)
      if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: f.id, nome: f.nome, score }
      }
    }
    if (bestMatch) return { id: bestMatch.id, nome: bestMatch.nome }
  }

  return null
}

function detectUnit(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('caixa') || lower.includes('5l') || lower.includes('5 l')) return 'Caixa de 5 L'
  if (lower.includes('pote') || lower.includes('creme')) return 'Pote de Creme'
  return 'Balde'
}

// ============================================
// COMPONENT
// ============================================

export function DataImportTool({ flavors, useSupabase, onImportComplete }: DataImportToolProps) {
  const [step, setStep] = useState<ImportStep>('paste')
  const [rawText, setRawText] = useState('')
  const [importType, setImportType] = useState<'producao' | 'saida'>('producao')
  const [defaultResponsible, setDefaultResponsible] = useState('Importacao')
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([])
  const [importResult, setImportResult] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 })
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'all' | 'matched' | 'unmatched' | 'error'>('all')

  const activeFlavors = useMemo(
    () => flavors.filter(f => f.status === 'ativo'),
    [flavors]
  )

  // ============================================
  // PARSE CSV
  // ============================================
  const handleParse = () => {
    setError('')
    const lines = rawText.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      setError('Cole pelo menos 2 linhas (cabecalho + dados)')
      return
    }

    const separator = detectSeparator(rawText)
    const header = lines[0].split(separator).map(h => h.trim().toLowerCase())

    // Auto-detect columns
    const dateCol = header.findIndex(h =>
      normalizeText(h).match(/data|date|dia/)
    )
    const flavorCol = header.findIndex(h =>
      normalizeText(h).match(/sabor|flavor|produto|sorvete|nome/)
    )
    const qtyCol = header.findIndex(h =>
      normalizeText(h).match(/qtd|quantidade|qty|quant/)
    )
    const unitCol = header.findIndex(h =>
      normalizeText(h).match(/unid|unidade|unit|tipo.?unid/)
    )
    const typeCol = header.findIndex(h =>
      normalizeText(h).match(/tipo|type|movimento|moviment/)
    )
    const respCol = header.findIndex(h =>
      normalizeText(h).match(/resp|responsavel|quem|colab|^nome$/)
    )
    const destinoCol = header.findIndex(h =>
      normalizeText(h).match(/destino|montagem|balcao|massa/)
    )

    if (flavorCol === -1) {
      setError('Nao encontrei a coluna de sabor. O cabecalho deve conter "Sabor", "Produto" ou "Sorvete".')
      return
    }

    const rows: MatchedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim())
      if (cols.every(c => !c)) continue // skip empty rows

      const flavorName = cols[flavorCol] || ''
      if (!flavorName) continue

      // Parse date
      let date: string
      if (dateCol >= 0 && cols[dateCol]) {
        const parsed = parseDate(cols[dateCol])
        if (!parsed) {
          rows.push({
            date: '',
            flavor: flavorName,
            quantity: 0,
            unit: 'Balde',
            type: importType,
            responsible: defaultResponsible,
            saborId: null,
            matchedName: null,
            status: 'error',
            errorMsg: `Data invalida: "${cols[dateCol]}"`,
          })
          continue
        }
        date = parsed
      } else {
        date = new Date().toISOString()
      }

      // Parse quantity
      const rawQty = qtyCol >= 0 ? cols[qtyCol] : '1'
      const quantity = parseInt(rawQty.replace(/[^\d]/g, '')) || 1

      // Parse unit
      const unit = unitCol >= 0 ? detectUnit(cols[unitCol]) : detectUnit(flavorName)

      // Parse type
      let type = importType
      if (typeCol >= 0 && cols[typeCol]) {
        const t = normalizeText(cols[typeCol])
        if (t.includes('saida') || t.includes('balcao') || t.includes('venda')) type = 'saida'
        else if (t.includes('prod')) type = 'producao'
      }

      // Parse responsible
      const responsible = respCol >= 0 && cols[respCol] ? cols[respCol] : defaultResponsible

      // Parse destino (balcao ou montagem_massa)
      let destino: 'balcao' | 'montagem_massa' | undefined
      if (destinoCol >= 0 && cols[destinoCol]) {
        const d = normalizeText(cols[destinoCol])
        if (d.includes('montagem') || d.includes('massa')) {
          destino = 'montagem_massa'
        } else if (d.includes('balcao') || d.includes('venda') || d.includes('loja')) {
          destino = 'balcao'
        }
      }
      // Se tipo é saida e nao tem destino explicito, default é balcao
      if (type === 'saida' && !destino) {
        destino = 'balcao'
      }

      // Match flavor
      const match = matchFlavor(flavorName, activeFlavors)

      rows.push({
        date,
        flavor: flavorName,
        quantity,
        unit,
        type,
        destino,
        responsible,
        saborId: match?.id || null,
        matchedName: match?.nome || null,
        status: match ? 'matched' : 'unmatched',
      })
    }

    if (rows.length === 0) {
      setError('Nenhuma linha de dados encontrada apos o cabecalho.')
      return
    }

    setMatchedRows(rows)
    setStep('preview')
  }

  // ============================================
  // FIX UNMATCHED — let user manually pick a flavor
  // ============================================
  const handleFixMatch = (index: number, saborId: string) => {
    const flavor = activeFlavors.find(f => f.id === saborId)
    if (!flavor) return
    setMatchedRows(prev => prev.map((r, i) =>
      i === index ? { ...r, saborId: flavor.id, matchedName: flavor.nome, status: 'matched' as const } : r
    ))
  }

  const handleRemoveRow = (index: number) => {
    setMatchedRows(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // IMPORT
  // ============================================
  const validRows = matchedRows.filter(r => r.status === 'matched')
  const unmatchedRows = matchedRows.filter(r => r.status === 'unmatched')
  const errorRows = matchedRows.filter(r => r.status === 'error')

  const handleImport = async () => {
    if (validRows.length === 0) return

    setStep('importing')
    try {
      const movements = validRows.map(r => ({
        sabor_id: r.saborId!,
        quantidade: r.quantity,
        unidade: r.unit,
        tipo: r.type,
        destino: r.destino,
        responsavel: r.responsible,
        data: r.date,
        observacao: 'Importado do Google Sheets',
      }))

      const inserted = await db.insertMovimentacoesImport(movements)
      setImportResult({ success: inserted, errors: unmatchedRows.length + errorRows.length })
      setStep('done')
      onImportComplete()
    } catch (err) {
      setError(`Erro ao importar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      setStep('preview')
    }
  }

  // ============================================
  // RESET
  // ============================================
  const handleReset = () => {
    setStep('paste')
    setRawText('')
    setMatchedRows([])
    setImportResult({ success: 0, errors: 0 })
    setError('')
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Upload size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Importar Dados do Google Sheets</h3>
              <p className="text-xs text-gray-500">Cole os dados CSV para importar producao e saidas historicas</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {/* Help panel */}
        {showHelp && (
          <div className="mb-5 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
            <p className="font-semibold mb-2">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs">
              <li>Abra sua planilha no Google Sheets</li>
              <li>Selecione as linhas que deseja importar (incluindo o cabecalho)</li>
              <li>Copie (Ctrl+C)</li>
              <li>Cole na area de texto abaixo (Ctrl+V)</li>
              <li>Clique em "Analisar Dados"</li>
            </ol>
            <p className="mt-3 font-semibold mb-1">Colunas reconhecidas:</p>
            <ul className="text-xs space-y-0.5">
              <li><strong>Data</strong> — data, dia (DD/MM/AAAA ou AAAA-MM-DD)</li>
              <li><strong>Sabor</strong> — sabor, produto, sorvete</li>
              <li><strong>Quantidade</strong> — qtd, quantidade</li>
              <li><strong>Unidade</strong> — unidade, unid (Balde/Caixa/Pote)</li>
              <li><strong>Tipo</strong> — tipo, movimento (producao/saida)</li>
              <li><strong>Destino</strong> — montagem massa/balcao, destino</li>
              <li><strong>Responsavel</strong> — responsavel, nome, quem</li>
            </ul>
            <p className="mt-3 text-xs text-blue-600">
              Minimo necessario: coluna de <strong>Sabor</strong>. As outras sao opcionais.
            </p>
          </div>
        )}

        {!useSupabase && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={16} className="inline mr-2" />
            Supabase nao conectado. A importacao requer conexao com o banco de dados.
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Paste */}
        {step === 'paste' && (
          <div className="space-y-4">
            {/* Config row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo padrao da movimentacao</label>
                <select
                  value={importType}
                  onChange={e => setImportType(e.target.value as 'producao' | 'saida')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
                >
                  <option value="producao">Producao (entrada no estoque)</option>
                  <option value="saida">Saida p/ Balcao (saida do estoque)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsavel padrao</label>
                <input
                  type="text"
                  value={defaultResponsible}
                  onChange={e => setDefaultResponsible(e.target.value)}
                  placeholder="Nome do responsavel..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
                />
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dados do Google Sheets
              </label>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`Cole aqui os dados copiados do Google Sheets...\n\nExemplo:\nData;Sabor;Qtd;Unidade;Montagem Massa/Balcao;Nome\n01/03/2025;Chocolate;3;Balde;Balcao;Rose\n01/03/2025;Morango;2;Balde;Montagem Massa;Bernardo`}
                rows={12}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-purple-300 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                {rawText ? `${rawText.split('\n').filter(l => l.trim()).length} linhas detectadas` : 'Aceita separacao por Tab, virgula ou ponto-e-virgula'}
              </p>
            </div>

            <button
              onClick={handleParse}
              disabled={!rawText.trim() || !useSupabase}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={16} />
              Analisar Dados
            </button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary — clicavel para filtrar */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setPreviewFilter('all')}
                className={`rounded-lg p-3 text-center transition-all border ${
                  previewFilter === 'all' ? 'ring-2 ring-gray-400 border-gray-300 bg-gray-50' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <p className="text-2xl font-bold text-gray-700">{matchedRows.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </button>
              <button
                onClick={() => setPreviewFilter('matched')}
                className={`rounded-lg p-3 text-center transition-all border ${
                  previewFilter === 'matched' ? 'ring-2 ring-green-400 border-green-300 bg-green-50' : 'border-green-100 bg-green-50/50 hover:bg-green-50'
                }`}
              >
                <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                <p className="text-xs text-green-600">Reconhecidos</p>
              </button>
              <button
                onClick={() => setPreviewFilter('unmatched')}
                className={`rounded-lg p-3 text-center transition-all border ${
                  previewFilter === 'unmatched' ? 'ring-2 ring-amber-400 border-amber-300 bg-amber-50' : 'border-amber-100 bg-amber-50/50 hover:bg-amber-50'
                }`}
              >
                <p className="text-2xl font-bold text-amber-700">{unmatchedRows.length}</p>
                <p className="text-xs text-amber-600">Nao encontrados</p>
              </button>
              <button
                onClick={() => setPreviewFilter('error')}
                className={`rounded-lg p-3 text-center transition-all border ${
                  previewFilter === 'error' ? 'ring-2 ring-red-400 border-red-300 bg-red-50' : 'border-red-100 bg-red-50/50 hover:bg-red-50'
                }`}
              >
                <p className="text-2xl font-bold text-red-700">{errorRows.length}</p>
                <p className="text-xs text-red-600">Com erro</p>
              </button>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Sabor (CSV)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Sabor (Sistema)</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Qtd</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Unid</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Tipo</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Destino</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matchedRows
                      .map((row, i) => ({ row, originalIndex: i }))
                      .filter(({ row }) => previewFilter === 'all' || row.status === previewFilter)
                      .map(({ row, originalIndex: i }) => (
                      <tr key={i} className={row.status === 'error' ? 'bg-red-50/50' : row.status === 'unmatched' ? 'bg-amber-50/50' : ''}>
                        <td className="px-3 py-2">
                          {row.status === 'matched' && <CheckCircle size={16} className="text-green-500" />}
                          {row.status === 'unmatched' && <AlertTriangle size={16} className="text-amber-500" />}
                          {row.status === 'error' && <X size={16} className="text-red-500" />}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {row.date ? new Date(row.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">{row.flavor}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.status === 'matched' ? (
                            <span className="text-green-700">{row.matchedName}</span>
                          ) : row.status === 'unmatched' ? (
                            <select
                              value=""
                              onChange={e => handleFixMatch(i, e.target.value)}
                              className="w-full px-2 py-1 border border-amber-200 rounded text-xs bg-white focus:outline-none focus:border-purple-300"
                            >
                              <option value="">Selecionar sabor...</option>
                              {activeFlavors.sort((a, b) => a.nome.localeCompare(b.nome)).map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-red-600 text-xs">{row.errorMsg}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">{row.quantity}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{row.unit}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            row.type === 'producao' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {row.type === 'producao' ? 'Producao' : 'Saida'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.destino && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              row.destino === 'montagem_massa' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {row.destino === 'montagem_massa' ? 'Montagem' : 'Balcao'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleRemoveRow(i)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remover linha"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {previewFilter !== 'all' && matchedRows.filter(r => r.status === previewFilter).length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                          Nenhum item neste filtro
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Voltar e editar dados
              </button>
              <div className="flex items-center gap-3">
                {unmatchedRows.length > 0 && (
                  <p className="text-xs text-amber-600">
                    {unmatchedRows.length} linha(s) serao ignoradas (nao reconhecidas)
                  </p>
                )}
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} />
                  Importar {validRows.length} registro(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-purple-600 animate-spin" />
            <p className="text-sm text-gray-600">Importando {validRows.length} registros para o Supabase...</p>
            <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800">Importacao concluida!</h4>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-green-600">{importResult.success}</span> registros importados com sucesso
                {importResult.errors > 0 && (
                  <> · <span className="text-amber-600">{importResult.errors}</span> ignorados</>
                )}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Upload size={16} />
              Importar mais dados
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
