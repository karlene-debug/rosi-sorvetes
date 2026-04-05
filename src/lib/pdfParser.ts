import type { FaturamentoDiario, VendaProduto } from './database_v2'

// Lazy-load pdfjs-dist only when needed (2MB+ worker)
let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
  }
  return pdfjsLib
}

export interface ParsedReport {
  tipo: 'faturamento_diario' | 'produtos_vendidos'
  periodoInicio: string
  periodoFim: string
  totalGeral: number
  faturamento?: FaturamentoDiario[]
  produtos?: VendaProduto[]
}

// Parse Brazilian number: "1.234,56" -> 1234.56
function parseBRNumber(str: string): number {
  if (!str || str.trim() === '') return 0
  const clean = str.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

// Parse Brazilian date: "01/01/2026" -> "2026-01-01"
function parseBRDate(str: string): string {
  const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

// Extract period from text like "Período: 01/01/2026 00:00 até 31/01/2026 23:59"
// or "Período: 01/02/2026 00:00:00 a 28/02/2026 23:59:59"
function extractPeriod(text: string): { inicio: string; fim: string } {
  const match = text.match(/Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})[\s\S]*?(?:at[eé]|a)\s+(\d{2}\/\d{2}\/\d{4})/)
  if (match) {
    return { inicio: parseBRDate(match[1]), fim: parseBRDate(match[2]) }
  }
  return { inicio: '', fim: '' }
}

// Detect report type from text content
function detectReportType(text: string): 'faturamento_diario' | 'produtos_vendidos' | null {
  if (text.includes('Faturamento Diário') || text.includes('Faturamento Diario') || text.includes('FATURAMENTO')) {
    return 'faturamento_diario'
  }
  if (text.includes('PRODUTOS VENDIDOS') || text.includes('Produtos Vendidos')) {
    return 'produtos_vendidos'
  }
  return null
}

interface TextItem {
  str: string
  x: number
  y: number
}

async function extractTextItems(file: File): Promise<{ items: TextItem[][]; fullText: string }> {
  const pdfjs = await getPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const allPageItems: TextItem[][] = []
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageItems: TextItem[] = []

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        pageItems.push({
          str: item.str.trim(),
          x: Math.round(('transform' in item ? (item.transform as number[])[4] : 0)),
          y: Math.round(('transform' in item ? (item.transform as number[])[5] : 0)),
        })
        fullText += item.str + ' '
      }
    }

    allPageItems.push(pageItems)
  }

  return { items: allPageItems, fullText }
}

// Group text items into rows by Y position (tolerance of 3px)
function groupIntoRows(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return []

  // Sort by Y descending (PDF Y is bottom-up), then X ascending
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)

  const rows: TextItem[][] = []
  let currentRow: TextItem[] = [sorted[0]]
  let currentY = sorted[0].y

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) <= 3) {
      currentRow.push(sorted[i])
    } else {
      rows.push(currentRow.sort((a, b) => a.x - b.x))
      currentRow = [sorted[i]]
      currentY = sorted[i].y
    }
  }
  rows.push(currentRow.sort((a, b) => a.x - b.x))

  return rows
}

function parseFaturamentoDiario(allPageItems: TextItem[][]): FaturamentoDiario[] {
  const results: FaturamentoDiario[] = []
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/

  // Column names in order and their indices
  const columnNames = ['vale_refeicao', 'vale_alimentacao', 'pag_instantaneo', 'dinheiro', 'cartao_debito', 'cartao_credito', 'multibeneficios', 'total'] as const

  for (const pageItems of allPageItems) {
    const rows = groupIntoRows(pageItems)

    // First: find the header row to get column X positions
    let columnPositions: { name: string; x: number }[] = []
    for (const row of rows) {
      const rowText = row.map(i => i.str).join(' ')
      if (rowText.includes('VALE') && rowText.includes('TOTAL')) {
        // This is the header row — record X positions
        // Map keywords to column names
        const headerMap: [RegExp, string][] = [
          [/VALE\s*REFEI/i, 'vale_refeicao'],
          [/VALE\s*ALIMENT/i, 'vale_alimentacao'],
          [/PAGAMENTO|INSTANTÂN/i, 'pag_instantaneo'],
          [/DINHEIRO/i, 'dinheiro'],
          [/CART.*D[ÉE]BITO/i, 'cartao_debito'],
          [/CART.*CR[ÉE]DITO/i, 'cartao_credito'],
          [/MULTI/i, 'multibeneficios'],
          [/^TOTAL$/i, 'total'],
        ]
        for (const item of row) {
          for (const [regex, name] of headerMap) {
            if (regex.test(item.str)) {
              columnPositions.push({ name, x: item.x })
              break
            }
          }
        }
        // Sort by X position
        columnPositions.sort((a, b) => a.x - b.x)
        break
      }
    }

    // If no header found, use fallback: assign by array position
    const usePositionMapping = columnPositions.length >= 6

    for (const row of rows) {
      const rowText = row.map(i => i.str).join(' ')
      if (rowText.includes('TOTAL GERAL') || rowText.includes('DATA') || rowText.includes('VALE')
        || rowText.includes('Emitido') || rowText.includes('Pag.') || rowText.includes('Período')) continue

      if (row.length > 0 && dateRegex.test(row[0].str)) {
        const dateStr = parseBRDate(row[0].str)
        if (!dateStr) continue

        const values: Record<string, number> = {
          vale_refeicao: 0, vale_alimentacao: 0, pag_instantaneo: 0,
          dinheiro: 0, cartao_debito: 0, cartao_credito: 0,
          multibeneficios: 0, total: 0,
        }

        const dataItems = row.slice(1) // skip the date

        if (usePositionMapping && columnPositions.length > 0) {
          // Position-based: assign each number to the closest column by X
          for (const item of dataItems) {
            const num = parseBRNumber(item.str)
            if (num === 0 && item.str.trim() !== '0' && item.str.trim() !== '0,00') continue

            // Find closest column header by X position
            let bestCol = columnPositions[0].name
            let bestDist = Math.abs(item.x - columnPositions[0].x)
            for (const col of columnPositions) {
              const dist = Math.abs(item.x - col.x)
              if (dist < bestDist) {
                bestDist = dist
                bestCol = col.name
              }
            }
            values[bestCol] = num
          }
        } else {
          // Fallback: total is always last number, rest in order
          const numbers = dataItems.map(item => parseBRNumber(item.str)).filter(n => !isNaN(n))
          if (numbers.length > 0) {
            values.total = numbers[numbers.length - 1]
            const rest = numbers.slice(0, -1)
            for (let i = 0; i < rest.length && i < columnNames.length - 1; i++) {
              values[columnNames[i]] = rest[i]
            }
          }
        }

        results.push({
          data: dateStr,
          valeRefeicao: values.vale_refeicao,
          valeAlimentacao: values.vale_alimentacao,
          pagInstantaneo: values.pag_instantaneo,
          dinheiro: values.dinheiro,
          cartaoDebito: values.cartao_debito,
          cartaoCredito: values.cartao_credito,
          multibeneficios: values.multibeneficios,
          total: values.total,
        })
      }
    }
  }

  return results.sort((a, b) => a.data.localeCompare(b.data))
}

function parseProdutosVendidos(allPageItems: TextItem[][]): VendaProduto[] {
  const results: VendaProduto[] = []
  const numberRegex = /^[\d.,]+$/
  const unitRegex = /^(KG|UNID|UN|LT|L|ML|G|PCT|CX)$/i

  for (const pageItems of allPageItems) {
    const rows = groupIntoRows(pageItems)

    for (const row of rows) {
      const rowText = row.map(i => i.str).join(' ')

      // Skip headers, footers, metadata
      if (rowText.includes('Descri') || rowText.includes('datacaixa') || rowText.includes('www.')
        || rowText.includes('ROSINEI') || rowText.includes('CNPJ') || rowText.includes('AVENIDA')
        || rowText.includes('Agrupado') || rowText.includes('Ordenado') || rowText.includes('Per')
        || rowText.includes('Filtro') || rowText.includes('RELATÓRIO') || rowText.includes('Pagina')
        || rowText.includes('Página') || rowText.includes('Tel:') || rowText.includes('E-mail')
        || rowText.includes('Custo Total') || rowText.includes('Valor Total')) continue

      // Look for product rows: description followed by numbers
      // Pattern: <description> <qty> <unit> <custo> <valor> <lucro> <%>
      if (row.length < 4) continue

      // Find where the numeric data starts
      let numStartIdx = -1
      for (let i = 1; i < row.length; i++) {
        if (numberRegex.test(row[i].str.replace(/\./g, '').replace(',', '.'))) {
          numStartIdx = i
          break
        }
      }

      if (numStartIdx < 1) continue

      // Description is everything before the first number
      const descricao = row.slice(0, numStartIdx).map(i => i.str).join(' ').trim()
      if (!descricao || descricao.length < 2) continue

      // Parse remaining items
      const remaining = row.slice(numStartIdx)
      const nums: number[] = []
      let unidadeMedida = 'UNID'

      for (const item of remaining) {
        if (unitRegex.test(item.str)) {
          unidadeMedida = item.str.toUpperCase()
        } else {
          const n = parseBRNumber(item.str)
          if (!isNaN(n)) nums.push(n)
        }
      }

      // We need at least: quantidade, custo_total, valor_total, lucro, percentual
      if (nums.length < 4) continue

      let quantidade: number, custoTotal: number, valorTotal: number, lucro: number, percentual: number

      if (nums.length >= 5) {
        quantidade = nums[0]
        custoTotal = nums[1]
        valorTotal = nums[2]
        lucro = nums[3]
        percentual = nums[4]
      } else {
        // 4 numbers: qty, custo, valor, lucro (no %)
        quantidade = nums[0]
        custoTotal = nums[1]
        valorTotal = nums[2]
        lucro = nums[3]
        percentual = valorTotal > 0 ? (lucro / valorTotal) * 100 : 0
      }

      results.push({
        descricao,
        quantidade,
        unidadeMedida,
        custoTotal,
        valorTotal,
        lucro,
        percentual,
      })
    }
  }

  return results
}

export async function parsePDFFile(file: File): Promise<ParsedReport> {
  const { items, fullText } = await extractTextItems(file)

  // Detect report type
  const tipo = detectReportType(fullText)
  if (!tipo) {
    throw new Error('Tipo de relatorio nao reconhecido. Envie um PDF de "Faturamento Diario" ou "Produtos Vendidos" do DataCaixa.')
  }

  // Extract period
  const period = extractPeriod(fullText)
  if (!period.inicio || !period.fim) {
    throw new Error('Nao foi possivel identificar o periodo do relatorio.')
  }

  if (tipo === 'faturamento_diario') {
    const faturamento = parseFaturamentoDiario(items)
    if (faturamento.length === 0) {
      throw new Error('Nenhum dado de faturamento encontrado no PDF.')
    }
    const totalGeral = faturamento.reduce((s, f) => s + f.total, 0)
    return {
      tipo,
      periodoInicio: period.inicio,
      periodoFim: period.fim,
      totalGeral,
      faturamento,
    }
  } else {
    const produtos = parseProdutosVendidos(items)
    if (produtos.length === 0) {
      throw new Error('Nenhum produto encontrado no PDF.')
    }
    const totalGeral = produtos.reduce((s, p) => s + p.valorTotal, 0)
    return {
      tipo,
      periodoInicio: period.inicio,
      periodoFim: period.fim,
      totalGeral,
      produtos,
    }
  }
}
