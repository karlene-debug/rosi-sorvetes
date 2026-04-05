import * as pdfjsLib from 'pdfjs-dist'
import type { FaturamentoDiario, VendaProduto } from './database_v2'

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

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
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

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

  for (const pageItems of allPageItems) {
    const rows = groupIntoRows(pageItems)

    for (const row of rows) {
      // Skip header rows and TOTAL GERAL row
      const rowText = row.map(i => i.str).join(' ')
      if (rowText.includes('TOTAL GERAL') || rowText.includes('DATA') || rowText.includes('VALE')) continue

      // Find rows that start with a date
      if (row.length > 0 && dateRegex.test(row[0].str)) {
        const dateStr = parseBRDate(row[0].str)
        if (!dateStr) continue

        // Extract numbers from remaining cells
        const numbers = row.slice(1).map(item => parseBRNumber(item.str))

        // Pad to ensure we have all 8 columns (some might be empty/missing)
        while (numbers.length < 8) numbers.push(0)

        // The last number is always TOTAL
        // Work backwards: total is last, then multibeneficios, cartao_credito, etc.
        // But some rows have fewer numbers when certain payment methods have no value
        // The PDF structure: ValeRef, ValeAlim, PagInst, Dinheiro, CartDeb, CartCred, Multi, Total
        const total = numbers[numbers.length - 1]

        // Assign based on position count
        let valeRefeicao = 0, valeAlimentacao = 0, pagInstantaneo = 0
        let dinheiro = 0, cartaoDebito = 0, cartaoCredito = 0, multibeneficios = 0

        if (numbers.length >= 8) {
          valeRefeicao = numbers[0]
          valeAlimentacao = numbers[1]
          pagInstantaneo = numbers[2]
          dinheiro = numbers[3]
          cartaoDebito = numbers[4]
          cartaoCredito = numbers[5]
          multibeneficios = numbers[6]
        } else {
          // Fewer columns - total is last, rest are payment methods in order
          // We use heuristic: sum of parts should equal total
          const vals = numbers.slice(0, -1)
          // Try to match by checking if sum matches total
          const sum = vals.reduce((s, v) => s + v, 0)
          if (Math.abs(sum - total) < 1) {
            // Assign in order, padding missing ones
            const padded = [...vals]
            while (padded.length < 7) padded.splice(padded.length - 1, 0, 0)
            valeRefeicao = padded[0]
            valeAlimentacao = padded[1]
            pagInstantaneo = padded[2]
            dinheiro = padded[3]
            cartaoDebito = padded[4]
            cartaoCredito = padded[5]
            multibeneficios = padded[6]
          } else {
            // Fallback: assign what we have
            if (vals.length >= 1) pagInstantaneo = vals[0]
            if (vals.length >= 2) dinheiro = vals[1]
            if (vals.length >= 3) cartaoDebito = vals[2]
            if (vals.length >= 4) cartaoCredito = vals[3]
            if (vals.length >= 5) valeRefeicao = vals[4]
            if (vals.length >= 6) valeAlimentacao = vals[5]
          }
        }

        results.push({
          data: dateStr,
          valeRefeicao,
          valeAlimentacao,
          pagInstantaneo,
          dinheiro,
          cartaoDebito,
          cartaoCredito,
          multibeneficios,
          total,
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
