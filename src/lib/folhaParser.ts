// Parser do Espelho da Folha Mensal (PDF da contabilidade)
// Formato: SCI Ambiente Contabil - Campez e Silveira
// Parser genérico por código de evento

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

// === Tipos ===

export interface EventoFolha {
  codigo: string
  descricao: string
  tipo: 'provento' | 'desconto'
  referencia: string
  valor: number
}

// Mapa de códigos de evento conhecidos do SCI (espelhos reais)
export const EVENTO_MAP: Record<string, { descricaoPadrao: string; tipo: 'provento' | 'desconto'; ferias: boolean }> = {
  // Proventos
  '5':     { descricaoPadrao: 'Salário mensalista',                      tipo: 'provento', ferias: false },
  '22':    { descricaoPadrao: 'Adicional de Função',                     tipo: 'provento', ferias: false },
  '153':   { descricaoPadrao: 'Adicional noturno rendimentos variáveis', tipo: 'provento', ferias: false },
  '263':   { descricaoPadrao: 'Triênio',                                 tipo: 'provento', ferias: false },
  '310':   { descricaoPadrao: 'Quebra de caixa',                         tipo: 'provento', ferias: false },
  '521':   { descricaoPadrao: 'DSR rendimentos variáveis',               tipo: 'provento', ferias: false },
  '541':   { descricaoPadrao: 'DSR horas extras',                        tipo: 'provento', ferias: false },
  '605':   { descricaoPadrao: 'Horas extras 60%',                        tipo: 'provento', ferias: false },
  // Proventos férias
  '10005': { descricaoPadrao: 'Demonstrativo de férias',                 tipo: 'provento', ferias: true },
  '10602': { descricaoPadrao: 'Demonstrativo férias média HE',           tipo: 'provento', ferias: true },
  '10651': { descricaoPadrao: 'Demonstrativo férias média DSR HE',       tipo: 'provento', ferias: true },
  '10993': { descricaoPadrao: 'Demonstrativo 1/3 férias',                tipo: 'provento', ferias: true },
  // Descontos
  '406':   { descricaoPadrao: 'Contribuição Negocial',                   tipo: 'desconto', ferias: false },
  '703':   { descricaoPadrao: 'Faltas não justificadas dias',            tipo: 'desconto', ferias: false },
  '704':   { descricaoPadrao: 'Faltas Atraso Horas',                     tipo: 'desconto', ferias: false },
  '782':   { descricaoPadrao: 'DSR faltas dia',                          tipo: 'desconto', ferias: false },
  '953':   { descricaoPadrao: 'Adiantamento com ded. IR',                tipo: 'desconto', ferias: false },
  '91005': { descricaoPadrao: 'INSS',                                    tipo: 'desconto', ferias: false },
  // Descontos férias
  '14503': { descricaoPadrao: 'Desconto de férias',                      tipo: 'desconto', ferias: true },
  '91025': { descricaoPadrao: 'INSS demonstrativo férias',               tipo: 'desconto', ferias: true },
}

export interface FolhaFuncionario {
  codigoFunc: string
  eventos: EventoFolha[]
  nome: string
  cpf: string
  funcao: string
  dataAdmissao: string
  salarioBase: number
  horasMensais: number
  totalProventos: number
  totalDescontos: number
  liquido: number
  baseINSS: number
  valorINSS: number
  valorFGTS: number
  baseIRRF: number
  horasExtras60: number
  horasExtras100: number
  adicionalNoturno: number
  adicionalFuncao: number
  trienio: number
  dsrExtras: number
  quebraCaixa: number
  contribuicaoNegocial: number
  faltasDias: number
  faltasHoras: number
  adiantamento: number
  inssFuncionario: number
  irrfFuncionario: number
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
  totalColaboradores: number
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  gps: number
  fgts: number
  irrf: number
  sindicato: number
  totalImpostos: number
}

// === Utilitários ===

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

function formatNome(nome: string): string {
  if (!nome || nome.trim().length === 0) return ''
  const semCodigo = nome.replace(/^\d+\s+/, '')
  return semCodigo
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s(De|Da|Do|Dos|Das|E)\s/g, (_, p) => ` ${p.toLowerCase()} `)
    .trim()
}

// === Parser principal ===

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

  const mesAnoMatch = fullText.match(/m[eê]s de\s+([\wÀ-ÿ]+)\/(\d{4})/i)
  if (!mesAnoMatch) {
    throw new Error('Não foi possível identificar o mês/ano do espelho da folha.')
  }
  const mes = MESES_MAP[mesAnoMatch[1].toUpperCase()] || 1
  const ano = parseInt(mesAnoMatch[2])

  const empresaMatch = fullText.match(/Empresa:\s*\d+\s*-\s*(.+?)\s+\w+\/\w+\s*-\s*CNPJ:\s*([\d./-]+)/)
  const empresa = empresaMatch ? empresaMatch[1].trim() : ''
  const cnpj = empresaMatch ? empresaMatch[2].trim() : ''

  const funcionarios = parseFuncionariosByCPF(fullText)
  const resumo = parseResumoGeral(fullText)

  return {
    mes, ano, empresa, cnpj, funcionarios,
    totalColaboradores: resumo.totalColaboradores || funcionarios.length,
    totalProventos: resumo.totalProventos || funcionarios.reduce((s, f) => s + f.totalProventos, 0),
    totalDescontos: resumo.totalDescontos || funcionarios.reduce((s, f) => s + f.totalDescontos, 0),
    totalLiquido: resumo.totalLiquido || funcionarios.reduce((s, f) => s + f.liquido, 0),
    gps: resumo.gps, fgts: resumo.fgts, irrf: resumo.irrf,
    sindicato: resumo.sindicato, totalImpostos: resumo.totalImpostos,
  }
}

// === Extração de blocos por CPF ===

function parseFuncionariosByCPF(text: string): FolhaFuncionario[] {
  const funcionarios: FolhaFuncionario[] = []
  const cpfPattern = /CPF:\s*(\d{3}\.\d{3}\.\d{3}-\d{2})/g
  const cpfMatches: { cpf: string; index: number }[] = []
  let match: RegExpExecArray | null
  while ((match = cpfPattern.exec(text)) !== null) {
    cpfMatches.push({ cpf: match[1], index: match.index })
  }

  for (let i = 0; i < cpfMatches.length; i++) {
    const cpfInfo = cpfMatches[i]
    const textBefore = text.substring(Math.max(0, cpfInfo.index - 500), cpfInfo.index)
    const textAfter = text.substring(cpfInfo.index, i < cpfMatches.length - 1 ? cpfMatches[i + 1].index : cpfInfo.index + 2000)
    const block = textBefore + textAfter

    if (block.includes('RESUMO GERAL') || block.includes('Analítico GPS')) continue

    try {
      const func = parseSingleFuncionario(block, cpfInfo.cpf)
      if (func) funcionarios.push(func)
    } catch {
      // Skip funcionário com erro de parse
    }
  }

  return funcionarios
}

// === Parser de um único funcionário ===

function parseSingleFuncionario(block: string, cpf: string): FolhaFuncionario | null {
  let codigoFunc = ''
  let nome = ''

  // Capturar código do funcionário + nome: "42 DEYSE BARBOSA DE JESUS 5 5"
  const admMatch = block.match(/(?:Admiss[ãa]o)\s+em\s+(\d{2}\/\d{2}\/\d{4})/)
  if (admMatch) {
    const beforeAdm = block.substring(0, block.indexOf(admMatch[0]))
    const nomeMatch = beforeAdm.match(/(\d{1,6})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇa-zàáâãéêíóôõúç\s.]+?)(?:\s+\d+\s+\d+\s*$)/)
    if (nomeMatch) {
      codigoFunc = nomeMatch[1]
      nome = nomeMatch[2].trim()
    } else {
      const nomeFb = beforeAdm.match(/(\d{1,6})\s+([\w\sÀ-ÿ.]+?)(?:\s+\d+\s+\d+\s*$|\s*$)/)
      if (nomeFb) {
        codigoFunc = nomeFb[1]
        nome = nomeFb[2].trim()
      }
    }
  }

  // Fallback nome
  if (!nome) {
    const funcaoLine = block.match(/Fun[çc][ãa]o:\s*([A-ZÀ-Ú\s]+)/)
    const cpfIdx = block.indexOf('CPF:')
    if (cpfIdx > 0) {
      const before = block.substring(Math.max(0, cpfIdx - 300), cpfIdx)
      const lines = before.split(/\s{3,}|\n/).filter(l => l.trim().length > 3)
      for (let j = lines.length - 1; j >= 0; j--) {
        const line = lines[j].trim()
        if (/^[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇa-zàáâãéêíóôõúç\s.]+$/.test(line) && line.length > 5) {
          nome = line
          break
        }
      }
    }
    if (!nome && funcaoLine) nome = `Func. ${funcaoLine[1].trim()}`
  }

  const funcaoMatch = block.match(/Fun[çc][ãa]o:\s*([A-ZÀ-Ú\s]+?)(?:\s{2}|\n|$|F[ée]rias)/)
  const funcao = funcaoMatch ? funcaoMatch[1].trim() : ''
  const dataAdmissao = admMatch ? parseBRDate(admMatch[1]) : ''

  const salBaseMatch = block.match(/Sal[áa]rio base\s+([\d.,]+)/)
  const salarioBase = salBaseMatch ? parseBRNumber(salBaseMatch[1]) : 0

  const horasMatch = block.match(/Horas mensais:\s*([\d.,]+)/)
  const horasMensais = horasMatch ? parseBRNumber(horasMatch[1]) : 0

  // Totais do espelho
  const proventosMatch = block.match(/Total de proventos\s*-?\s*>?\s*([\d.,]+)/)
  const totalProventos = proventosMatch ? parseBRNumber(proventosMatch[1]) : 0

  const descontosMatch = block.match(/Total de descontos\s*-?\s*>?\s*([\d.,]+)/)
  const totalDescontos = descontosMatch ? parseBRNumber(descontosMatch[1]) : 0

  const liquidoMatch = block.match(/L[íi]quido\s*-?\s*>?\s*([\d.,]+)/)
  const liquido = liquidoMatch ? parseBRNumber(liquidoMatch[1]) : 0

  if (totalProventos === 0 && salarioBase === 0) return null

  // Bases (INSS, FGTS, IRRF)
  // Colunas: Base INSS [1] | Valor INSS [2] | Base FGTS [3] | Valor FGTS [4] | Base IRRF [5]
  // Preferir linha "Total" (quando tem férias) sobre "Folha"
  const basesMatch =
    block.match(/(?:^|\s)Total\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/)
    || block.match(/(?:^|\s)Folha\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/)
  let baseINSS = 0, valorINSS = 0, valorFGTS = 0, baseIRRF = 0
  if (basesMatch) {
    baseINSS  = parseBRNumber(basesMatch[1])
    valorINSS = parseBRNumber(basesMatch[2])
    // [3] = Base FGTS (não armazenado separadamente)
    valorFGTS = parseBRNumber(basesMatch[4])
    baseIRRF  = parseBRNumber(basesMatch[5])
  }

  // === PARSER DE EVENTOS ===
  const eventos = parseEventos(block)

  // Derivar campos legados dos eventos
  const getEvt = (codigo: string) => eventos.find(e => e.codigo === codigo)?.valor || 0
  const temFerias = eventos.some(e => EVENTO_MAP[e.codigo]?.ferias)
  const feriasBruto = eventos
    .filter(e => EVENTO_MAP[e.codigo]?.ferias && e.tipo === 'provento')
    .reduce((s, e) => s + e.valor, 0)

  return {
    codigoFunc,
    eventos,
    nome: formatNome(nome),
    cpf, funcao, dataAdmissao, salarioBase, horasMensais,
    totalProventos, totalDescontos, liquido,
    baseINSS, valorINSS, valorFGTS, baseIRRF,
    horasExtras60: getEvt('605'),
    horasExtras100: 0,
    adicionalNoturno: getEvt('153'),
    adicionalFuncao: getEvt('22'),
    trienio: getEvt('263'),
    dsrExtras: getEvt('541') + getEvt('521'),
    quebraCaixa: getEvt('310'),
    contribuicaoNegocial: getEvt('406'),
    faltasDias: getEvt('703'),
    faltasHoras: getEvt('704'),
    adiantamento: getEvt('953'),
    inssFuncionario: getEvt('91005') + getEvt('91025'),
    irrfFuncionario: 0,
    temFerias,
    feriasBruto,
    feriasINSS: getEvt('91025'),
    feriasIRRF: 0,
  }
}

// === Parser genérico de eventos por código ===

function parseEventos(block: string): EventoFolha[] {
  const eventos: EventoFolha[] = []

  // Delimitar zona de eventos: após "Função:" até "Total de proventos"
  const funcaoIdx = block.search(/Fun[çc][ãa]o:/)
  const totalProvIdx = block.indexOf('Total de proventos')
  if (funcaoIdx < 0 || totalProvIdx < 0 || totalProvIdx <= funcaoIdx) return eventos

  // Avançar para depois do texto da Função (ex: "Função: CONFEITEIRA")
  const afterFuncao = block.substring(funcaoIdx)
  const funcaoEnd = afterFuncao.match(/Fun[çc][ãa]o:\s*[A-ZÀ-Ú\s]+/)
  const zoneStart = funcaoIdx + (funcaoEnd ? funcaoEnd[0].length : 10)
  const eventsZone = block.substring(zoneStart, totalProvIdx)

  // Códigos ordenados por tamanho decrescente (91025 antes de 5, etc.)
  const sortedCodes = Object.keys(EVENTO_MAP).sort((a, b) => b.length - a.length)

  // Encontrar posições de cada código na zona de eventos
  interface CodePos { codigo: string; index: number }
  const positions: CodePos[] = []

  for (const code of sortedCodes) {
    // Código precedido por whitespace ou início, seguido de espaço + letra
    const pattern = new RegExp(`(?:^|\\s)${code}\\s+(?=[A-Za-zÀ-ÿ])`, 'g')
    let m: RegExpExecArray | null
    while ((m = pattern.exec(eventsZone)) !== null) {
      const codeStart = m.index + m[0].indexOf(code)
      // Verificar que não está dentro de um código mais longo já encontrado
      const overlaps = positions.some(p =>
        codeStart >= p.index && codeStart < p.index + p.codigo.length
      )
      if (!overlaps) {
        positions.push({ codigo: code, index: codeStart })
      }
    }
  }

  positions.sort((a, b) => a.index - b.index)

  // Extrair cada evento: segmento entre este código e o próximo
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]
    const segStart = pos.index + pos.codigo.length
    const segEnd = i < positions.length - 1 ? positions[i + 1].index : eventsZone.length
    const segment = eventsZone.substring(segStart, segEnd).trim()

    const info = EVENTO_MAP[pos.codigo]
    if (!info) continue

    // Extrair tokens numéricos (ignorar números que fazem parte de "60%" ou "1/3")
    const numTokens: { str: string; index: number }[] = []
    const numPattern = /(\d{1,2}:\d{2}|\d[\d.,]*)/g
    let nm: RegExpExecArray | null
    while ((nm = numPattern.exec(segment)) !== null) {
      const afterPos = nm.index + nm[0].length
      if (afterPos < segment.length && segment[afterPos] === '%') continue
      if (nm.index > 0 && segment[nm.index - 1] === '/') continue
      if (afterPos < segment.length && segment[afterPos] === '/') continue
      numTokens.push({ str: nm[1], index: nm.index })
    }

    if (numTokens.length === 0) continue

    // Último número = valor monetário, penúltimo = referência (se existir)
    const valor = parseBRNumber(numTokens[numTokens.length - 1].str)
    let referencia = ''
    let descEnd: number

    if (numTokens.length >= 2) {
      referencia = numTokens[numTokens.length - 2].str
      descEnd = numTokens[numTokens.length - 2].index
    } else {
      descEnd = numTokens[numTokens.length - 1].index
    }

    const descricao = segment.substring(0, descEnd).trim() || info.descricaoPadrao

    if (valor > 0) {
      eventos.push({
        codigo: pos.codigo,
        descricao,
        tipo: info.tipo,
        referencia,
        valor,
      })
    }
  }

  return eventos
}

// === Resumo geral ===

function parseResumoGeral(text: string): {
  totalColaboradores: number
  totalProventos: number
  totalDescontos: number
  totalLiquido: number
  gps: number; fgts: number; irrf: number; sindicato: number; totalImpostos: number
} {
  const qtdMatch = text.match(/Quantidade\s+(\d+)/)
  const totalColaboradores = qtdMatch ? parseInt(qtdMatch[1]) : 0

  const provMatch = text.match(/Proventos\s+([\d.,]+)\s/)
  const totalProventos = provMatch ? parseBRNumber(provMatch[1]) : 0

  const descMatch = text.match(/Descontos\s+([\d.,]+)\s/)
  const totalDescontos = descMatch ? parseBRNumber(descMatch[1]) : 0

  const liqMatch = text.match(/L[íi]quido\s+([\d.,]+)\s/)
  const totalLiquido = liqMatch ? parseBRNumber(liqMatch[1]) : 0

  const gpsMatch = text.match(/GPS\s*-?\s*>?\s*([\d.,]+)\s*\(Bruto\)/)
  const gps = gpsMatch ? parseBRNumber(gpsMatch[1]) : 0

  const fgtsMatch = text.match(/GFD\s+([\d.,]+)/)
  const fgts = fgtsMatch ? parseBRNumber(fgtsMatch[1]) : 0

  const irrfMatch = text.match(/Total R\$\s+([\d.,]+)\s*\n?\s*M[eê]s/)
  const irrf = irrfMatch ? parseBRNumber(irrfMatch[1]) : 0

  const sindMatch = text.match(/GRCS[\s\S]*?Total R\$\s+([\d.,]+)/)
  const sindicato = sindMatch ? parseBRNumber(sindMatch[1]) : 0

  const totImpMatch = text.match(/Total de impostos R\$\s+([\d.,]+)/)
  const totalImpostos = totImpMatch ? parseBRNumber(totImpMatch[1]) : 0

  return { totalColaboradores, totalProventos, totalDescontos, totalLiquido, gps, fgts, irrf, sindicato, totalImpostos }
}
