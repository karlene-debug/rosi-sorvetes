import { useState } from 'react'
import { ArrowDown, ArrowUp, Settings, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StockMovement, MovementType } from '@/data/stockData'

interface StockMovementsProps {
  movements: StockMovement[]
}

export function StockMovements({ movements }: StockMovementsProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<MovementType | 'todos'>('todos')
  const [filterOrigin, setFilterOrigin] = useState<'todos' | 'plataforma' | 'importado'>('todos')
  const [page, setPage] = useState(0)
  const perPage = 50

  const sorted = [...movements].sort((a, b) => b.data.localeCompare(a.data))
  const filtered = sorted.filter(m => {
    if (search && !m.sabor.toLowerCase().includes(search.toLowerCase()) && !m.responsavel.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType !== 'todos' && m.tipo !== filterType) return false
    if (filterOrigin !== 'todos' && m.origem !== filterOrigin) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total registros</p>
          <p className="text-2xl font-bold text-gray-800">{movements.length.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Importados (historico)</p>
          <p className="text-2xl font-bold text-blue-600">{movements.filter(m => m.origem === 'importado').length.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Via plataforma</p>
          <p className="text-2xl font-bold text-[#E91E63]">{movements.filter(m => m.origem === 'plataforma').length.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por sabor ou responsavel..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value as MovementType | 'todos'); setPage(0) }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            >
              <option value="todos">Todos tipos</option>
              <option value="producao">Producao</option>
              <option value="saida">Saida</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <select
              value={filterOrigin}
              onChange={e => { setFilterOrigin(e.target.value as 'todos' | 'plataforma' | 'importado'); setPage(0) }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F8BBD0]"
            >
              <option value="todos">Todas origens</option>
              <option value="importado">Importado</option>
              <option value="plataforma">Plataforma</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Data</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Tipo</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Sabor</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Qtd</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Unidade</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Responsavel</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.data)}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                      m.tipo === 'producao' ? 'bg-blue-50 text-blue-700' :
                      m.tipo === 'saida' ? 'bg-pink-50 text-pink-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {m.tipo === 'producao' ? <ArrowUp size={10} /> : m.tipo === 'saida' ? <ArrowDown size={10} /> : <Settings size={10} />}
                      {m.tipo === 'producao' ? 'Producao' : m.tipo === 'saida' ? 'Saida' : 'Ajuste'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-800">{m.sabor}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      'text-sm font-semibold',
                      m.tipo === 'producao' ? 'text-blue-600' : 'text-pink-600'
                    )}>
                      {m.tipo === 'producao' ? '+' : '-'}{m.quantidade}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">{m.unidade}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 hidden md:table-cell">{m.responsavel}</td>
                  <td className="px-4 py-2.5 text-center hidden lg:table-cell">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      m.origem === 'importado' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
                    )}>
                      {m.origem === 'importado' ? 'Importado' : 'Plataforma'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} de {filtered.length.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
              >
                Proximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
