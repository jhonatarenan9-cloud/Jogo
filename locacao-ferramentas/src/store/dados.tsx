import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DIAS_TESTE, LIMITES_GRATIS } from '@/constants/plano';
import { estaAberta, mesDe, multaPrevista } from '@/lib/calculos';
import { formatarData, formatarPreco, hojeISO, somarDias } from '@/lib/format';
import { dadosDeExemplo } from '@/store/exemplo';
import { completarCliente, completarLocacao, DADOS_VAZIOS, migrar } from '@/store/migracao';
import type {
  Cliente,
  Cobranca,
  Contrato,
  Dados,
  FormaPagamento,
  Item,
  Lancamento,
  Locacao,
  Loja,
} from '@/store/tipos';

const CHAVE = 'controle-locacao:v1';

export type Recurso = 'itens' | 'clientes' | 'locacoes';

const LIMITES: Record<Recurso, number> = {
  itens: LIMITES_GRATIS.itens,
  clientes: LIMITES_GRATIS.clientes,
  locacoes: LIMITES_GRATIS.locacoesPorMes,
};

export type NovaLocacao = Pick<
  Locacao,
  'clienteId' | 'itens' | 'inicio' | 'dias' | 'desconto' | 'taxaEntrega' | 'caucao' | 'obs' | 'fotosRetirada'
> & {
  pagamentoInicial?: { valor: number; forma: FormaPagamento };
  /** Se informado, já prepara o contrato com boleto para esse vencimento. */
  contrato?: Pick<Contrato, 'vencimento' | 'valorCobranca'>;
};

export type DadosDevolucao = { avaria: number; avariaDescricao: string; caucaoDevolvida: number; fotos: string[] };

export function novoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function agoraISO() {
  return new Date().toISOString();
}

function comOcorrencia(l: Locacao, texto: string): Locacao {
  return { ...l, historico: [...l.historico, { data: agoraISO(), texto }] };
}

function useDadosInternos() {
  const [carregado, setCarregado] = useState(false);
  const [dados, setDados] = useState<Dados>(DADOS_VAZIOS);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((bruto) => {
        if (bruto) setDados(migrar(JSON.parse(bruto)));
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

  // ---------- Estoque ----------
  const salvarItem = useCallback((item: Omit<Item, 'id' | 'criadoEm'> & { id?: string }) => {
    const id = item.id ?? novoId();
    setDados((d) => {
      const existe = d.itens.some((i) => i.id === id);
      const itens = existe
        ? d.itens.map((i) => (i.id === id ? { ...i, ...item, id } : i))
        : [...d.itens, { ...item, id, criadoEm: agoraISO() }];
      return { ...d, itens };
    });
    return id;
  }, []);

  const excluirItem = useCallback((id: string) => {
    setDados((d) => ({ ...d, itens: d.itens.filter((i) => i.id !== id) }));
  }, []);

  // ---------- Clientes ----------
  const salvarCliente = useCallback((c: Partial<Cliente> & { nome: string }) => {
    const id = c.id ?? novoId();
    setDados((d) => {
      const existe = d.clientes.find((x) => x.id === id);
      const clientes = existe
        ? d.clientes.map((x) => (x.id === id ? { ...x, ...c, id } : x))
        : [...d.clientes, completarCliente({ ...c, id, criadoEm: agoraISO() })];
      return { ...d, clientes };
    });
    return id;
  }, []);

  const excluirCliente = useCallback((id: string) => {
    setDados((d) => ({ ...d, clientes: d.clientes.filter((c) => c.id !== id) }));
  }, []);

  // ---------- Locações ----------
  const criarLocacao = useCallback((nova: NovaLocacao) => {
    const id = novoId();
    setDados((d) => {
      const { pagamentoInicial, contrato, ...resto } = nova;
      const locacao = completarLocacao({
        ...resto,
        id,
        numero: d.proximoNumero,
        pagamentos:
          pagamentoInicial && pagamentoInicial.valor > 0
            ? [{ id: novoId(), valor: pagamentoInicial.valor, forma: pagamentoInicial.forma, data: hojeISO() }]
            : [],
        contrato: contrato ? { ...contrato, etapa: 'rascunho', criadoEm: agoraISO(), simulado: false } : undefined,
        historico: [{ data: agoraISO(), texto: 'Locação registrada' }],
        criadaEm: agoraISO(),
      });
      return { ...d, locacoes: [locacao, ...d.locacoes], proximoNumero: d.proximoNumero + 1 };
    });
    return id;
  }, []);

  /** Altera uma locação. Use para fluxos que precisam de várias mudanças de uma vez. */
  const alterarLocacao = useCallback((id: string, mudar: (l: Locacao, d: Dados) => Locacao) => {
    setDados((d) => ({ ...d, locacoes: d.locacoes.map((l) => (l.id === id ? mudar(l, d) : l)) }));
  }, []);

  const registrarPagamento = useCallback(
    (id: string, valor: number, forma: FormaPagamento, cobrancaId?: string) =>
      alterarLocacao(id, (l) =>
        comOcorrencia(
          { ...l, pagamentos: [...l.pagamentos, { id: novoId(), valor, forma, data: hojeISO(), cobrancaId }] },
          `Pagamento de ${formatarPreco(valor)} (${forma})`,
        ),
      ),
    [alterarLocacao],
  );

  const adicionarFotos = useCallback(
    (id: string, momento: 'retirada' | 'devolucao', fotos: string[]) =>
      alterarLocacao(id, (l) =>
        momento === 'retirada'
          ? { ...l, fotosRetirada: [...l.fotosRetirada, ...fotos] }
          : { ...l, fotosDevolucao: [...l.fotosDevolucao, ...fotos] },
      ),
    [alterarLocacao],
  );

  const removerFoto = useCallback(
    (id: string, momento: 'retirada' | 'devolucao', foto: string) =>
      alterarLocacao(id, (l) =>
        momento === 'retirada'
          ? { ...l, fotosRetirada: l.fotosRetirada.filter((f) => f !== foto) }
          : { ...l, fotosDevolucao: l.fotosDevolucao.filter((f) => f !== foto) },
      ),
    [alterarLocacao],
  );

  const devolver = useCallback(
    (id: string, extra: DadosDevolucao) =>
      alterarLocacao(id, (l, d) => {
        if (!estaAberta(l)) return l;
        const multa = multaPrevista(l, d.loja);
        let texto = 'Itens devolvidos';
        if (multa > 0) texto += ` · multa ${formatarPreco(multa)}`;
        if (extra.avaria > 0) texto += ` · avaria ${formatarPreco(extra.avaria)}`;
        return comOcorrencia(
          {
            ...l,
            multa,
            avaria: extra.avaria,
            avariaDescricao: extra.avariaDescricao,
            caucaoDevolvida: extra.caucaoDevolvida,
            fotosDevolucao: [...l.fotosDevolucao, ...extra.fotos],
            situacao: 'devolvida',
            devolvidaEm: hojeISO(),
          },
          texto,
        );
      }),
    [alterarLocacao],
  );

  const estender = useCallback(
    (id: string, diasExtras: number) =>
      alterarLocacao(id, (l) =>
        estaAberta(l)
          ? comOcorrencia(
              { ...l, dias: l.dias + diasExtras },
              `Prazo estendido em ${diasExtras} ${diasExtras === 1 ? 'dia' : 'dias'} (nova devolução: ${formatarData(somarDias(l.inicio, l.dias + diasExtras))})`,
            )
          : l,
      ),
    [alterarLocacao],
  );

  const cancelar = useCallback(
    (id: string) =>
      alterarLocacao(id, (l) =>
        estaAberta(l)
          ? comOcorrencia(
              {
                ...l,
                situacao: 'cancelada',
                cobrancas: l.cobrancas.map((c) => (c.etapa === 'aguardando' ? { ...c, etapa: 'cancelada' } : c)),
              },
              'Locação cancelada',
            )
          : l,
      ),
    [alterarLocacao],
  );

  // ---------- Contrato e cobrança ----------
  const atualizarContrato = useCallback(
    (id: string, mudanca: Partial<Contrato> & { etapa?: Contrato['etapa'] }, texto?: string) =>
      alterarLocacao(id, (l) => {
        const base: Contrato = l.contrato ?? {
          etapa: 'rascunho',
          vencimento: hojeISO(),
          valorCobranca: 0,
          criadoEm: agoraISO(),
          simulado: false,
        };
        const nova = { ...l, contrato: { ...base, ...mudanca } };
        return texto ? comOcorrencia(nova, texto) : nova;
      }),
    [alterarLocacao],
  );

  const adicionarCobranca = useCallback(
    (id: string, c: Omit<Cobranca, 'id' | 'criadaEm'> & { id?: string }) =>
      alterarLocacao(id, (l) =>
        comOcorrencia(
          { ...l, cobrancas: [...l.cobrancas, { ...c, id: c.id ?? novoId(), criadaEm: agoraISO() }] },
          `Boleto de ${formatarPreco(c.valor)} gerado, vence em ${formatarData(c.vencimento)}`,
        ),
      ),
    [alterarLocacao],
  );

  const atualizarCobranca = useCallback(
    (id: string, cobrancaId: string, mudanca: Partial<Cobranca>, texto?: string) =>
      alterarLocacao(id, (l) => {
        const nova = { ...l, cobrancas: l.cobrancas.map((c) => (c.id === cobrancaId ? { ...c, ...mudanca } : c)) };
        return texto ? comOcorrencia(nova, texto) : nova;
      }),
    [alterarLocacao],
  );

  /** Marca a cobrança como paga e lança o pagamento na locação (uma vez só). */
  const quitarCobranca = useCallback(
    (id: string, cobrancaId: string) =>
      alterarLocacao(id, (l) => {
        const c = l.cobrancas.find((x) => x.id === cobrancaId);
        if (!c || c.etapa === 'paga' || l.pagamentos.some((p) => p.cobrancaId === cobrancaId)) return l;
        return comOcorrencia(
          {
            ...l,
            cobrancas: l.cobrancas.map((x) => (x.id === cobrancaId ? { ...x, etapa: 'paga', pagaEm: hojeISO() } : x)),
            pagamentos: [...l.pagamentos, { id: novoId(), valor: c.valor, forma: 'Boleto', data: hojeISO(), cobrancaId }],
          },
          `Boleto de ${formatarPreco(c.valor)} pago`,
        );
      }),
    [alterarLocacao],
  );

  // ---------- Financeiro ----------
  const salvarLancamento = useCallback((l: Omit<Lancamento, 'id' | 'criadoEm'> & { id?: string }) => {
    const id = l.id ?? novoId();
    setDados((d) => {
      const existe = d.lancamentos.some((x) => x.id === id);
      const lancamentos = existe
        ? d.lancamentos.map((x) => (x.id === id ? { ...x, ...l, id } : x))
        : [...d.lancamentos, { ...l, id, criadoEm: agoraISO() }];
      return { ...d, lancamentos };
    });
    return id;
  }, []);

  const excluirLancamento = useCallback((id: string) => {
    setDados((d) => ({ ...d, lancamentos: d.lancamentos.filter((x) => x.id !== id) }));
  }, []);

  // ---------- Loja, plano e dados ----------
  const salvarLoja = useCallback((loja: Loja) => setDados((d) => ({ ...d, loja })), []);

  const iniciarTeste = useCallback(() => {
    setDados((d) => (d.plano.testeAte ? d : { ...d, plano: { ...d.plano, testeAte: somarDias(hojeISO(), DIAS_TESTE) } }));
  }, []);

  const carregarExemplo = useCallback(() => setDados((d) => dadosDeExemplo(d)), []);

  /** Apaga o cadastro e o histórico, mas mantém o plano (não reinicia o teste grátis). */
  const apagarTudo = useCallback(() => setDados((d) => ({ ...DADOS_VAZIOS, plano: d.plano })), []);

  /** Usado pela sincronização com a nuvem para aplicar o que veio do servidor. */
  const aplicarDados = useCallback((mudar: (d: Dados) => Dados) => setDados(mudar), []);

  return {
    carregado,
    dados,
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
    alterarLocacao,
    registrarPagamento,
    adicionarFotos,
    removerFoto,
    devolver,
    estender,
    cancelar,
    atualizarContrato,
    adicionarCobranca,
    atualizarCobranca,
    quitarCobranca,
    salvarLancamento,
    excluirLancamento,
    salvarLoja,
    iniciarTeste,
    carregarExemplo,
    apagarTudo,
    aplicarDados,
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
