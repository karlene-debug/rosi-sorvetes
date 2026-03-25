import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { KPICards } from '@/components/KPICards'
import { RevenueChart } from '@/components/RevenueChart'
import { FixedCosts } from '@/components/FixedCosts'
import { AccountsPayable } from '@/components/AccountsPayable'
import { EstoqueSection } from '@/components/estoque/EstoqueSection'
import { FinanceiroSection } from '@/components/financeiro/FinanceiroSection'
import { Bell, Search, IceCream } from 'lucide-react'

function App() {
  const [activeSection, setActiveSection] = useState('dashboard')

  const sectionTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Visao geral do negocio' },
    estoque: { title: 'Estoque de Sorvetes', subtitle: 'Controle de producao, saidas e saldo por sabor' },
    financeiro: { title: 'Financeiro', subtitle: 'Contas a pagar, custos fixos, fornecedores e plano de contas' },
  }

  const current = sectionTitles[activeSection] || sectionTitles.dashboard

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-lg font-bold text-gray-800">{current.title}</h1>
              <p className="text-xs text-gray-500 hidden sm:block">{current.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:border-[#F8BBD0] w-48"
                />
              </div>
              <button className="relative p-2 rounded-xl hover:bg-[#FCE4EC] transition-colors">
                <Bell size={20} className="text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E91E63] rounded-full"></span>
              </button>
              <div className="w-8 h-8 bg-[#E91E63] rounded-xl flex items-center justify-center cursor-pointer">
                <IceCream size={16} className="text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <>
              <KPICards />
              <RevenueChart />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <FixedCosts />
                <AccountsPayable />
              </div>
            </>
          )}

          {/* Estoque */}
          {activeSection === 'estoque' && (
            <EstoqueSection />
          )}

          {/* Financeiro */}
          {activeSection === 'financeiro' && (
            <FinanceiroSection />
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-100 mt-6">
          <p className="text-xs text-gray-400 text-center">
            © 2025 Rosi Sorvetes Artesanal · Plataforma de Gestao · Todos os direitos reservados
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
