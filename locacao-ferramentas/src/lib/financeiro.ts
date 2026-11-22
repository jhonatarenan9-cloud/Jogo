import { mesDe, saldoDevedor } from '@/lib/calculos';
import type { Cliente, Dados, FormaPagamento, Loja } from '@/store/tipos';

export type Movimento = {
  id: string;
  data: string; // AAAA-MM-DD
  descricao: string;
  detalhe: string;
  valor: number; // sempre positivo
  tipo: 'entrada' | 'saida';
  forma?: FormaPagamento;
  categoria: string;
  locacaoId?: string;
  lancamentoId?: string;
};

type Base = Pick<Dados, 'locacoes' | 'lancamentos' | 'clientes'>;

/** Tudo que entrou e saiu de dinheiro no mês (AAAA-MM). */
export function movimentosDoMes(d: Base, mes: string): Movimento[] {
  const nomes = new Map(d.clientes.map((c: Cliente) => [c.id, c.nome]));
  const lista: Movimento[] = [];
  for (const l of d.locacoes) {
    for (const p of l.pagamentos) {
      if (mesDe(p.data) !== mes) continue;
      lista.push({
        id: `p-${p.id}`,
        data: p.data,
        descricao: `Locação nº ${l.numero}`,
        detalhe: nomes.get(l.clienteId) ?? 'Cliente removido',
        valor: p.valor,
        tipo: 'entrada',
        forma: p.forma,
        categoria: 'Locações',
        locacaoId: l.id,
      });
    }
  }
  for (const x of d.lancamentos) {
    if (!x.pagoEm || mesDe(x.pagoEm) !== mes) continue;
    lista.push({
      id: `l-${x.id}`,
      data: x.pagoEm,
      descricao: x.descricao,
      detalhe: x.categoria,
      valor: x.valor,
      tipo: x.tipo === 'despesa' ? 'saida' : 'entrada',
      forma: x.forma,
      categoria: x.categoria,
      lancamentoId: x.id,
    });
  }
  return lista.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

function somarPor(lista: Movimento[], chave: (m: Movimento) => string) {
  const mapa = new Map<string, number>();
  for (const m of lista) mapa.set(chave(m), (mapa.get(chave(m)) ?? 0) + m.valor);
  return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}

export function resumoDoMes(d: Base, mes: string) {
  const movs = movimentosDoMes(d, mes);
  const entradas = movs.filter((m) => m.tipo === 'entrada');
  const saidas = movs.filter((m) => m.tipo === 'saida');
  const totalEntradas = entradas.reduce((s, m) => s + m.valor, 0);
  const totalSaidas = saidas.reduce((s, m) => s + m.valor, 0);
  return {
    movimentos: movs,
    entradas: totalEntradas,
    saidas: totalSaidas,
    resultado: totalEntradas - totalSaidas,
    porForma: somarPor(entradas, (m) => m.forma ?? 'Outros'),
    porCategoria: somarPor(saidas, (m) => m.categoria),
  };
}

/** O que falta receber (saldo das locações e receitas avulsas não recebidas). */
export function contasAReceber(d: Base, loja: Loja, hoje: string) {
  const locacoes = d.locacoes
    .map((l) => ({ l, saldo: saldoDevedor(l, loja, hoje) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
  const avulsas = d.lancamentos.filter((x) => x.tipo === 'receita' && !x.pagoEm);
  const total = locacoes.reduce((s, x) => s + x.saldo, 0) + avulsas.reduce((s, x) => s + x.valor, 0);
  return { locacoes, avulsas, total };
}

/** Despesas ainda não pagas, das mais antigas para as mais novas. */
export function contasAPagar(d: Base, hoje: string) {
  const lista = d.lancamentos
    .filter((x) => x.tipo === 'despesa' && !x.pagoEm)
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1));
  return {
    lista,
    total: lista.reduce((s, x) => s + x.valor, 0),
    vencidas: lista.filter((x) => x.vencimento < hoje),
  };
}

export function mesAnterior(mes: string, n = 1) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
