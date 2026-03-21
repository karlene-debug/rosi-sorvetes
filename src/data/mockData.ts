export const kpiData = {
  receitaMensal: 28450.00,
  despesasMensais: 18320.00,
  lucroLiquido: 10130.00,
  margemLucro: 35.6,
  receitaVariacao: 12.4,
  despesasVariacao: 5.2,
  lucroVariacao: 18.7,
  margemVariacao: 2.1,
};

export const receitasDespesas = [
  { mes: 'Out/24', receitas: 21200, despesas: 15800 },
  { mes: 'Nov/24', receitas: 24500, despesas: 16200 },
  { mes: 'Dez/24', receitas: 32800, despesas: 19500 },
  { mes: 'Jan/25', receitas: 18900, despesas: 14200 },
  { mes: 'Fev/25', receitas: 22100, despesas: 16800 },
  { mes: 'Mar/25', receitas: 28450, despesas: 18320 },
];

export const fornecedores = [
  { id: 1, nome: 'LaticíniosVale Ltda', produto: 'Leite integral e creme', valor: 3200.00, vencimento: '2025-03-25', status: 'pago' },
  { id: 2, nome: 'Açúcar Premium SP', produto: 'Açúcar refinado (50kg)', valor: 890.00, vencimento: '2025-03-28', status: 'pendente' },
  { id: 3, nome: 'FrutalBrasil Com.', produto: 'Polpa de frutas tropicais', valor: 1450.00, vencimento: '2025-04-02', status: 'pendente' },
  { id: 4, nome: 'EmbalagensArt Ind.', produto: 'Potes e embalagens', valor: 720.00, vencimento: '2025-03-30', status: 'pago' },
  { id: 5, nome: 'ChocolatesFinos', produto: 'Chocolate belga 70%', valor: 2100.00, vencimento: '2025-04-05', status: 'atrasado' },
  { id: 6, nome: 'NozesImport.', produto: 'Castanhas e nozes mistas', valor: 680.00, vencimento: '2025-04-08', status: 'pendente' },
  { id: 7, nome: 'EquipFrio Serv.', produto: 'Manutenção freezers', valor: 450.00, vencimento: '2025-03-22', status: 'atrasado' },
  { id: 8, nome: 'SaborNatural', produto: 'Essências e aromas', valor: 380.00, vencimento: '2025-04-10', status: 'pago' },
];

export const custosFixos = [
  { id: 1, categoria: 'Aluguel', descricao: 'Ponto comercial Rua das Flores, 142', valor: 3500.00, icone: 'building' },
  { id: 2, categoria: 'Energia Elétrica', descricao: 'Consumo médio mensal + freezers', valor: 1850.00, icone: 'zap' },
  { id: 3, categoria: 'Funcionários', descricao: '3 atendentes + 1 confeiteira', valor: 8200.00, icone: 'users' },
  { id: 4, categoria: 'Insumos Básicos', descricao: 'Ingredientes essenciais mensais', valor: 4200.00, icone: 'package' },
  { id: 5, categoria: 'Internet / Telefone', descricao: 'Plano empresarial + sistema PDV', valor: 290.00, icone: 'wifi' },
  { id: 6, categoria: 'Contador', descricao: 'Serviços contábeis mensais', valor: 480.00, icone: 'calculator' },
];

export const contasAPagar = [
  { id: 1, descricao: 'Aluguel Março/2025', valor: 3500.00, vencimento: '2025-03-25', categoria: 'Aluguel', status: 'pendente' },
  { id: 2, descricao: 'DARF Simples Nacional', valor: 1240.00, vencimento: '2025-03-20', categoria: 'Impostos', status: 'atrasado' },
  { id: 3, descricao: 'Fornecedor Chocolates', valor: 2100.00, vencimento: '2025-04-05', categoria: 'Fornecedores', status: 'pendente' },
  { id: 4, descricao: 'Energia Elétrica Mar/25', valor: 1850.00, vencimento: '2025-03-28', categoria: 'Utilities', status: 'pendente' },
  { id: 5, descricao: 'Salários Março/2025', valor: 8200.00, vencimento: '2025-03-31', categoria: 'Folha', status: 'pendente' },
  { id: 6, descricao: 'Seguro equipamentos', valor: 320.00, vencimento: '2025-04-01', categoria: 'Seguros', status: 'pendente' },
  { id: 7, descricao: 'Manutenção freezers', valor: 450.00, vencimento: '2025-03-22', categoria: 'Manutenção', status: 'atrasado' },
  { id: 8, descricao: 'Sistema PDV mensal', valor: 189.00, vencimento: '2025-04-05', categoria: 'Software', status: 'pago' },
];
