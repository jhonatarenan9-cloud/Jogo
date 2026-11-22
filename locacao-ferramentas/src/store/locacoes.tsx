import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { buscarFerramenta } from '@/data/ferramentas';
import { hojeISO, somarDias } from '@/lib/format';
import { calcularOrcamento } from '@/lib/preco';

export type Locacao = {
  id: string;
  ferramentaId: string;
  inicio: string; // AAAA-MM-DD
  dias: number;
  entrega: boolean;
  total: number;
  caucao: number;
  situacao: 'confirmada' | 'devolvida' | 'cancelada';
  criadaEm: string;
};

export type Perfil = {
  nome: string;
  telefone: string;
  endereco: string;
};

export type Etapa = 'agendada' | 'em andamento' | 'atrasada' | 'devolvida' | 'cancelada';

type NovaLocacao = { ferramentaId: string; inicio: string; dias: number; entrega: boolean };

type Contexto = {
  carregado: boolean;
  locacoes: Locacao[];
  perfil: Perfil;
  salvarPerfil: (p: Perfil) => void;
  alugar: (n: NovaLocacao) => Locacao;
  devolver: (id: string) => void;
  cancelar: (id: string) => void;
  disponiveis: (ferramentaId: string, inicio: string, dias: number) => number;
};

const CHAVE = 'locacao-ferramentas:v1';
const PERFIL_VAZIO: Perfil = { nome: '', telefone: '', endereco: '' };

const LocacoesContext = createContext<Contexto | null>(null);

export function fimDaLocacao(l: Pick<Locacao, 'inicio' | 'dias'>) {
  return somarDias(l.inicio, l.dias);
}

export function etapaDaLocacao(l: Locacao, hoje = hojeISO()): Etapa {
  if (l.situacao !== 'confirmada') return l.situacao;
  if (hoje < l.inicio) return 'agendada';
  if (hoje > fimDaLocacao(l)) return 'atrasada';
  return 'em andamento';
}

function seSobrepoem(aInicio: string, aFim: string, bInicio: string, bFim: string) {
  return aInicio < bFim && bInicio < aFim;
}

export function LocacoesProvider({ children }: { children: ReactNode }) {
  const [carregado, setCarregado] = useState(false);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_VAZIO);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((bruto) => {
        if (!bruto) return;
        const dados = JSON.parse(bruto);
        if (Array.isArray(dados.locacoes)) setLocacoes(dados.locacoes);
        if (dados.perfil) setPerfil({ ...PERFIL_VAZIO, ...dados.perfil });
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  useEffect(() => {
    if (!carregado) return;
    AsyncStorage.setItem(CHAVE, JSON.stringify({ locacoes, perfil })).catch(() => {});
  }, [carregado, locacoes, perfil]);

  const disponiveis = useCallback(
    (ferramentaId: string, inicio: string, dias: number) => {
      const ferramenta = buscarFerramenta(ferramentaId);
      if (!ferramenta) return 0;
      const fim = somarDias(inicio, dias);
      const ocupadas = locacoes.filter(
        (l) =>
          l.ferramentaId === ferramentaId &&
          l.situacao === 'confirmada' &&
          seSobrepoem(inicio, fim, l.inicio, fimDaLocacao(l)),
      ).length;
      return Math.max(0, ferramenta.estoque - ocupadas);
    },
    [locacoes],
  );

  const alugar = useCallback((n: NovaLocacao) => {
    const ferramenta = buscarFerramenta(n.ferramentaId);
    if (!ferramenta) throw new Error('Ferramenta não encontrada');
    const { total } = calcularOrcamento(ferramenta.precoDia, n.dias, n.entrega);
    const nova: Locacao = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      total,
      caucao: ferramenta.caucao,
      situacao: 'confirmada',
      criadaEm: new Date().toISOString(),
    };
    setLocacoes((atual) => [nova, ...atual]);
    return nova;
  }, []);

  const mudarSituacao = useCallback((id: string, situacao: Locacao['situacao']) => {
    setLocacoes((atual) => atual.map((l) => (l.id === id ? { ...l, situacao } : l)));
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      carregado,
      locacoes,
      perfil,
      salvarPerfil: setPerfil,
      alugar,
      devolver: (id) => mudarSituacao(id, 'devolvida'),
      cancelar: (id) => mudarSituacao(id, 'cancelada'),
      disponiveis,
    }),
    [carregado, locacoes, perfil, alugar, mudarSituacao, disponiveis],
  );

  return <LocacoesContext.Provider value={valor}>{children}</LocacoesContext.Provider>;
}

export function useLocacoes() {
  const ctx = useContext(LocacoesContext);
  if (!ctx) throw new Error('useLocacoes precisa estar dentro de LocacoesProvider');
  return ctx;
}
