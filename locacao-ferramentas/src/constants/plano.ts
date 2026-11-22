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
  'Contrato com assinatura eletrônica enviado pelo WhatsApp',
  'Boleto automático quando o cliente assina, com negativação no Serasa se não pagar',
  'Itens, clientes e locações sem limite',
  'Relatórios de faturamento, itens mais alugados e devedores',
];
