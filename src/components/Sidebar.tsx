import { useState } from 'react'
import { LayoutDashboard, TrendingUp, Users, Package, CreditCard, Menu, X, IceCream } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ReactNode
  label: string
  id: string
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
  { icon: <TrendingUp size={20} />, label: 'Financeiro', id: 'financeiro' },
  { icon: <Users size={20} />, label: 'Fornecedores', id: 'fornecedores' },
  { icon: <Package size={20} />, label: 'Custos Fixos', id: 'custos' },
  { icon: <CreditCard size={20} />, label: 'Contas a Pagar', id: 'contas' },
]

interface SidebarProps {
  activeSection: string
  onSectionChange: (id: string) => void
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#E91E63] text-white shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40 flex flex-col transition-transform duration-300',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#FCE4EC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E91E63] rounded-xl flex items-center justify-center shadow-md">
              <IceCream size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">Rosi Sorvetes</h1>
              <p className="text-xs text-[#E91E63] font-medium">Artesanal • Premium</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">Menu Principal</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                activeSection === item.id
                  ? 'bg-[#FCE4EC] text-[#E91E63] shadow-sm'
                  : 'text-gray-600 hover:bg-[#FCE4EC]/50 hover:text-[#E91E63]'
              )}
            >
              <span className={cn(
                'transition-colors',
                activeSection === item.id ? 'text-[#E91E63]' : 'text-gray-400'
              )}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#FCE4EC]">
          <div className="bg-[#FCE4EC] rounded-xl p-3">
            <p className="text-xs font-semibold text-[#E91E63]">Março 2025</p>
            <p className="text-xs text-gray-500 mt-0.5">Dados atualizados agora</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Sistema online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
