// Parser do Espelho da Folha Mensal (PDF da contabilidade)
// Formato: SCI Ambiente Contabil - Campez e Silveira

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

// Dados parseados de cada funcionario
export interface FolhaFuncionario {
  nome: string
  cpf: string
  funcao: string
  dataAdmissao: string // YYYY-MM-DD
  salarioBase: number
  horasMensais: number
  totalProventos: number
  totalDescontos: number
  liquido: number
  baseINSS: number
  valorINSS: number
  valorFGTS: number
  baseIRRF: number
  // Detalhes dos proventos
  horasExtras60: number
  horasExtras100: number
  adicionalNoturno: number
  adicionalFuncao: number
  trienio: number
  dsrExtras: number
  quebraCaixa: number
  // Detalhes dos descontos
  contribuicaoNegocial: number
  faltasDias: number
  faltasHoras: number
  adiantamento: number
  inssFuncionario: number
  irrfFuncionario: number
  // Ferias (se houver no mes)
  temFerias: boolean
  feriasBruto: number
  feriasINSS: number
  feriasIRRF: number
}

export interface FolhaResumo {
  mes: number
  ano: number
  empresa: string
  cnpj: string
  funcionarios: FolhaFuncionario[]
  // Resumo geral
  totalColaboradores: number
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  // Impostos empresa
  gps: number // INSS patronal
  fgts: number
  irrf: number
  sindicato: number
  totalImpostos: number
}

function parseBRNumber(str: string): number {
  if (!str || str.trim() === '') return 0
  const clean = str.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

function parseBRDate(str: string): string {
  const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

const MESES_MAP: Record<string, number> = {
  'JANEIRO': 1, 'FEVEREIRO': 2, 'MARCO': 3, 'MARÇO': 3, 'ABRIL': 4,
  'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
  'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12,
}

export async function parseFolhaPDF(file: File): Promise<FolhaResumo> {
  const pdfjs = await getPdfjs()
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : '') || '')
      .join(' ')
    fullText += pageText + '\n'
  }

  // Extrair mes/ano
  const mesAnoMatch = fullText.match(/mês de\s+(\w+)\/(\d{4})/i)
  if (!mesAnoMatch) {
    throw new Error('Nao foi possivel identificar o mes/ano do espelho da folha.')
  }
  const mes = MESES_MAP[mesAnoMatch[1].toUpperCase()] || 1
  const ano = parseInt(mesAnoMatch[2])

  // Extrair empresa e CNPJ
  const empresaMatch = fullText.match(/Empresa:\s*\d+\s*-\s*(.+?)\s+\w+\/\w+\s*-\s*CNPJ:\s*([\d./-]+)/)
  const empresa = empresaMatch ? empresaMatch[1].trim() : ''
  const cnpj = empresaMatch ? empresaMatch[2].trim() : ''

  // Extrair blocos de funcionarios
  const funcionarios = parseFuncionarios(fullText)

  // Extrair resumo geral
  const resumo = parseResumoGeral(fullText)

  return {
    mes,
    ano,
    empresa,
    cnpj,
    funcionarios,
    totalColaboradores: resumo.totalColaboradores || funcionarios.length,
    totalProventos: resumo.totalProventos || funcionarios.reduce((s, f) => s + f.totalProventos, 0),
    totalDescontos: resumo.totalDescontos || funcionarios.reduce((s, f) => s + f.totalDescontos, 0),
    totalLiquido: resumo.totalLiquido || funcionarios.reduce((s, f) => s + f.liquido, 0),
    gps: resumo.gps,
    fgts: resumo.fgts,
    irrf: resumo.irrf,
    sindicato: resumo.sindicato,
    totalImpostos: resumo.totalImpostos,
  }
}

function parseFuncionarios(text: string): FolhaFuncionario[] {
  const funcionarios: FolhaFuncionario[] = []

  // Padroes para identificar cada funcionario
  // Formato: "NN NOME ... Admissão em DD/MM/YYYY Salário base N.NNN,NN Horas mensais: NNN,NN"
  // CPF: NNN.NNN.NNN-NN ... Função: NOME

  // Dividir por blocos de funcionario (cada um comeca com numero + nome + admissao)
  const blocks = text.split(/(?=\d{1,6}\s+[A-Z]{2,}[\w\s]+(?:Admissão|Admissao)\s+em\s+\d{2}\/\d{2}\/\d{4})/)

  for (const block of blocks) {
    if (block.trim().length < 50) continue
    if (!block.match(/CPF:/)) continue

    try {
      const func = parseFuncionarioBlock(block)
      if (func && func.cpf) {
        funcionarios.push(func)
      }
    } catch {
      // Skip blocks that fail to parse
    }
  }

  return funcionarios
}

function parseFuncionarioBlock(block: string): FolhaFuncionario | null {
  // Extrair nome - fica entre o numero inicial e "Admissão"
  const nomeMatch = block.match(/\d{1,6}\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇa-zàáâãéêíóôõúç\s]+?)\s+\d+\s+\d+\s+(?:Admissão|Admissao)/)
  if (!nomeMatch) {
    // Tentar formato alternativo (nome pode ter quebra de linha)
    const nomeAlt = block.match(/\d{1,6}\s+([\w\s]+?)(?:\d+\s+\d+\s+)?(?:Admissão|Admissao)/)
    if (!nomeAlt) return null
  }

  // CPF
  const cpfMatch = block.match(/CPF:\s*([\d.-]+)/)
  if (!cpfMatch) return null
  const cpf = cpfMatch[1]

  // Funcao
  const funcaoMatch = block.match(/Função:\s*([A-ZÀ-Ú\s]+?)(?:\n|$|Férias)/)
  const funcao = funcaoMatch ? funcaoMatch[1].trim() : ''

  // Admissao
  const admMatch = block.match(/(?:Admissão|Admissao)\s+em\s+(\d{2}\/\d{2}\/\d{4})/)
  const dataAdmissao = admMatch ? parseBRDate(admMatch[1]) : ''

  // Salario base
  const salBaseMatch = block.match(/Salário base\s+([\d.,]+)/)
  const salarioBase = salBaseMatch ? parseBRNumber(salBaseMatch[1]) : 0

  // Horas mensais
  const horasMatch = block.match(/Horas mensais:\s*([\d.,]+)/)
  const horasMensais = horasMatch ? parseBRNumber(horasMatch[1]) : 0

  // Nome - extrair melhor
  let nome = ''
  const nomeClean = block.match(/\d{1,6}\s+([\w\sÀ-ÿ]+?)(?:\s+\d+\s+\d+\s+(?:Admissão|Admissao))/)
  if (nomeClean) {
    nome = nomeClean[1].trim()
  }

  // Total proventos e descontos
  const proventosMatch = block.match(/Total de proventos\s*-?\s*>?\s*([\d.,]+)/)
  const totalProventos = proventosMatch ? parseBRNumber(proventosMatch[1]) : 0

  const descontosMatch = block.match(/Total de descontos\s*-?\s*>?\s*([\d.,]+)/)
  const totalDescontos = descontosMatch ? parseBRNumber(descontosMatch[1]) : 0

  const liquidoMatch = block.match(/Líquido\s*-?\s*>?\s*([\d.,]+)/)
  const liquido = liquidoMatch ? parseBRNumber(liquidoMatch[1]) : 0

  // INSS, FGTS, IRRF da linha "Folha" no rodape do bloco
  const baseINSSMatch = block.match(/Folha\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/)
  let baseINSS = 0, valorINSS = 0, valorFGTS = 0, baseIRRF = 0
  if (baseINSSMatch) {
    baseINSS = parseBRNumber(baseINSSMatch[1])
    valorINSS = parseBRNumber(baseINSSMatch[2])
    // FGTS valor pode estar na posicao 3 ou ser calculado
    valorFGTS = parseBRNumber(baseINSSMatch[3])
    baseIRRF = parseBRNumber(baseINSSMatch[4])
  }

  // Proventos detalhados
  const horasExtras60 = extractValor(block, /Horas extras 60%.*?([\d.,]+)\s*$/m)
  const horasExtras100 = extractValor(block, /Horas extras 100%.*?([\d.,]+)\s*$/m)
  const adicionalNoturno = extractValor(block, /Adicional noturno.*?([\d.,]+)\s*$/m)
  const adicionalFuncao = extractValor(block, /Adicional de Fun.*?([\d.,]+)\s/m)
  const trienio = extractValor(block, /Triênio.*?([\d.,]+)\s*$/m) || extractValor(block, /Tri.nio.*?([\d.,]+)\s*$/m)
  const dsrExtras = extractValor(block, /DSR horas extras.*?([\d.,]+)\s*$/m)
  const quebraCaixa = extractValor(block, /Quebra de caixa\s+([\d.,]+)/m)

  // Descontos detalhados
  const contribuicaoNegocial = extractValor(block, /Contribuição Negocial\s+([\d.,]+)/)
  const adiantamento = extractValor(block, /Adiantamento.*?([\d.,]+)/)
  const inssFuncionario = extractValor(block, /INSS\s+\d+[,.]00\s+([\d.,]+)/) || extractValor(block, /INSS pro-labore\s+\d+[,.]00\s+([\d.,]+)/)

  // Faltas
  const faltasDiasMatch = block.match(/Faltas não justificadas dias\s+([\d.,]+)\s+([\d.,]+)/)
  const faltasDias = faltasDiasMatch ? parseBRNumber(faltasDiasMatch[2]) : 0
  const faltasHorasMatch = block.match(/Faltas Atraso Horas\s+[\d:]+\s+([\d.,]+)/)
  const faltasHoras = faltasHorasMatch ? parseBRNumber(faltasHorasMatch[1]) : 0

  const irrfFuncionario = extractValor(block, /IR férias recolhido.*?([\d.,]+)/) // Simplified

  // Ferias
  const temFerias = block.includes('Demonstrativo de férias') || block.includes('Período de gozo')
  let feriasBruto = 0, feriasINSS = 0, feriasIRRF = 0
  if (temFerias) {
    feriasBruto = extractValor(block, /Demonstrativo de férias.*?([\d.,]+)\s/m)
      + extractValor(block, /Demonstrativo férias triênio.*?([\d.,]+)\s/m)
      + extractValor(block, /Demonstrativo 1\/3 férias.*?([\d.,]+)\s/m)
    feriasINSS = extractValor(block, /INSS demonstrativo férias.*?([\d.,]+)\s/m)
    feriasIRRF = extractValor(block, /IR férias recolhido.*?([\d.,]+)\s/m)
  }

  return {
    nome: formatNome(nome),
    cpf,
    funcao,
    dataAdmissao,
    salarioBase,
    horasMensais,
    totalProventos,
    totalDescontos,
    liquido,
    baseINSS,
    valorINSS,
    valorFGTS,
    baseIRRF,
    horasExtras60,
    horasExtras100,
    adicionalNoturno,
    adicionalFuncao,
    trienio,
    dsrExtras,
    quebraCaixa,
    contribuicaoNegocial,
    faltasDias,
    faltasHoras,
    adiantamento,
    inssFuncionario,
    irrfFuncionario,
    temFerias,
    feriasBruto,
    feriasINSS,
    feriasIRRF,
  }
}

function extractValor(text: string, pattern: RegExp): number {
  const match = text.match(pattern)
  return match ? parseBRNumber(match[1]) : 0
}

function formatNome(nome: string): string {
  return nome
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s(De|Da|Do|Dos|Das|E)\s/g, (_, p) => ` ${p.toLowerCase()} `)
    .trim()
}

function parseResumoGeral(text: string): {
  totalColaboradores: number
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  gps: number
  fgts: number
  irrf: number
  sindicato: number
  totalImpostos: number
} {
  // Quantidade de colaboradores
  const qtdMatch = text.match(/Quantidade\s+(\d+)/)
  const totalColaboradores = qtdMatch ? parseInt(qtdMatch[1]) : 0

  // Proventos total
  const provMatch = text.match(/Proventos\s+([\d.,]+)\s/)
  const totalProventos = provMatch ? parseBRNumber(provMatch[1]) : 0

  // Descontos total
  const descMatch = text.match(/Descontos\s+([\d.,]+)\s/)
  const totalDescontos = descMatch ? parseBRNumber(descMatch[1]) : 0

  // Liquido
  const liqMatch = text.match(/Líquido\s+([\d.,]+)\s/)
  const totalLiquido = liqMatch ? parseBRNumber(liqMatch[1]) : 0

  // GPS (INSS empresa)
  const gpsMatch = text.match(/GPS\s*-?\s*>?\s*([\d.,]+)\s*\(Bruto\)/)
  const gps = gpsMatch ? parseBRNumber(gpsMatch[1]) : 0

  // FGTS
  const fgtsMatch = text.match(/GFD\s+([\d.,]+)/)
  const fgts = fgtsMatch ? parseBRNumber(fgtsMatch[1]) : 0

  // IRRF
  const irrfMatch = text.match(/Total R\$\s+([\d.,]+)\s*\n?\s*Mês/)
  const irrf = irrfMatch ? parseBRNumber(irrfMatch[1]) : 0

  // Sindicato
  const sindMatch = text.match(/GRCS[\s\S]*?Total R\$\s+([\d.,]+)/)
  const sindicato = sindMatch ? parseBRNumber(sindMatch[1]) : 0

  // Total impostos
  const totImpMatch = text.match(/Total de impostos R\$\s+([\d.,]+)/)
  const totalImpostos = totImpMatch ? parseBRNumber(totImpMatch[1]) : 0

  return { totalColaboradores, totalProventos, totalDescontos, totalLiquido, gps, fgts, irrf, sindicato, totalImpostos }
}
