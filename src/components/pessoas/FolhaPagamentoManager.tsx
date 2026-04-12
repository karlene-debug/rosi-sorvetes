import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Upload, CheckCircle2, AlertCircle, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Funcionario } from './PessoasSection'
import { parseFolhaPDF, type FolhaResumo } from '@/lib/folhaParser'

interface FolhaPagamentoManagerProps {
  funcionarios: Funcionario[]
  unidadeSelecionada?: string
  onReloadFuncionarios?: () => void
}

interface FolhaImportada {
  funcionarioId: string
  nome: string
  cargoNome?: string
  salarioBruto: number
  descontos: number
  liquido: number
  encargosEmpresa: number
  horasExtras: number
  custoTotal: number
  descontoINSS: number
  descontoIRRF: number
  descontoAdiantamento: number
  descontoFaltas: number
  descontoSindicato: number
  descontoOutros: number
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function normalizeCPF(cpf: string): string {
  return (cpf || '').replace(/[.\-/\s]/g, '')
}

export function FolhaPagamentoManager({ funcionarios, unidadeSelecionada, onReloadFuncionarios }: FolhaPagamentoManagerProps) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [folhaItems, setFolhaItems] = useState<FolhaImportada[]>([])
  const [temDados, setTemDados] = useState(false)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    matched: number
    unmatched: { nome: string; cpf: string; funcao: string; salario: number }[]
    ausentes: { nome: string; id: string }[]
    dadosDivergentes: { funcionarioId: string; nome: string; campo: string; valorSistema: string; valorContabilidade: string }[]
    divergencias: { funcionarioId: string; nomeSistema: string; nomeContabilidade: string; cpf: string }[]
    resumo: FolhaResumo
  } | null>(null)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const funcsAtivos = useMemo(() => {
    let f = funcionarios.filter(f => f.status === 'ativo')
    if (unidadeSelecionada && unidadeSelecionada !== 'todas') {
      f = f.filter(func => func.unidadeId === unidadeSelecionada)
    }
    return f.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [funcionarios, unidadeSelecionada])

  // Carregar dados ja importados do mes
  const loadFolha = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('folha_pagamento')
        .select('*, funcionarios(nome, cargos(nome))')
        .eq('mes', mes)
        .eq('ano', ano)

      if (data && data.length > 0) {
        setFolhaItems(data.map((r: Record<string, unknown>) => {
          const func = r.funcionarios as Record<string, unknown> | null
          const cargo = func?.cargos as Record<string, string> | null
          return {
            funcionarioId: r.funcionario_id as string,
            nome: (func?.nome as string) || '-',
            cargoNome: cargo?.nome || undefined,
            salarioBruto: Number(r.salario_bruto),
            descontos: Number(r.descontos),
            liquido: Number(r.salario_bruto) - Number(r.descontos),
            encargosEmpresa: Number(r.encargos_empresa),
            horasExtras: Number(r.horas_extras),
            custoTotal: Number(r.custo_total),
            descontoINSS: Number(r.desconto_inss || 0),
            descontoIRRF: Number(r.desconto_irrf || 0),
            descontoAdiantamento: Number(r.desconto_adiantamento || 0),
            descontoFaltas: Number(r.desconto_faltas || 0),
            descontoSindicato: Number(r.desconto_sindicato || 0),
            descontoOutros: Number(r.desconto_outros || 0),
          }
        }))
        setTemDados(true)
      } else {
        setFolhaItems([])
        setTemDados(false)
      }
    } catch {
      setFolhaItems([])
      setTemDados(false)
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => { loadFolha() }, [loadFolha])

  const navegarMes = (dir: -1 | 1) => {
    setMes(prev => {
      let m = prev + dir
      if (m < 1) { m = 12; setAno(a => a - 1) }
      else if (m > 12) { m = 1; setAno(a => a + 1) }
      return m
    })
    setImportResult(null)
  }

  // === IMPORTACAO DO ESPELHO DA FOLHA ===
  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setMsg('Selecione um arquivo PDF do espelho da folha.')
      return
    }

    setImporting(true)
    setMsg('')
    setImportResult(null)

    try {
      const resumo = await parseFolhaPDF(file)

      // Cruzar funcionarios do PDF com os do sistema por CPF
      let matched = 0
      const unmatched: { nome: string; cpf: string; funcao: string; salario: number }[] = []
      const divergencias: { funcionarioId: string; nomeSistema: string; nomeContabilidade: string; cpf: string }[] = []
      const dadosDivergentes: { funcionarioId: string; nome: string; campo: string; valorSistema: string; valorContabilidade: string }[] = []

      for (const funcPDF of resumo.funcionarios) {
        const cpfNorm = normalizeCPF(funcPDF.cpf)

        let funcSistema = funcsAtivos.find(f => normalizeCPF(f.cpf || '') === cpfNorm)
        if (!funcSistema) {
          funcSistema = funcionarios.find(f => normalizeCPF(f.cpf || '') === cpfNorm)
        }

        if (funcSistema) {
          // Verificar divergencia de nome
          const nomeSistema = funcSistema.nome.trim().toLowerCase()
          const nomeContab = funcPDF.nome.trim().toLowerCase()
          if (nomeSistema !== nomeContab && !nomeSistema.includes(nomeContab) && !nomeContab.includes(nomeSistema)) {
            divergencias.push({
              funcionarioId: funcSistema.id,
              nomeSistema: funcSistema.nome,
              nomeContabilidade: funcPDF.nome,
              cpf: funcPDF.cpf,
            })
          }

          // Conferir data de admissão
          if (funcPDF.dataAdmissao && funcSistema.dataAdmissao && funcPDF.dataAdmissao !== funcSistema.dataAdmissao) {
            dadosDivergentes.push({
              funcionarioId: funcSistema.id, nome: funcSistema.nome,
              campo: 'Data de admissão',
              valorSistema: new Date(funcSistema.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR'),
              valorContabilidade: new Date(funcPDF.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR'),
            })
          }

          // Conferir salário base
          if (funcPDF.salarioBase > 0 && funcSistema.salario && Math.abs(funcPDF.salarioBase - funcSistema.salario) > 1) {
            dadosDivergentes.push({
              funcionarioId: funcSistema.id, nome: funcSistema.nome,
              campo: 'Salário base',
              valorSistema: formatCurrency(funcSistema.salario),
              valorContabilidade: formatCurrency(funcPDF.salarioBase),
            })
          }

          // Calcular encargos empresa (FGTS + rateio GPS)
          const fgtsFunc = funcPDF.valorFGTS || 0
          const gpsRateio = resumo.gps > 0 && resumo.totalProventos > 0
            ? (funcPDF.totalProventos / resumo.totalProventos) * resumo.gps
            : 0
          const encargosEmpresa = Math.round((fgtsFunc + gpsRateio) * 100) / 100
          const horasExtras = funcPDF.horasExtras60 + funcPDF.horasExtras100 + funcPDF.dsrExtras + funcPDF.adicionalNoturno

          // Salvar direto no banco com descontos detalhados
          const row = {
            funcionario_id: funcSistema.id,
            mes: resumo.mes,
            ano: resumo.ano,
            salario_bruto: funcPDF.totalProventos,
            descontos: funcPDF.totalDescontos,
            vale_transporte: 0,
            vale_refeicao: 0,
            outros_beneficios: 0,
            encargos_empresa: encargosEmpresa,
            horas_extras: horasExtras,
            custo_total: funcPDF.totalProventos - funcPDF.totalDescontos + encargosEmpresa,
            desconto_inss: funcPDF.inssFuncionario,
            desconto_irrf: funcPDF.irrfFuncionario,
            desconto_adiantamento: funcPDF.adiantamento,
            desconto_faltas: funcPDF.faltasDias + funcPDF.faltasHoras,
            desconto_sindicato: funcPDF.contribuicaoNegocial,
            desconto_outros: Math.max(0, funcPDF.totalDescontos - funcPDF.inssFuncionario - funcPDF.irrfFuncionario - funcPDF.adiantamento - (funcPDF.faltasDias + funcPDF.faltasHoras) - funcPDF.contribuicaoNegocial),
            observacao: `Importado do espelho ${MESES[resumo.mes - 1]}/${resumo.ano}`,
            atualizado_em: new Date().toISOString(),
          }

          // Upsert (insere ou atualiza se ja existe)
          await supabase
            .from('folha_pagamento')
            .upsert(row, { onConflict: 'funcionario_id,mes,ano' })

          matched++
        } else {
          unmatched.push({ nome: funcPDF.nome, cpf: funcPDF.cpf, funcao: funcPDF.funcao, salario: funcPDF.salarioBase })
        }
      }

      // Verificar funcionarios ativos que NAO apareceram no espelho (possivel demissao)
      const cpfsNoEspelho = new Set(resumo.funcionarios.map(f => normalizeCPF(f.cpf)))
      const ausentes = funcsAtivos
        .filter(f => f.cpf && !cpfsNoEspelho.has(normalizeCPF(f.cpf)))
        .map(f => ({ nome: f.nome, id: f.id }))

      // Gerar pendências no banco para ausentes
      const MESES_NOMES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
      for (const a of ausentes) {
        await supabase.from('pendencias_rh').upsert({
          funcionario_id: a.id,
          tipo: 'ausente_folha',
          descricao: `Não apareceu no espelho da folha de ${MESES_NOMES[resumo.mes]}/${resumo.ano}`,
          mes_referencia: resumo.mes,
          ano_referencia: resumo.ano,
          status: 'pendente',
        }, { onConflict: 'funcionario_id,tipo,mes_referencia,ano_referencia' })
      }

      // Atualizar mes/ano para o do PDF
      setMes(resumo.mes)
      setAno(resumo.ano)
      setImportResult({ matched, unmatched, divergencias, ausentes, dadosDivergentes, resumo })
      onReloadFuncionarios?.()

      // Recarregar dados do mes importado diretamente
      try {
        const { data: reloadData } = await supabase
          .from('folha_pagamento')
          .select('*, funcionarios(nome, cargos(nome))')
          .eq('mes', resumo.mes)
          .eq('ano', resumo.ano)
        if (reloadData && reloadData.length > 0) {
          setFolhaItems(reloadData.map((r: Record<string, unknown>) => {
            const func = r.funcionarios as Record<string, unknown> | null
            const cargo = func?.cargos as Record<string, string> | null
            return {
              funcionarioId: r.funcionario_id as string,
              nome: (func?.nome as string) || '-',
              cargoNome: cargo?.nome || undefined,
              salarioBruto: Number(r.salario_bruto),
              descontos: Number(r.descontos),
              liquido: Number(r.salario_bruto) - Number(r.descontos),
              encargosEmpresa: Number(r.encargos_empresa),
              horasExtras: Number(r.horas_extras),
              custoTotal: Number(r.custo_total),
              descontoINSS: Number(r.desconto_inss || 0),
              descontoIRRF: Number(r.desconto_irrf || 0),
              descontoAdiantamento: Number(r.desconto_adiantamento || 0),
              descontoFaltas: Number(r.desconto_faltas || 0),
              descontoSindicato: Number(r.desconto_sindicato || 0),
              descontoOutros: Number(r.desconto_outros || 0),
            }
          }))
          setTemDados(true)
        }
      } catch { /* tabela pode nao existir */ }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao processar o PDF.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  type FolhaSortField = 'nome' | 'proventos' | 'descontos' | 'liquido' | 'encargos' | 'custoTotal'
  const [folhaSortField, setFolhaSortField] = useState<FolhaSortField>('custoTotal')
  const [folhaSortDir, setFolhaSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleFolhaSort = (field: FolhaSortField) => {
    if (folhaSortField === field) setFolhaSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setFolhaSortField(field); setFolhaSortDir('desc') }
  }
  const FSortIcon = ({ field }: { field: FolhaSortField }) => {
    if (folhaSortField !== field) return <ArrowUpDown size={10} className="text-gray-300" />
    return folhaSortDir === 'asc' ? <ArrowUp size={10} className="text-[#E91E63]" /> : <ArrowDown size={10} className="text-[#E91E63]" />
  }

  const sortedFolha = useMemo(() => {
    return [...folhaItems].sort((a, b) => {
      const dir = folhaSortDir === 'asc' ? 1 : -1
      switch (folhaSortField) {
        case 'nome': return a.nome.localeCompare(b.nome) * dir
        case 'proventos': return (a.salarioBruto - b.salarioBruto) * dir
        case 'descontos': return (a.descontos - b.descontos) * dir
        case 'liquido': return (a.liquido - b.liquido) * dir
        case 'encargos': return (a.encargosEmpresa - b.encargosEmpresa) * dir
        case 'custoTotal': return (a.custoTotal - b.custoTotal) * dir
        default: return 0
      }
    })
  }, [folhaItems, folhaSortField, folhaSortDir])

  const totais = useMemo(() => {
    return folhaItems.reduce((acc, i) => ({
      salarioBruto: acc.salarioBruto + i.salarioBruto,
      descontos: acc.descontos + i.descontos,
      liquido: acc.liquido + i.liquido,
      encargos: acc.encargos + i.encargosEmpresa,
      horasExtras: acc.horasExtras + i.horasExtras,
      custoTotal: acc.custoTotal + i.custoTotal,
    }), { salarioBruto: 0, descontos: 0, liquido: 0, encargos: 0, horasExtras: 0, custoTotal: 0 })
  }, [folhaItems])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navegarMes(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[160px]">
              <h3 className="text-lg font-bold text-gray-800">{MESES[mes - 1]} {ano}</h3>
              <p className="text-xs text-gray-400">
                {temDados ? `${folhaItems.length} funcionario(s) importado(s)` : 'Nenhum dado importado'}
              </p>
            </div>
            <button onClick={() => navegarMes(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        {msg && (
          <p className={cn('text-xs mt-2', msg.includes('Erro') ? 'text-red-500' : 'text-green-600')}>{msg}</p>
        )}
      </div>

      {/* Resultado da importacao */}
      {importResult && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-sm font-semibold text-gray-800">
              Importacao concluida — {MESES[importResult.resumo.mes - 1]}/{importResult.resumo.ano}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-700">{importResult.matched}</p>
              <p className="text-xs text-green-600">Importados</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-700">{importResult.resumo.totalColaboradores}</p>
              <p className="text-xs text-gray-500">No espelho</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{formatCurrency(importResult.resumo.totalProventos)}</p>
              <p className="text-xs text-blue-600">Total proventos</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{formatCurrency(importResult.resumo.totalImpostos)}</p>
              <p className="text-xs text-purple-600">Impostos empresa</p>
            </div>
          </div>

          {/* Divergencias de nome */}
          {importResult.divergencias.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-700">
                  {importResult.divergencias.length} nome(s) diferente(s) entre sistema e contabilidade:
                </span>
              </div>
              {importResult.divergencias.map(d => (
                <div key={d.cpf} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-2 border border-blue-100">
                  <div className="flex-1 text-xs">
                    <p className="text-gray-500">CPF: {d.cpf}</p>
                    <p>Sistema: <strong className="text-gray-800">{d.nomeSistema}</strong></p>
                    <p>Contabilidade: <strong className="text-blue-700">{d.nomeContabilidade}</strong></p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        await supabase.from('funcionarios').update({ nome: d.nomeContabilidade }).eq('id', d.funcionarioId)
                        setImportResult(prev => prev ? {
                          ...prev,
                          divergencias: prev.divergencias.filter(x => x.cpf !== d.cpf)
                        } : null)
                        setMsg(`Nome atualizado para "${d.nomeContabilidade}"`)
                        onReloadFuncionarios?.()
                        setTimeout(() => { setMsg(''); loadFolha() }, 2000)
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Usar contabilidade
                    </button>
                    <button
                      onClick={() => setImportResult(prev => prev ? { ...prev, divergencias: prev.divergencias.filter(x => x.cpf !== d.cpf) } : null)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      Manter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nao encontrados */}
          {importResult.unmatched.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-xs font-medium text-amber-700">
                  {importResult.unmatched.length} funcionario(s) nao encontrado(s) no sistema:
                </span>
              </div>
              {importResult.unmatched.map(u => (
                <div key={u.cpf} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
                  <div className="flex-1 text-xs">
                    <p><strong className="text-gray-800">{u.nome}</strong> — {u.funcao}</p>
                    <p className="text-gray-500">CPF: {u.cpf} | Salario: {formatCurrency(u.salario)}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('funcionarios').insert({
                        nome: u.nome, cpf: u.cpf, salario: u.salario,
                        tipo_contrato: 'clt', status: 'ativo',
                      })
                      if (!error) {
                        setImportResult(prev => prev ? { ...prev, unmatched: prev.unmatched.filter(x => x.cpf !== u.cpf) } : null)
                        setMsg(`"${u.nome}" cadastrado!`)
                        onReloadFuncionarios?.()
                        setTimeout(() => setMsg(''), 3000)
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 whitespace-nowrap"
                  >
                    Cadastrar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Funcionarios ativos que nao apareceram no espelho */}
          {importResult.ausentes.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-xs font-medium text-red-700">
                  {importResult.ausentes.length} funcionário(s) ativo(s) no sistema não apareceram neste espelho:
                </span>
              </div>
              <p className="text-xs text-red-600 ml-5">
                Possível desligamento? Verifique e atualize o cadastro se necessário.
              </p>
              <div className="flex flex-wrap gap-2 ml-5">
                {importResult.ausentes.map(a => (
                  <span key={a.id} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-1 rounded-lg font-medium">
                    {a.nome}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteudo principal */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-[#E91E63] animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Carregando...</span>
        </div>
      ) : temDados ? (
        <>
          {/* Totais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Proventos</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(totais.salarioBruto)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Descontos</p>
              <p className="text-sm font-bold text-red-600">-{formatCurrency(totais.descontos)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Liquido</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(totais.liquido)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Encargos empresa</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(totais.encargos)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
              <p className="text-xs text-gray-500">Horas extras</p>
              <p className="text-sm font-bold text-gray-800">{formatCurrency(totais.horasExtras)}</p>
            </div>
            <div className="bg-[#FCE4EC] rounded-xl p-3 border border-[#F8BBD0] text-center">
              <p className="text-xs text-[#E91E63]">Custo total</p>
              <p className="text-sm font-bold text-[#E91E63]">{formatCurrency(totais.custoTotal)}</p>
            </div>
          </div>

          {/* Tabela (somente leitura) */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left px-3 py-2 text-xs"><button onClick={() => toggleFolhaSort('nome')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">Funcionário <FSortIcon field="nome" /></button></th>
                    <th className="text-right px-2 py-2 text-xs"><button onClick={() => toggleFolhaSort('proventos')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 ml-auto">Proventos <FSortIcon field="proventos" /></button></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600 text-xs hidden lg:table-cell">INSS</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600 text-xs hidden lg:table-cell">Adiant.</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600 text-xs hidden xl:table-cell">Faltas</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-600 text-xs hidden xl:table-cell">Sindicato</th>
                    <th className="text-right px-2 py-2 text-xs"><button onClick={() => toggleFolhaSort('descontos')} className="flex items-center gap-1 font-semibold text-red-500 hover:text-red-700 ml-auto">Desc. total <FSortIcon field="descontos" /></button></th>
                    <th className="text-right px-2 py-2 text-xs hidden sm:table-cell"><button onClick={() => toggleFolhaSort('liquido')} className="flex items-center gap-1 font-semibold text-green-600 hover:text-green-800 ml-auto">Líquido <FSortIcon field="liquido" /></button></th>
                    <th className="text-right px-2 py-2 text-xs hidden md:table-cell"><button onClick={() => toggleFolhaSort('encargos')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 ml-auto">Encargos <FSortIcon field="encargos" /></button></th>
                    <th className="text-right px-2 py-2 text-xs"><button onClick={() => toggleFolhaSort('custoTotal')} className="flex items-center gap-1 font-bold text-[#E91E63] ml-auto">Custo total <FSortIcon field="custoTotal" /></button></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedFolha.map(item => (
                    <tr key={item.funcionarioId} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-800 text-xs">{item.nome}</span>
                        {item.cargoNome && <p className="text-[10px] text-gray-400">{item.cargoNome}</p>}
                      </td>
                      <td className="px-2 py-2 text-right text-xs text-gray-800">{formatCurrency(item.salarioBruto)}</td>
                      <td className="px-2 py-2 text-right text-xs text-red-500 hidden lg:table-cell">{item.descontoINSS > 0 ? formatCurrency(item.descontoINSS) : '-'}</td>
                      <td className="px-2 py-2 text-right text-xs text-red-500 hidden lg:table-cell">{item.descontoAdiantamento > 0 ? formatCurrency(item.descontoAdiantamento) : '-'}</td>
                      <td className="px-2 py-2 text-right text-xs text-red-500 hidden xl:table-cell">{item.descontoFaltas > 0 ? formatCurrency(item.descontoFaltas) : '-'}</td>
                      <td className="px-2 py-2 text-right text-xs text-red-500 hidden xl:table-cell">{item.descontoSindicato > 0 ? formatCurrency(item.descontoSindicato) : '-'}</td>
                      <td className="px-2 py-2 text-right text-xs text-red-600 font-medium">-{formatCurrency(item.descontos)}</td>
                      <td className="px-2 py-2 text-right text-xs text-green-700 hidden sm:table-cell">{formatCurrency(item.liquido)}</td>
                      <td className="px-2 py-2 text-right text-xs text-gray-500 hidden md:table-cell">{formatCurrency(item.encargosEmpresa)}</td>
                      <td className="px-2 py-2 text-right text-xs font-bold text-gray-800">{formatCurrency(item.custoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 font-bold text-gray-700 text-xs">Total ({folhaItems.length})</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-800 text-xs">{formatCurrency(totais.salarioBruto)}</td>
                    <td className="px-2 py-2 text-right font-bold text-red-500 text-xs hidden lg:table-cell">{formatCurrency(folhaItems.reduce((s, i) => s + i.descontoINSS, 0))}</td>
                    <td className="px-2 py-2 text-right font-bold text-red-500 text-xs hidden lg:table-cell">{formatCurrency(folhaItems.reduce((s, i) => s + i.descontoAdiantamento, 0))}</td>
                    <td className="px-2 py-2 text-right font-bold text-red-500 text-xs hidden xl:table-cell">{formatCurrency(folhaItems.reduce((s, i) => s + i.descontoFaltas, 0))}</td>
                    <td className="px-2 py-2 text-right font-bold text-red-500 text-xs hidden xl:table-cell">{formatCurrency(folhaItems.reduce((s, i) => s + i.descontoSindicato, 0))}</td>
                    <td className="px-2 py-2 text-right font-bold text-red-600 text-xs">-{formatCurrency(totais.descontos)}</td>
                    <td className="px-2 py-2 text-right font-bold text-green-700 text-xs hidden sm:table-cell">{formatCurrency(totais.liquido)}</td>
                    <td className="px-2 py-2 text-right font-bold text-gray-500 text-xs hidden md:table-cell">{formatCurrency(totais.encargos)}</td>
                    <td className="px-2 py-2 text-right font-bold text-[#E91E63] text-xs">{formatCurrency(totais.custoTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Estado vazio - sem dados importados */
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-[#FCE4EC] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-[#E91E63]" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Nenhuma folha importada para {MESES[mes - 1]}/{ano}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Importe o PDF do espelho da folha que a contabilidade envia mensalmente.
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#E91E63] text-white rounded-xl cursor-pointer text-sm font-medium hover:bg-[#C2185B] shadow-sm">
            <Upload size={18} />
            Importar Espelho da Folha (PDF)
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleImportPDF} disabled={importing} />
          </label>
          <p className="text-xs text-gray-400 mt-3">
            Formato aceito: PDF do espelho mensal gerado pelo sistema contabil (SCI, Dominio, etc.)
          </p>
        </div>
      )}
    </div>
  )
}
