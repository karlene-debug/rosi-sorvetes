import { useState } from 'react'
import { Plus, X, Search, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanoContas, GrupoContas, TipoCusto, Condicao } from '@/data/financeData'
import { grupoLabels, tipoCustoLabels, condicaoLabels } from '@/data/financeData'

interface PlanoContasViewProps {
  planoContas: PlanoContas[]
  onAdd: (p: Omit<PlanoContas, 'id' | 'status'>) => void
  onToggleStatus: (id: string) => void
}

// Descricoes sugeridas por grupo pra orientar o usuario
const grupoDescricoes: Record<GrupoContas, string> = {
  gasto_pessoal: 'Salarios, encargos (INSS, FGTS), beneficios (VT, VR, VA), ferias, 13o, comissoes',
  custo_direto: 'Materias-primas, insumos de producao, embalagens, ingredientes, produtos para revenda',
  ocupacao: 'Aluguel, condominio, IPTU, energia eletrica, agua, manutencao do imovel',
  administrativo: 'Internet, telefone, contador, software/sistemas, material de escritorio, limpeza, seguro',
  impostos_financeiro: 'Simples Nacional, DARF, DAS, taxas bancarias, juros, tarifas de maquininha/cartao',
}

export function PlanoContasView({ planoContas, onAdd, onToggleStatus }: PlanoContasViewProps) {
  const [search, setSearch] = useState('')
  const [filterGrupo, setFilterGrupo] = useState<GrupoContas | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoCusto, setTipoCusto] = useState<TipoCusto>('fixo')
  const [grupo, setGrupo] = useState<GrupoContas>('gasto_pessoal')
  const [condicao, setCondicao] = useState<Condicao>('necessidade')

  const filtered = planoContas.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.descricao || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterGrupo !== 'todos' && p.grupo !== filterGrupo) return false
    return true
  })

  // Agrupar por grupo
  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.grupo]) acc[p.grupo] = []
    acc[p.grupo].push(p)
    return acc
  }, {} as Record<string, PlanoContas[]>)

  const handleAdd = () => {
    if (!nome.trim()) return
    onAdd({ nome: nome.trim(), descricao: descricao.trim() || undefined, tipoCusto, grupo, condicao })
    setNome(''); setDescricao(''); setShowForm(false)
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
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={2}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0] sm:col-span-2"
              />
            </div>
            <button onClick={handleAdd} className="mt-3 px-6 py-2 bg-[#E91E63] text-white rounded-lg text-sm font-medium hover:bg-[#C2185B]">
              Salvar
            </button>
          </div>
        )}
      </div>

      {/* Grouped view */}
      {Object.entries(grupoLabels).map(([grupoKey, grupoLabel]) => {
        const items = grouped[grupoKey]
        if (!items && filterGrupo !== 'todos') return null
        return (
          <div key={grupoKey} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">{grupoLabel}</h3>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Info size={10} />
                {grupoDescricoes[grupoKey as GrupoContas]}
              </p>
              {items && <span className="text-[10px] text-gray-400">{items.length} conta(s)</span>}
            </div>
            {items ? (
              <div className="divide-y divide-gray-50">
                {items.map(p => (
                  <div key={p.id} className={cn('flex items-center justify-between px-4 py-3 hover:bg-gray-50/50', p.status === 'inativo' && 'opacity-50')}>
                    <div className="flex-1">
                      <span className="text-sm text-gray-800 font-medium">{p.nome}</span>
                      {p.descricao && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tipoCustoLabels[p.tipoCusto]}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{condicaoLabels[p.condicao]}</span>
                      </div>
                    </div>
                    <button onClick={() => onToggleStatus(p.id)}
                      className={cn('text-xs px-3 py-1 rounded-full font-medium',
                        p.status === 'ativo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}>
                      {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              filterGrupo === 'todos' && (
                <div className="px-4 py-3 text-xs text-gray-400">Nenhuma conta cadastrada neste grupo</div>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
