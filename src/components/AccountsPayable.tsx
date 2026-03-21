import { contasAPagar } from '@/data/mockData'
import { CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function getDaysUntil(dateStr: string): number {
  const today = new Date('2025-03-21')
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pago: { label: 'Pago', icon: <CheckCircle size={13} />, class: 'bg-green-50 text-green-600 border-green-100' },
    pendente: { label: 'Pendente', icon: <Clock size={13} />, class: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
    atrasado: { label: 'Atrasado', icon: <AlertCircle size={13} />, class: 'bg-red-50 text-red-500 border-red-100' },
  }
  const s = config[status as keyof typeof config] || config.pendente
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.class}`}>
      {s.icon} {s.label}
    </span>
  )
}

export function AccountsPayable() {
  const total = contasAPagar.filter(c => c.status !== 'pago').reduce((acc, c) => acc + c.valor, 0)
  const atrasado = contasAPagar.filter(c => c.status === 'atrasado').reduce((acc, c) => acc + c.valor, 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">Contas a Pagar</h2>
            <p className="text-xs text-gray-500 mt-0.5">Vencimentos e obrigações financeiras</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-[#FCE4EC] rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-gray-500">A pagar</p>
              <p className="text-sm font-bold text-[#E91E63]">{formatCurrency(total)}</p>
            </div>
            <div className="bg-red-50 rounded-xl px-3 py-2 text-center">
              <p className="text-xs text-gray-500">Em atraso</p>
              <p className="text-sm font-bold text-red-500">{formatCurrency(atrasado)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {contasAPagar.map((conta) => {
          const daysUntil = getDaysUntil(conta.vencimento)
          return (
            <div key={conta.id} className={`flex items-center justify-between px-5 py-3.5 hover:bg-[#FCE4EC]/20 transition-colors ${conta.status === 'atrasado' ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  conta.status === 'pago' ? 'bg-green-50' :
                  conta.status === 'atrasado' ? 'bg-red-50' : 'bg-[#FCE4EC]'
                }`}>
                  <Calendar size={16} className={
                    conta.status === 'pago' ? 'text-green-500' :
                    conta.status === 'atrasado' ? 'text-red-500' : 'text-[#E91E63]'
                  } />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{conta.descricao}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{conta.categoria}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{formatDate(conta.vencimento)}</span>
                    {conta.status === 'pendente' && daysUntil <= 5 && daysUntil >= 0 && (
                      <span className="text-xs text-orange-500 font-medium">Vence em {daysUntil}d</span>
                    )}
                    {conta.status === 'atrasado' && (
                      <span className="text-xs text-red-500 font-medium">{Math.abs(daysUntil)}d atrás</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className="text-sm font-bold text-gray-800 hidden sm:block">{formatCurrency(conta.valor)}</span>
                <StatusBadge status={conta.status} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
