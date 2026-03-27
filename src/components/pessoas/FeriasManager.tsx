import { Palmtree } from 'lucide-react'
import type { Ferias, Funcionario } from './PessoasSection'

interface FeriasManagerProps {
  ferias: Ferias[]
  funcionarios: Funcionario[]
}

export function FeriasManager({ ferias }: FeriasManagerProps) {
  const alertaColors: Record<string, string> = {
    vencida: 'bg-red-50 border-red-200 text-red-700',
    urgente: 'bg-orange-50 border-orange-200 text-orange-700',
    atencao: 'bg-amber-50 border-amber-200 text-amber-700',
    ok: 'bg-green-50 border-green-200 text-green-700',
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-600' },
    programada: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
    em_andamento: { label: 'Em Andamento', color: 'bg-green-50 text-green-700' },
    concluida: { label: 'Concluida', color: 'bg-gray-50 text-gray-500' },
    vencida: { label: 'Vencida', color: 'bg-red-50 text-red-700' },
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
            <Palmtree size={20} className="text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Controle de Ferias</h3>
            <p className="text-xs text-gray-500">Periodos aquisitivos, programacao e vencimentos</p>
          </div>
        </div>

        {ferias.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhum periodo de ferias cadastrado. Rode o migration_v3c_beneficios_ferias.sql e cadastre os funcionarios primeiro.
          </div>
        ) : (
          <div className="space-y-2">
            {ferias.map(f => {
              const st = statusLabels[f.status] || statusLabels.pendente
              const alertaCor = alertaColors[f.alerta || 'ok']
              return (
                <div key={f.id} className={`p-3 rounded-lg border ${alertaCor}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{f.funcionarioNome}</span>
                      {f.unidadeNome && (
                        <span className="text-xs ml-2 opacity-70">{f.unidadeNome}</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs opacity-80">
                    <span>Aquisitivo: {new Date(f.periodoAquisitivoInicio + 'T12:00:00').toLocaleDateString('pt-BR')} - {new Date(f.periodoAquisitivoFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <span>Limite: {new Date(f.dataLimite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    {f.dataInicio && f.dataFim && (
                      <span>Programada: {new Date(f.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} - {new Date(f.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                    <span>{f.dias} dias</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
