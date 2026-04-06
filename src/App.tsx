import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { DashboardExecutivo } from '@/components/DashboardExecutivo'
import { EstoqueSection } from '@/components/estoque/EstoqueSection'
import { FinanceiroSection } from '@/components/financeiro/FinanceiroSection'
import { PessoasSection } from '@/components/pessoas/PessoasSection'
import { Bell, Search, IceCream, MapPin } from 'lucide-react'
import type { Unidade } from '@/data/productTypes'
import * as dbV2 from '@/lib/database_v2'

const validSections = ['dashboard', 'estoque', 'financeiro', 'pessoas']

function getHashSection(): string {
  const hash = window.location.hash.replace('#', '').split('/')[0]
  return validSections.includes(hash) ? hash : 'dashboard'
}

function App() {
  const [activeSection, setActiveSection] = useState(getHashSection)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('todas')

  // Sincronizar hash com navegacao
  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section)
    window.location.hash = section
  }, [])

  // Ouvir mudancas no hash (botao voltar do navegador)
  useEffect(() => {
    const onHashChange = () => setActiveSection(getHashSection())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    dbV2.fetchUnidades()
      .then(u => setUnidades(u))
      .catch(() => {})
  }, [])

  const sectionTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Visao geral do negocio' },
    estoque: { title: 'Estoque', subtitle: 'Controle de producao, saidas e saldo por produto' },
    financeiro: { title: 'Financeiro', subtitle: 'Contas a pagar, custos fixos, fornecedores e plano de contas' },
    pessoas: { title: 'Pessoas', subtitle: 'Gestao de equipe, cargos e ocorrencias' },
  }

  const current = sectionTitles[activeSection] || sectionTitles.dashboard

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

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
              {/* Seletor de Unidade */}
              {unidades.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FCE4EC] rounded-xl">
                  <MapPin size={14} className="text-[#E91E63]" />
                  <select
                    value={unidadeSelecionada}
                    onChange={e => setUnidadeSelecionada(e.target.value)}
                    className="bg-transparent text-sm font-medium text-[#E91E63] focus:outline-none cursor-pointer"
                  >
                    <option value="todas">Todas as unidades</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}
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
          {activeSection === 'dashboard' && (
            <DashboardExecutivo unidades={unidades} unidadeSelecionada={unidadeSelecionada} />
          )}
          {activeSection === 'estoque' && (
            <EstoqueSection />
          )}
          {activeSection === 'financeiro' && (
            <FinanceiroSection unidades={unidades} />
          )}
          {activeSection === 'pessoas' && (
            <PessoasSection unidades={unidades} />
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-100 mt-6">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Rosi Sorvetes Artesanal · Plataforma de Gestao
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
