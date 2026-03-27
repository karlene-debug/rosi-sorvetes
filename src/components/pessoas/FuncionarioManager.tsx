import { useState } from 'react'
import { UserPlus, Users, Phone, Mail, CheckCircle } from 'lucide-react'
import type { Cargo, Funcionario } from './PessoasSection'
import type { Unidade } from '@/data/productTypes'

const tipoContratoLabels: Record<string, string> = {
  clt: 'CLT',
  diarista: 'Diarista',
  socio: 'Socio(a)',
  pj: 'PJ',
  estagiario: 'Estagiario',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'bg-green-50 text-green-700' },
  inativo: { label: 'Inativo', color: 'bg-gray-100 text-gray-500' },
  ferias: { label: 'Ferias', color: 'bg-blue-50 text-blue-700' },
  afastado: { label: 'Afastado', color: 'bg-amber-50 text-amber-700' },
}

interface FuncionarioManagerProps {
  funcionarios: Funcionario[]
  cargos: Cargo[]
  unidades: Unidade[]
  onAdd: (f: Omit<Funcionario, 'id' | 'cargoNome' | 'unidadeNome'>) => Promise<void>
}

export function FuncionarioManager({ funcionarios, cargos, unidades, onAdd }: FuncionarioManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cargoId: '',
    unidadeId: '',
    dataAdmissao: '',
    salario: '',
    tipoContrato: 'clt',
    jornada: '',
    observacao: '',
  })

  const handleSubmit = async () => {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      await onAdd({
        nome: form.nome.trim(),
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        cargoId: form.cargoId || undefined,
        unidadeId: form.unidadeId || undefined,
        dataAdmissao: form.dataAdmissao || undefined,
        salario: form.salario ? parseFloat(form.salario) : undefined,
        tipoContrato: form.tipoContrato || undefined,
        jornada: form.jornada || undefined,
        status: 'ativo',
        observacao: form.observacao || undefined,
      })
      setForm({ nome: '', cpf: '', telefone: '', email: '', cargoId: '', unidadeId: '', dataAdmissao: '', salario: '', tipoContrato: 'clt', jornada: '', observacao: '' })
      setShowForm(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar funcionario:', err)
    } finally {
      setSaving(false)
    }
  }

  const ativos = funcionarios.filter(f => f.status === 'ativo')

  return (
    <div className="space-y-4">
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-medium text-green-800">Funcionario cadastrado com sucesso!</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Equipe</h3>
              <p className="text-xs text-gray-500">{ativos.length} ativo(s) de {funcionarios.length} total</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <UserPlus size={16} />
            Novo Funcionario
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                <input type="text" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input type="text" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
                <select value={form.cargoId} onChange={e => setForm({...form, cargoId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  <option value="">Selecione...</option>
                  {cargos.filter(c => c.status === 'ativo').map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                <select value={form.unidadeId} onChange={e => setForm({...form, unidadeId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  <option value="">Selecione...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Contrato</label>
                <select value={form.tipoContrato} onChange={e => setForm({...form, tipoContrato: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300">
                  {Object.entries(tipoContratoLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Admissao</label>
                <input type="date" value={form.dataAdmissao} onChange={e => setForm({...form, dataAdmissao: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salario (R$)</label>
                <input type="number" step="0.01" value={form.salario} onChange={e => setForm({...form, salario: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="0,00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jornada</label>
                <input type="text" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" placeholder="Ex: Seg-Sab 09-18h" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observacao</label>
              <textarea value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-300" rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={handleSubmit} disabled={!form.nome.trim() || saving}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {funcionarios.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Nenhum funcionario cadastrado. Rode o migration_v3_pessoas.sql e cadastre a equipe.
            </div>
          ) : (
            funcionarios.map(f => (
              <div key={f.id} className={`flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors ${f.status !== 'ativo' ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{f.nome}</span>
                    {f.cargoNome && (
                      <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">{f.cargoNome}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {f.unidadeNome && (
                      <span className="text-xs text-gray-400">{f.unidadeNome}</span>
                    )}
                    {f.telefone && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={10} /> {f.telefone}
                      </span>
                    )}
                    {f.email && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
                        <Mail size={10} /> {f.email}
                      </span>
                    )}
                    {f.tipoContrato && (
                      <span className="text-xs text-gray-400">{tipoContratoLabels[f.tipoContrato] || f.tipoContrato}</span>
                    )}
                    {f.salario && (
                      <span className="text-xs text-green-600 hidden sm:block">R$ {f.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusLabels[f.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                  {statusLabels[f.status]?.label || f.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
