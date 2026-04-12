import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Save, Loader2, Calculator, Info, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Funcionario } from './PessoasSection'
import { parseFolhaPDF, type FolhaResumo } from '@/lib/folhaParser'

interface FolhaPagamentoManagerProps {
  funcionarios: Funcionario[]
  unidadeSelecionada?: string
}

interface FolhaItem {
  id?: string
  funcionarioId: string
  salarioBruto: number
  descontos: number
  valeTransporte: number
  valeRefeicao: number
  outrosBeneficios: number
  encargosEmpresa: number
  horasExtras: number
  custoTotal: number
  observacao: string
  changed: boolean
}

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Normalizar CPF para comparacao (remove pontos e tracos)
function normalizeCPF(cpf: string): string {
  return (cpf || '').replace(/[.\-/\s]/g, '')
}

export function FolhaPagamentoManager({ funcionarios, unidadeSelecionada }: FolhaPagamentoManagerProps) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [items, setItems] = useState<FolhaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    matched: number
    unmatched: { nome: string; cpf: string; funcao: string; salario: number }[]
    divergencias: { funcionarioId: string; nomeSistema: string; nomeContabilidade: string; cpf: string }[]
    resumo: FolhaResumo
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const funcsAtivos = useMemo(() => {
    let f = funcionarios.filter(f => f.status === 'ativo')
    if (unidadeSelecionada && unidadeSelecionada !== 'todas') {
      f = f.filter(func => func.unidadeId === unidadeSelecionada)
    }
    return f.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [funcionarios, unidadeSelecionada])

  const loadFolha = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('folha_pagamento')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)

      const folhaMap = new Map<string, Record<string, unknown>>()
      for (const row of data || []) {
        folhaMap.set(row.funcionario_id, row)
      }

      const newItems: FolhaItem[] = funcsAtivos.map(f => {
        const existing = folhaMap.get(f.id)
        if (existing) {
          return {
            id: existing.id as string,
            funcionarioId: f.id,
            salarioBruto: Number(existing.salario_bruto),
            descontos: Number(existing.descontos),
            valeTransporte: Number(existing.vale_transporte),
            valeRefeicao: Number(existing.vale_refeicao),
            outrosBeneficios: Number(existing.outros_beneficios),
            encargosEmpresa: Number(existing.encargos_empresa),
            horasExtras: Number(existing.horas_extras),
            custoTotal: Number(existing.custo_total),
            observacao: (existing.observacao as string) || '',
            changed: false,
          }
        }
        const salario = f.salario || 0
        const encargos = f.tipoContrato === 'clt' ? Math.round(salario * 0.4744 * 100) / 100 : 0
        return {
          funcionarioId: f.id,
          salarioBruto: salario, descontos: 0, valeTransporte: 0, valeRefeicao: 0,
          outrosBeneficios: 0, encargosEmpresa: encargos, horasExtras: 0,
          custoTotal: salario + encargos, observacao: '', changed: false,
        }
      })

      setItems(newItems)
    } catch {
      const newItems: FolhaItem[] = funcsAtivos.map(f => {
        const salario = f.salario || 0
        const encargos = f.tipoContrato === 'clt' ? Math.round(salario * 0.4744 * 100) / 100 : 0
        return {
          funcionarioId: f.id, salarioBruto: salario, descontos: 0, valeTransporte: 0, valeRefeicao: 0,
          outrosBeneficios: 0, encargosEmpresa: encargos, horasExtras: 0,
          custoTotal: salario + encargos, observacao: '', changed: false,
        }
      })
      setItems(newItems)
    } finally {
      setLoading(false)
    }
  }, [mes, ano, funcsAtivos])

  useEffect(() => { loadFolha() }, [loadFolha])

  const updateItem = (idx: number, field: keyof FolhaItem, value: number | string) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[idx], [field]: value, changed: true }
      item.custoTotal = item.salarioBruto - item.descontos + item.valeTransporte + item.valeRefeicao
        + item.outrosBeneficios + item.encargosEmpresa + item.horasExtras
      updated[idx] = item
      return updated
    })
  }

  const preencherEncargos = () => {
    setItems(prev => prev.map(item => {
      const func = funcsAtivos.find(f => f.id === item.funcionarioId)
      if (func?.tipoContrato !== 'clt') return item
      const encargos = Math.round(item.salarioBruto * 0.4744 * 100) / 100
      const updated = { ...item, encargosEmpresa: encargos, changed: true }
      updated.custoTotal = updated.salarioBruto - updated.descontos + updated.valeTransporte + updated.valeRefeicao
        + updated.outrosBeneficios + updated.encargosEmpresa + updated.horasExtras
      return updated
    }))
  }

  // === IMPORTACAO DO ESPELHO DA FOLHA ===
  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setSavedMsg('Selecione um arquivo PDF do espelho da folha.')
      return
    }

    setImporting(true)
    setSavedMsg('')
    setImportResult(null)

    try {
      const resumo = await parseFolhaPDF(file)

      // Atualizar mes/ano para o mes do PDF
      setMes(resumo.mes)
      setAno(resumo.ano)

      // Cruzar funcionarios do PDF com os do sistema por CPF
      // Tambem buscar em TODOS os funcionarios (nao so ativos da unidade) pra nao perder match
      let matched = 0
      const unmatched: { nome: string; cpf: string; funcao: string; salario: number }[] = []
      const divergencias: { funcionarioId: string; nomeSistema: string; nomeContabilidade: string; cpf: string }[] = []

      const updatedItems = [...items]

      for (const funcPDF of resumo.funcionarios) {
        const cpfNorm = normalizeCPF(funcPDF.cpf)

        // Primeiro tenta achar nos ativos da unidade
        let funcSistema = funcsAtivos.find(f => normalizeCPF(f.cpf || '') === cpfNorm)
        // Se nao achou, tenta em todos os funcionarios
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

          const idx = updatedItems.findIndex(i => i.funcionarioId === funcSistema!.id)
          if (idx >= 0) {
            const fgtsFunc = funcPDF.valorFGTS || 0
            const gpsRateio = resumo.gps > 0 && resumo.totalProventos > 0
              ? (funcPDF.totalProventos / resumo.totalProventos) * resumo.gps
              : 0
            const encargosEmpresa = Math.round((fgtsFunc + gpsRateio) * 100) / 100

            const horasExtras = funcPDF.horasExtras60 + funcPDF.horasExtras100 + funcPDF.dsrExtras
              + funcPDF.adicionalNoturno

            const salarioBruto = funcPDF.totalProventos
            const descontos = funcPDF.totalDescontos

            updatedItems[idx] = {
              ...updatedItems[idx],
              salarioBruto,
              descontos,
              encargosEmpresa,
              horasExtras,
              custoTotal: salarioBruto - descontos + encargosEmpresa,
              observacao: `Importado do espelho da folha ${MESES[resumo.mes - 1]}/${resumo.ano}`,
              changed: true,
            }
            matched++
          }
        } else {
          unmatched.push({ nome: funcPDF.nome, cpf: funcPDF.cpf, funcao: funcPDF.funcao, salario: funcPDF.salarioBase })
        }
      }

      setItems(updatedItems)
      setImportResult({ matched, unmatched, divergencias, resumo })
    } catch (err) {
      setSavedMsg(err instanceof Error ? err.message : 'Erro ao processar o PDF.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      const changedItems = items.filter(i => i.changed)
      for (const item of changedItems) {
        const row = {
          funcionario_id: item.funcionarioId,
          mes, ano,
          salario_bruto: item.salarioBruto,
          descontos: item.descontos,
          vale_transporte: item.valeTransporte,
          vale_refeicao: item.valeRefeicao,
          outros_beneficios: item.outrosBeneficios,
          encargos_empresa: item.encargosEmpresa,
          horas_extras: item.horasExtras,
          custo_total: item.custoTotal,
          observacao: item.observacao || null,
          atualizado_em: new Date().toISOString(),
        }
        if (item.id) {
          await supabase.from('folha_pagamento').update(row).eq('id', item.id)
        } else {
          const { data } = await supabase.from('folha_pagamento').insert(row).select('id').single()
          if (data) item.id = data.id
        }
        item.changed = false
      }
      setItems([...items])
      setSavedMsg(`${changedItems.length} registro(s) salvo(s)`)
      setImportResult(null)
      setTimeout(() => setSavedMsg(''), 3000)
    } catch {
      setSavedMsg('Erro ao salvar. Verifique se a migration v9 foi executada.')
    } finally {
      setSaving(false)
    }
  }

  const navegarMes = (dir: -1 | 1) => {
    setMes(prev => {
      let m = prev + dir
      if (m < 1) { m = 12; setAno(a => a - 1) }
      else if (m > 12) { m = 1; setAno(a => a + 1) }
      return m
    })
  }

  const totais = useMemo(() => {
    return items.reduce((acc, i) => ({
      salarioBruto: acc.salarioBruto + i.salarioBruto,
      descontos: acc.descontos + i.descontos,
      beneficios: acc.beneficios + i.valeTransporte + i.valeRefeicao + i.outrosBeneficios,
      encargos: acc.encargos + i.encargosEmpresa,
      horasExtras: acc.horasExtras + i.horasExtras,
      custoTotal: acc.custoTotal + i.custoTotal,
    }), { salarioBruto: 0, descontos: 0, beneficios: 0, encargos: 0, horasExtras: 0, custoTotal: 0 })
  }, [items])

  const hasChanges = items.some(i => i.changed)

  return (
    <div className="space-y-4">
      {/* Header com navegacao */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navegarMes(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[160px]">
              <h3 className="text-lg font-bold text-gray-800">{MESES[mes - 1]} {ano}</h3>
              <p className="text-xs text-gray-400">{funcsAtivos.length} funcionario(s)</p>
            </div>
            <button onClick={() => navegarMes(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botao importar PDF */}
            <label className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg cursor-pointer',
              importing ? 'bg-gray-100 text-gray-400' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
            )}>
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? 'Processando...' : 'Importar Espelho da Folha'}
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleImportPDF} disabled={importing} />
            </label>
            <button onClick={preencherEncargos}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">
              <Calculator size={14} /> Calcular encargos
            </button>
            <button onClick={handleSave} disabled={saving || !hasChanges}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
                hasChanges ? 'bg-[#E91E63] text-white hover:bg-[#C2185B]' : 'bg-gray-100 text-gray-400'
              )}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
          </div>
        </div>
        {savedMsg && (
          <p className={cn('text-xs mt-2', savedMsg.includes('Erro') ? 'text-red-500' : 'text-green-600')}>{savedMsg}</p>
        )}
      </div>

      {/* Resultado da importacao */}
      {importResult && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">
              Espelho importado: {MESES[importResult.resumo.mes - 1]}/{importResult.resumo.ano}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-700">{importResult.matched}</p>
              <p className="text-xs text-green-600">Funcionarios encontrados</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-700">{importResult.resumo.totalColaboradores}</p>
              <p className="text-xs text-gray-500">Total no espelho</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{formatCurrency(importResult.resumo.totalProventos)}</p>
              <p className="text-xs text-blue-600">Total proventos</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-700">{formatCurrency(importResult.resumo.totalImpostos)}</p>
              <p className="text-xs text-purple-600">Total impostos empresa</p>
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
                        setSavedMsg(`Nome atualizado para "${d.nomeContabilidade}"`)
                        setTimeout(() => setSavedMsg(''), 3000)
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Usar contabilidade
                    </button>
                    <button
                      onClick={() => {
                        setImportResult(prev => prev ? {
                          ...prev,
                          divergencias: prev.divergencias.filter(x => x.cpf !== d.cpf)
                        } : null)
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      Manter sistema
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Funcionarios nao encontrados */}
          {importResult.unmatched.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-xs font-medium text-amber-700">
                  {importResult.unmatched.length} funcionario(s) da contabilidade nao encontrado(s) no sistema:
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
                        setImportResult(prev => prev ? {
                          ...prev,
                          unmatched: prev.unmatched.filter(x => x.cpf !== u.cpf)
                        } : null)
                        setSavedMsg(`"${u.nome}" cadastrado! Reimporte o PDF para preencher os dados.`)
                        setTimeout(() => setSavedMsg(''), 4000)
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 whitespace-nowrap"
                  >
                    Cadastrar funcionario
                  </button>
                </div>
              ))}
            </div>
          )}

          {importResult.matched > 0 && (
            <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-xs text-green-700">
                Dados importados com sucesso! Confira os valores abaixo e clique em <strong>Salvar</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Importe o PDF do espelho da folha (contabilidade) para preencher automaticamente, ou lance manualmente.
          Os encargos da empresa (INSS patronal + FGTS) sao rateados proporcionalmente entre os funcionarios.
        </p>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Salarios</p>
          <p className="text-sm font-bold text-gray-800">{formatCurrency(totais.salarioBruto)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Descontos</p>
          <p className="text-sm font-bold text-red-600">-{formatCurrency(totais.descontos)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Beneficios</p>
          <p className="text-sm font-bold text-gray-800">{formatCurrency(totais.beneficios)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Encargos</p>
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

      {/* Tabela editavel */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-[#E91E63] animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Carregando folha...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">Funcionario</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[110px]">Sal. bruto</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[100px]">Descontos</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[90px]">VT</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[90px]">VR</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[100px]">Outros ben.</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[110px]">Encargos</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 min-w-[100px]">Horas ext.</th>
                  <th className="text-right px-3 py-2 font-bold text-[#E91E63] min-w-[110px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => {
                  const func = funcsAtivos.find(f => f.id === item.funcionarioId)
                  return (
                    <tr key={item.funcionarioId} className={cn('hover:bg-gray-50/50', item.changed && 'bg-amber-50/30')}>
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">
                        <span className="font-medium text-gray-800 text-xs">{func?.nome || '-'}</span>
                        {func?.cargoNome && <p className="text-[10px] text-gray-400">{func.cargoNome}</p>}
                      </td>
                      {(['salarioBruto', 'descontos', 'valeTransporte', 'valeRefeicao', 'outrosBeneficios', 'encargosEmpresa', 'horasExtras'] as const).map(field => (
                        <td key={field} className="px-1 py-1">
                          <input type="number" step="0.01" min="0"
                            value={item[field] || ''}
                            onChange={e => updateItem(idx, field, Number(e.target.value) || 0)}
                            className="w-full text-right px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#F8BBD0] focus:bg-white" />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <span className="font-bold text-xs text-gray-800">{formatCurrency(item.custoTotal)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
