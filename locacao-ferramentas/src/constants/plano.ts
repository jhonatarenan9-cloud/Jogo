/**
 * Planos de assinatura. O Grátis serve para a locadora conhecer o app de verdade,
 * mas os limites aparecem logo que o negócio começa a girar.
 */
export const LIMITES_GRATIS = {
  itens: 10,
  clientes: 25,
  locacoesPorMes: 15,
} as const;

export const PRECO_PRO = {
  mensal: 39.9,
  anual: 399, // equivale a 10 meses: 2 meses de graça
} as const;

export const DIAS_TESTE = 7;

export const VANTAGENS_PRO = [
  'Itens, clientes e locações sem limite',
  'Relatórios: faturamento por mês, itens mais alugados e quem está devendo',
  'Telefone da sua loja no recibo enviado pelo WhatsApp',
  'Em breve: dados na nuvem e acesso para funcionários',
];
