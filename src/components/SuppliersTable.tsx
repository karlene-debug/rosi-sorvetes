import { fornecedores } from '@/data/mockData'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pago: { label: 'Pago', icon: <CheckCircle size={13} />, class: 'bg-green-50 text-green-600' },
    pendente: { label: 'Pendente', icon: <Clock size={13} />, class: 'bg-yellow-50 text-yellow-600' },
    atrasado: { label: 'Atrasado', icon: <AlertCircle size={13} />, class: 'bg-red-50 text-red-500' },
  }
  const s = config[status as keyof typeof config] || config.pendente
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.class}`}>
      {s.icon} {s.label}
    </span>
  )
}

export function SuppliersTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <h2 className="text-base font-bold text-gray-800">Fornecedores</h2>
        <p className="text-xs text-gray-500 mt-0.5">Pagamentos e status de contas</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Fornecedor</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Produto</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Valor</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Vencimento</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map((f, i) => (
              <tr key={f.id} className={`border-t border-gray-50 hover:bg-[#FCE4EC]/20 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FCE4EC] flex items-center justify-center text-[#E91E63] font-bold text-xs flex-shrink-0">
                      {f.nome.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-gray-500">{f.produto}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(f.valor)}</span>
                </td>
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className="text-sm text-gray-500">{formatDate(f.vencimento)}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
