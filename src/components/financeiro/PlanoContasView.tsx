import { useState, useMemo } from 'react'
import { Plus, X, Search, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanoContas, GrupoContas, TipoCusto, Condicao } from '@/data/financeData'
import { grupoLabels, tipoCustoLabels, condicaoLabels } from '@/data/financeData'

interface PlanoContasViewProps {
  planoContas: PlanoContas[]
  onAdd: (p: Omit<PlanoContas, 'id' | 'status'>) => void
  onToggleStatus: (id: string) => void
}

const grupoDescricoes: Record<GrupoContas, string> = {
  gasto_pessoal: 'Salarios, encargos (INSS, FGTS), beneficios (VT, VR, VA), ferias, 13o, comissoes',
  custo_direto: 'Materias-primas, insumos de producao, embalagens, ingredientes, produtos para revenda',
  ocupacao: 'Aluguel, condominio, IPTU, energia eletrica, agua, manutencao do imovel',
  administrativo: 'Internet, telefone, contador, software/sistemas, material de escritorio, limpeza, seguro',
  impostos_financeiro: 'Simples Nacional, DARF, DAS, taxas bancarias, juros, tarifas de maquininha/cartao',
}

type SortField = 'nome' | 'grupo' | 'tipoCusto' | 'condicao' | 'status'
type SortDir = 'asc' | 'desc'

export function PlanoContasView({ planoContas, onAdd, onToggleStatus }: PlanoContasViewProps) {
  const [search, setSearch] = useState('')
  const [filterGrupo, setFilterGrupo] = useState<GrupoContas | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoCusto, setTipoCusto] = useState<TipoCusto>('fixo')
  const [grupo, setGrupo] = useState<GrupoContas>('gasto_pessoal')
  const [condicao, setCondicao] = useState<Condicao>('necessidade')
  const [sortField, setSortField] = useState<SortField>('grupo')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp size={14} className="text-[#E91E63]" />
      : <ArrowDown size={14} className="text-[#E91E63]" />
  }

  const sorted = useMemo(() => {
    let items = planoContas.filter(p => {
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.descricao || '').toLowerCase().includes(search.toLowerCase())) return false
      if (filterGrupo !== 'todos' && p.grupo !== filterGrupo) return false
      return true
    })

    const grupoOrder = Object.keys(grupoLabels)

    items.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'nome':
          cmp = a.nome.localeCompare(b.nome)
          break
        case 'grupo':
          cmp = grupoOrder.indexOf(a.grupo) - grupoOrder.indexOf(b.grupo)
          if (cmp === 0) cmp = a.nome.localeCompare(b.nome)
          break
        case 'tipoCusto':
          cmp = (tipoCustoLabels[a.tipoCusto] || '').localeCompare(tipoCustoLabels[b.tipoCusto] || '')
          break
        case 'condicao':
          cmp = (condicaoLabels[a.condicao] || '').localeCompare(condicaoLabels[b.condicao] || '')
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return items
  }, [planoContas, search, filterGrupo, sortField, sortDir])

  const handleAdd = () => {
    if (!nome.trim()) return
    onAdd({ nome: nome.trim(), descricao: descricao.trim() || undefined, tipoCusto, grupo, condicao })
    setNome(''); setDescricao(''); setShowForm(false)
  }

  const grupoColors: Record<GrupoContas, string> = {
    gasto_pessoal: 'bg-pink-50 text-pink-700',
    custo_direto: 'bg-orange-50 text-orange-700',
    ocupacao: 'bg-blue-50 text-blue-700',
    administrativo: 'bg-purple-50 text-purple-700',
    impostos_financeiro: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar conta..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" />
          </div>
          <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value as GrupoContas | 'todos')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
            <option value="todos">Todos grupos</option>
            {Object.entries(grupoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Nova Conta'}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 bg-[#FCE4EC]/30 rounded-lg border border-[#F8BBD0]">
            <p className="text-sm font-medium text-gray-700 mb-3">Nova conta no plano</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Nome da conta *" value={nome} onChange={e => setNome(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]" autoFocus />
              <select value={grupo} onChange={e => setGrupo(e.target.value as GrupoContas)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                {Object.entries(grupoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={tipoCusto} onChange={e => setTipoCusto(e.target.value as TipoCusto)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                {Object.entries(tipoCustoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={condicao} onChange={e => setCondicao(e.target.value as Condicao)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]">
                {Object.entries(condicaoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <textarea
                placeholder="Descricao: o que lancar nesta conta? (Ex: Salarios dos funcionarios, incluindo 13o e ferias)"
                value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] sm:col-span-2" />
            </div>
            <button onClick={handleAdd} className="mt-3 px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
              Salvar
            </button>
          </div>
        )}
      </div>

      {/* Legenda dos grupos */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Info size={12} /> Grupos do Plano de Contas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(grupoLabels).map(([k, v]) => (
            <div key={k} className="text-xs text-gray-500">
              <span className={cn('inline-block px-2 py-0.5 rounded-full font-medium mr-1', grupoColors[k as GrupoContas])}>{v}</span>
              {grupoDescricoes[k as GrupoContas]}
            </div>
          ))}
        </div>
      </div>

      {/* Tabela ordenavel */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Nome <SortIcon field="nome" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button onClick={() => toggleSort('grupo')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Grupo <SortIcon field="grupo" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <button onClick={() => toggleSort('tipoCusto')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Tipo <SortIcon field="tipoCusto" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">
                  <button onClick={() => toggleSort('condicao')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                    Condicao <SortIcon field="condicao" />
                  </button>
                </th>
                <th className="text-center px-4 py-3">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 mx-auto">
                    Status <SortIcon field="status" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(p => (
                <tr key={p.id} className={cn('hover:bg-gray-50/50 transition-colors', p.status === 'inativo' && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{p.nome}</span>
                    {p.descricao && <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{p.descricao}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', grupoColors[p.grupo])}>
                      {grupoLabels[p.grupo]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tipoCustoLabels[p.tipoCusto]}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{condicaoLabels[p.condicao]}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => onToggleStatus(p.id)}
                      className={cn('text-xs px-3 py-1 rounded-full font-medium',
                        p.status === 'ativo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}>
                      {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma conta encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
          <span className="text-xs text-gray-400">{sorted.length} conta(s) encontrada(s)</span>
        </div>
      </div>
    </div>
  )
}
