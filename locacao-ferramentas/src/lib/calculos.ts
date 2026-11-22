import { diasEntre, hojeISO, somarDias } from '@/lib/format';
import type { Item, Loja, Locacao } from '@/store/tipos';

export type Etapa = 'agendada' | 'em andamento' | 'vence hoje' | 'atrasada' | 'devolvida' | 'cancelada';

export function previsaoDevolucao(l: Pick<Locacao, 'inicio' | 'dias'>) {
  return somarDias(l.inicio, l.dias);
}

/** Soma das diárias de todos os itens da locação (valor de 1 dia). */
export function diariaTotal(l: Pick<Locacao, 'itens'>) {
  return l.itens.reduce((s, i) => s + i.precoDia * i.qtd, 0);
}

export function diasDeAtraso(l: Locacao, hoje = hojeISO()) {
  if (l.situacao !== 'aberta') return 0;
  return Math.max(0, diasEntre(previsaoDevolucao(l), hoje));
}

/** Multa que seria cobrada se a devolução fosse hoje (uma diária por dia de atraso). */
export function multaPrevista(l: Locacao, loja: Loja, hoje = hojeISO()) {
  if (l.situacao !== 'aberta') return l.multa;
  return loja.cobrarAtraso ? diariaTotal(l) * diasDeAtraso(l, hoje) : 0;
}

export function subtotal(l: Pick<Locacao, 'itens' | 'dias'>) {
  return diariaTotal(l) * l.dias;
}

export function totalLocacao(l: Locacao, loja: Loja, hoje = hojeISO()) {
  if (l.situacao === 'cancelada') return 0;
  return Math.max(0, subtotal(l) - l.desconto + l.taxaEntrega + multaPrevista(l, loja, hoje) + (l.avaria ?? 0));
}

export function totalPago(l: Pick<Locacao, 'pagamentos'>) {
  return l.pagamentos.reduce((s, p) => s + p.valor, 0);
}

export function saldoDevedor(l: Locacao, loja: Loja, hoje = hojeISO()) {
  return Math.max(0, Math.round((totalLocacao(l, loja, hoje) - totalPago(l)) * 100) / 100);
}

export function etapaDaLocacao(l: Locacao, hoje = hojeISO()): Etapa {
  if (l.situacao === 'devolvida') return 'devolvida';
  if (l.situacao === 'cancelada') return 'cancelada';
  if (hoje < l.inicio) return 'agendada';
  const previsao = previsaoDevolucao(l);
  if (hoje > previsao) return 'atrasada';
  if (hoje === previsao) return 'vence hoje';
  return 'em andamento';
}

export function estaAberta(l: Locacao) {
  return l.situacao === 'aberta';
}

/**
 * Até quando a locação segura o item. Se está atrasada, o item continua
 * fora até ser devolvido, então conta até amanhã.
 */
function ocupadoAte(l: Locacao, hoje: string) {
  const previsao = previsaoDevolucao(l);
  return previsao > hoje ? previsao : somarDias(hoje, 1);
}

/** Quantas unidades do item estão livres no período [inicio, fim). */
export function unidadesLivres(
  item: Item,
  inicio: string,
  fim: string,
  locacoes: Locacao[],
  hoje = hojeISO(),
  ignorarLocacaoId?: string,
) {
  let ocupadas = 0;
  for (const l of locacoes) {
    if (!estaAberta(l) || l.id === ignorarLocacaoId) continue;
    if (!(inicio < ocupadoAte(l, hoje) && l.inicio < fim)) continue;
    for (const i of l.itens) if (i.itemId === item.id) ocupadas += i.qtd;
  }
  return Math.max(0, item.quantidade - ocupadas);
}

export function mesDe(iso: string) {
  return iso.slice(0, 7);
}
