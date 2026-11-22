import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DIAS_TESTE, LIMITES_GRATIS } from '@/constants/plano';
import { estaAberta, mesDe, multaPrevista } from '@/lib/calculos';
import { hojeISO, somarDias } from '@/lib/format';
import { dadosDeExemplo } from '@/store/exemplo';
import type { Cliente, Dados, FormaPagamento, Item, Locacao, Loja } from '@/store/tipos';

const CHAVE = 'controle-locacao:v1';

const LIMITES: Record<Recurso, number> = {
  itens: LIMITES_GRATIS.itens,
  clientes: LIMITES_GRATIS.clientes,
  locacoes: LIMITES_GRATIS.locacoesPorMes,
};

const VAZIO: Dados = {
  versao: 1,
  itens: [],
  clientes: [],
  locacoes: [],
  loja: { nome: '', telefone: '', cobrarAtraso: true },
  plano: {},
  proximoNumero: 1,
};

export type Recurso = 'itens' | 'clientes' | 'locacoes';

export type NovaLocacao = Omit<Locacao, 'id' | 'numero' | 'pagamentos' | 'situacao' | 'multa' | 'criadaEm'> & {
  pagamentoInicial?: { valor: number; forma: FormaPagamento };
};

function novoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function useDadosInternos() {
  const [carregado, setCarregado] = useState(false);
  const [dados, setDados] = useState<Dados>(VAZIO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((bruto) => {
        if (!bruto) return;
        const salvo = JSON.parse(bruto) as Partial<Dados>;
        setDados({
          ...VAZIO,
          ...salvo,
          loja: { ...VAZIO.loja, ...salvo.loja },
          plano: { ...salvo.plano },
        });
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  useEffect(() => {
    if (carregado) AsyncStorage.setItem(CHAVE, JSON.stringify(dados)).catch(() => {});
  }, [carregado, dados]);

  const hoje = hojeISO();
  const { plano } = dados;
  const proAtivo = !!plano.proAte && plano.proAte >= hoje;
  const emTeste = !proAtivo && !!plano.testeAte && plano.testeAte >= hoje;
  const ehPro = proAtivo || emTeste;

  const uso = useMemo(
    () => ({
      itens: dados.itens.length,
      clientes: dados.clientes.length,
      locacoes: dados.locacoes.filter((l) => mesDe(l.criadaEm) === mesDe(hoje)).length,
    }),
    [dados.itens.length, dados.clientes.length, dados.locacoes, hoje],
  );

  const podeCriar = useCallback((r: Recurso) => ehPro || uso[r] < LIMITES[r], [ehPro, uso]);

  const salvarItem = useCallback((item: Omit<Item, 'id' | 'criadoEm'> & { id?: string }) => {
    const id = item.id ?? novoId();
    setDados((d) => {
      const existe = d.itens.some((i) => i.id === id);
      const itens = existe
        ? d.itens.map((i) => (i.id === id ? { ...i, ...item, id } : i))
        : [...d.itens, { ...item, id, criadoEm: new Date().toISOString() }];
      return { ...d, itens };
    });
    return id;
  }, []);

  const excluirItem = useCallback((id: string) => {
    setDados((d) => ({ ...d, itens: d.itens.filter((i) => i.id !== id) }));
  }, []);

  const salvarCliente = useCallback((c: Omit<Cliente, 'id' | 'criadoEm'> & { id?: string }) => {
    const id = c.id ?? novoId();
    setDados((d) => {
      const existe = d.clientes.some((x) => x.id === id);
      const clientes = existe
        ? d.clientes.map((x) => (x.id === id ? { ...x, ...c, id } : x))
        : [...d.clientes, { ...c, id, criadoEm: new Date().toISOString() }];
      return { ...d, clientes };
    });
    return id;
  }, []);

  const excluirCliente = useCallback((id: string) => {
    setDados((d) => ({ ...d, clientes: d.clientes.filter((c) => c.id !== id) }));
  }, []);

  const criarLocacao = useCallback((nova: NovaLocacao) => {
    const id = novoId();
    setDados((d) => {
      const { pagamentoInicial, ...resto } = nova;
      const locacao: Locacao = {
        ...resto,
        id,
        numero: d.proximoNumero,
        pagamentos:
          pagamentoInicial && pagamentoInicial.valor > 0
            ? [{ id: novoId(), valor: pagamentoInicial.valor, forma: pagamentoInicial.forma, data: hojeISO() }]
            : [],
        situacao: 'aberta',
        multa: 0,
        criadaEm: new Date().toISOString(),
      };
      return { ...d, locacoes: [locacao, ...d.locacoes], proximoNumero: d.proximoNumero + 1 };
    });
    return id;
  }, []);

  const alterarLocacao = useCallback((id: string, mudar: (l: Locacao, d: Dados) => Locacao) => {
    setDados((d) => ({ ...d, locacoes: d.locacoes.map((l) => (l.id === id ? mudar(l, d) : l)) }));
  }, []);

  const registrarPagamento = useCallback(
    (id: string, valor: number, forma: FormaPagamento) =>
      alterarLocacao(id, (l) => ({
        ...l,
        pagamentos: [...l.pagamentos, { id: novoId(), valor, forma, data: hojeISO() }],
      })),
    [alterarLocacao],
  );

  const devolver = useCallback(
    (id: string) =>
      alterarLocacao(id, (l, d) =>
        estaAberta(l)
          ? { ...l, multa: multaPrevista(l, d.loja), situacao: 'devolvida', devolvidaEm: hojeISO() }
          : l,
      ),
    [alterarLocacao],
  );

  const cancelar = useCallback(
    (id: string) => alterarLocacao(id, (l) => (estaAberta(l) ? { ...l, situacao: 'cancelada' } : l)),
    [alterarLocacao],
  );

  const salvarLoja = useCallback((loja: Loja) => setDados((d) => ({ ...d, loja })), []);

  const iniciarTeste = useCallback(() => {
    setDados((d) =>
      d.plano.testeAte ? d : { ...d, plano: { ...d.plano, testeAte: somarDias(hojeISO(), DIAS_TESTE) } },
    );
  }, []);

  const carregarExemplo = useCallback(() => setDados((d) => dadosDeExemplo(d)), []);

  /** Apaga o cadastro e o histórico, mas mantém o plano (não reinicia o teste grátis). */
  const apagarTudo = useCallback(() => setDados((d) => ({ ...VAZIO, plano: d.plano })), []);

  return {
    carregado,
    ...dados,
    hoje,
    ehPro,
    proAtivo,
    emTeste,
    uso,
    limites: LIMITES,
    podeCriar,
    salvarItem,
    excluirItem,
    salvarCliente,
    excluirCliente,
    criarLocacao,
    registrarPagamento,
    devolver,
    cancelar,
    salvarLoja,
    iniciarTeste,
    carregarExemplo,
    apagarTudo,
  };
}

type Contexto = ReturnType<typeof useDadosInternos>;
const DadosContext = createContext<Contexto | null>(null);

export function DadosProvider({ children }: { children: ReactNode }) {
  const valor = useDadosInternos();
  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>;
}

export function useDados() {
  const ctx = useContext(DadosContext);
  if (!ctx) throw new Error('useDados precisa estar dentro de DadosProvider');
  return ctx;
}
