// Parser do TRCT - Termo de Rescisão do Contrato de Trabalho
// Formato padrão MTE, gerado por qualquer sistema contábil

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

export interface TRCTData {
  // Empregador
  cnpjEmpregador: string
  razaoSocial: string
  // Trabalhador
  nomeTrabalhador: string
  cpfTrabalhador: string
  pisPasep: string
  // Contrato
  tipoContrato: string
  causaAfastamento: string
  codAfastamento: string
  dataAdmissao: string
  dataAvisoPrevio: string
  dataAfastamento: string
  remuneracaoMesAnterior: number
  // Verbas rescisorias
  saldoSalario: number
  comissoes: number
  gratificacao: number
  adicInsalubridade: number
  adicPericulosidade: number
  adicNoturno: number
  horasExtras: number
  gorjetas: number
  dsr: number
  reflexoDSR: number
  multa477: number
  multa479: number
  salarioFamilia: number
  decimoTerceiroProporcional: number
  decimoTerceiroExercicio: number
  feriasProporcionais: number
  feriasVencidas: number
  tercoFerias: number
  avisoIndenizado: number
  decimoTerceiroAviso: number
  feriasAviso: number
  totalBruto: number
  // Deducoes
  pensaoAlimenticia: number
  adiantamentoSalarial: number
  adiantamento13: number
  avisoPrevioDesconto: number
  inss: number
  inss13: number
  irrf: number
  irrf13: number
  totalDeducoes: number
  // Liquido
  valorLiquido: number
}

function parseBRNumber(str: string): number {
  if (!str || str.trim() === '' || str.trim() === '-') return 0
  const clean = str.trim()
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

function parseBRDate(str: string): string {
  const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

export async function parseTRCTPDF(file: File): Promise<TRCTData> {
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

  // Verificar se eh um TRCT
  if (!fullText.includes('TERMO DE RESCIS') && !fullText.includes('RESCISÃO DO CONTRATO')) {
    throw new Error('Este PDF não parece ser um TRCT (Termo de Rescisão do Contrato de Trabalho).')
  }

  return parseTRCTText(fullText)
}

function parseTRCTText(text: string): TRCTData {
  // Empregador
  const cnpjMatch = text.match(/CNPJ.*?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/)
  const razaoMatch = text.match(/Raz[ãa]o Social.*?(?:Nome)?\s*\n?\s*([A-ZÀ-Ú][\w\sÀ-ÿ.,&/-]+?)(?:\s{2,}|\d{2}\.)/)

  // Trabalhador
  const nomeMatch = text.match(/(?:11\s*Nome|IDENTIFICAÇÃO DO TRABALHADOR.*?Nome)\s*\n?\s*([A-ZÀ-Ú][\w\sÀ-ÿ]+?)(?:\s{2,}|\d{2,3}\.|\n)/)
  const cpfMatch = text.match(/CPF\s*\n?\s*(\d{3}\.\d{3}\.\d{3}-\d{2})/)
  const pisMatch = text.match(/PIS.*?(\d{3}\.\d{5}\.\d{2}-\d)/)

  // Contrato
  const tipoContratoMatch = text.match(/Tipo de Contrato\s*\n?\s*(.+?)(?:\n|Causa|Despedida)/)
  const causaMatch = text.match(/Causa.*?Afastamento\s*\n?\s*(.+?)(?:\n|\d{2}\s)/)
  if (!causaMatch) {
    // Tentar formato alternativo: causa vem logo apos tipo de contrato
    const causaAlt = text.match(/(?:Despedida|Pedido de demiss|Rescis[ãa]o)[^.]*/)
    if (causaAlt) {
      // use this
    }
  }
  const codAfastMatch = text.match(/(?:27\s*)?Cod\.?\s*Afastamento\s*\n?\s*([A-Z0-9]{2,5})/)

  // Datas
  const admMatch = text.match(/(?:24\s*)?Data de Admiss[ãa]o\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/)
  const avisoMatch = text.match(/(?:25\s*)?Data d[oe] Aviso\s*Pr[ée]vio\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/)
  const afastMatch = text.match(/(?:26\s*)?Data de Afastamento\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/)
  const remMatch = text.match(/(?:23\s*)?Remunera[çc][ãa]o\s*(?:M[eê]s\s*Ant\.?)?\s*\n?\s*([\d.,]+)/)

  // Verbas rescisorias - buscar por numero da rubrica
  const getVerba = (num: number | string): number => {
    const patterns = [
      new RegExp(`${num}[^\\d]*?R\\$\\s*([\\d.,]+)`),
      new RegExp(`${num}[^\\d]*?([\\d]+[.,]\\d{2})\\s`),
    ]
    for (const p of patterns) {
      const m = text.match(p)
      if (m) return parseBRNumber(m[1])
    }
    return 0
  }

  // Buscar totais por label
  const getTotalByLabel = (label: string): number => {
    const pattern = new RegExp(label + '\\s*R?\\$?\\s*([\\d.,]+)', 'i')
    const m = text.match(pattern)
    return m ? parseBRNumber(m[1]) : 0
  }

  // Extrair causa do afastamento
  let causaAfastamento = ''
  const causaPatterns = [
    /Despedida\s+(.+?)(?:\n|\d{2}\s)/,
    /Causa.*?Afastamento\s*\n?\s*(.+?)(?:\n|\d{2}\s)/i,
    /Pedido de demiss[ãa]o/i,
    /Rescis[ãa]o antecipada/i,
    /sem justa causa/i,
    /por justa causa/i,
  ]
  for (const p of causaPatterns) {
    const m = text.match(p)
    if (m) {
      causaAfastamento = m[1] || m[0]
      break
    }
  }

  return {
    cnpjEmpregador: cnpjMatch?.[1] || '',
    razaoSocial: razaoMatch?.[1]?.trim() || '',
    nomeTrabalhador: nomeMatch?.[1]?.trim() || '',
    cpfTrabalhador: cpfMatch?.[1] || '',
    pisPasep: pisMatch?.[1] || '',
    tipoContrato: tipoContratoMatch?.[1]?.trim() || '',
    causaAfastamento: causaAfastamento.trim(),
    codAfastamento: codAfastMatch?.[1] || '',
    dataAdmissao: admMatch ? parseBRDate(admMatch[1]) : '',
    dataAvisoPrevio: avisoMatch ? parseBRDate(avisoMatch[1]) : '',
    dataAfastamento: afastMatch ? parseBRDate(afastMatch[1]) : '',
    remuneracaoMesAnterior: remMatch ? parseBRNumber(remMatch[1]) : 0,
    // Verbas
    saldoSalario: getVerba(50),
    comissoes: getVerba(51),
    gratificacao: getVerba(52),
    adicInsalubridade: getVerba(53),
    adicPericulosidade: getVerba(54),
    adicNoturno: getVerba(55),
    horasExtras: getVerba('56\\.1'),
    gorjetas: getVerba(57),
    dsr: getVerba(58),
    reflexoDSR: getVerba(59),
    multa477: getVerba(60),
    multa479: getVerba(61),
    salarioFamilia: getVerba(62),
    decimoTerceiroProporcional: getVerba(63),
    decimoTerceiroExercicio: getVerba('64\\.1'),
    feriasProporcionais: getVerba(65),
    feriasVencidas: getVerba('66\\.1'),
    tercoFerias: getVerba(68),
    avisoIndenizado: getVerba(69),
    decimoTerceiroAviso: getVerba(70),
    feriasAviso: getVerba(71),
    totalBruto: getTotalByLabel('TOTAL BRUTO'),
    // Deducoes
    pensaoAlimenticia: getVerba(100),
    adiantamentoSalarial: getVerba(101),
    adiantamento13: getVerba(102),
    avisoPrevioDesconto: getVerba(103),
    inss: getVerba('112\\.1'),
    inss13: getVerba('112\\.2'),
    irrf: getVerba('114\\.1'),
    irrf13: getVerba('114\\.2'),
    totalDeducoes: getTotalByLabel('TOTAL DEDU'),
    valorLiquido: getTotalByLabel('VALOR L[IÍ]QUIDO'),
  }
}
