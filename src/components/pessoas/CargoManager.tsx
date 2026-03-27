import { useState } from 'react'
import { Briefcase, ChevronDown, ChevronUp } from 'lucide-react'
import type { Cargo } from './PessoasSection'

const departamentoLabels: Record<string, string> = {
  producao: 'Producao',
  atendimento: 'Atendimento',
  administrativo: 'Administrativo',
  limpeza: 'Limpeza',
  gestao: 'Gestao',
}

interface CargoManagerProps {
  cargos: Cargo[]
}

export function CargoManager({ cargos }: CargoManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Briefcase size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Cargos e Descricao de Atividades</h3>
            <p className="text-xs text-gray-500">{cargos.length} cargo(s) cadastrado(s)</p>
          </div>
        </div>

        <div className="space-y-2">
          {cargos.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum cargo cadastrado. Rode o migration_v3_pessoas.sql.
            </div>
          ) : (
            cargos.map(c => (
              <div key={c.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{c.nome}</span>
                    {c.departamento && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {departamentoLabels[c.departamento] || c.departamento}
                      </span>
                    )}
                    {(c.faixaSalarialMin || c.faixaSalarialMax) && (
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {c.faixaSalarialMin ? `R$ ${c.faixaSalarialMin.toLocaleString('pt-BR')}` : ''}
                        {c.faixaSalarialMin && c.faixaSalarialMax ? ' - ' : ''}
                        {c.faixaSalarialMax ? `R$ ${c.faixaSalarialMax.toLocaleString('pt-BR')}` : ''}
                      </span>
                    )}
                  </div>
                  {expandedId === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {expandedId === c.id && c.descricaoAtividades && (
                  <div className="px-4 pb-3 border-t border-gray-50">
                    <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Descricao de Atividades:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{c.descricaoAtividades}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
