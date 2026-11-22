import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ehFotoLocal, enviarFoto } from '@/lib/fotos-nuvem';
import { supabase } from '@/lib/supabase';
import { useDados } from '@/store/dados';
import { completarCliente, completarItem, completarLocacao, LOJA_PADRAO } from '@/store/migracao';
import type { Dados } from '@/store/tipos';

/**
 * Sincronização com o Supabase. Cada item, cliente, locação e lançamento vira
 * um registro no servidor. O app envia o que mudou aqui e recebe, em tempo real,
 * o que mudou em outros celulares ou no servidor (assinatura, pagamento do boleto).
 */

type Tipo = 'item' | 'cliente' | 'locacao' | 'lancamento' | 'loja';
type Registro = { tipo: Tipo; id: string; dados: unknown; excluido: boolean; atualizado_em: string };

export type LojaNuvem = { id: string; nome: string; codigo_convite: string; pro_ate: string | null; teste_ate: string | null };
export type Situacao = 'desligado' | 'sem-conta' | 'sem-loja' | 'sincronizando' | 'em-dia' | 'erro';

const COLECOES: { tipo: Tipo; campo: 'itens' | 'clientes' | 'locacoes' | 'lancamentos' }[] = [
  { tipo: 'item', campo: 'itens' },
  { tipo: 'cliente', campo: 'clientes' },
  { tipo: 'locacao', campo: 'locacoes' },
  { tipo: 'lancamento', campo: 'lancamentos' },
];

const chave = (tipo: string, id: string) => `${tipo}:${id}`;

/** Lista todos os registros do app no formato do servidor. */
function registrosDe(d: Dados) {
  const lista: { tipo: Tipo; id: string; dados: unknown }[] = [];
  for (const { tipo, campo } of COLECOES) for (const r of d[campo]) lista.push({ tipo, id: r.id, dados: r });
  lista.push({ tipo: 'loja', id: 'loja', dados: d.loja });
  return lista;
}

/** Aplica o que veio do servidor nos dados do app. */
function aplicar(d: Dados, regs: Registro[]): Dados {
  const novo: Dados = { ...d, itens: [...d.itens], clientes: [...d.clientes], locacoes: [...d.locacoes], lancamentos: [...d.lancamentos] };
  for (const r of regs) {
    if (r.tipo === 'loja') {
      if (!r.excluido) novo.loja = { ...LOJA_PADRAO, ...(r.dados as object) };
      continue;
    }
    const col = COLECOES.find((c) => c.tipo === r.tipo);
    if (!col) continue;
    const lista = novo[col.campo] as { id: string }[];
    const i = lista.findIndex((x) => x.id === r.id);
    if (r.excluido) {
      if (i >= 0) lista.splice(i, 1);
      continue;
    }
    const completo =
      r.tipo === 'item'
        ? completarItem(r.dados as object)
        : r.tipo === 'cliente'
          ? completarCliente(r.dados as object)
          : r.tipo === 'locacao'
            ? completarLocacao(r.dados as object)
            : (r.dados as { id: string });
    if (i >= 0) lista[i] = completo;
    else lista.push(completo);
  }
  const maior = novo.locacoes.reduce((m, l) => Math.max(m, l.numero), 0);
  novo.proximoNumero = Math.max(novo.proximoNumero, maior + 1);
  return novo;
}

/** Troca fotos locais pelas enviadas à nuvem, dentro de um registro. */
async function subirFotos(lojaId: string, dados: unknown, trocas: Map<string, string>) {
  const trocar = async (f?: string) => {
    if (!f || !ehFotoLocal(f)) return f;
    if (!trocas.has(f)) trocas.set(f, await enviarFoto(lojaId, f));
    return trocas.get(f);
  };
  const r = { ...(dados as Record<string, unknown>) };
  if ('foto' in r) r.foto = await trocar(r.foto as string | undefined);
  for (const campo of ['fotosDocumento', 'fotosRetirada', 'fotosDevolucao']) {
    if (Array.isArray(r[campo])) r[campo] = await Promise.all((r[campo] as string[]).map((f) => trocar(f)));
  }
  if (Array.isArray(r.itens)) {
    r.itens = await Promise.all((r.itens as { foto?: string }[]).map(async (i) => ({ ...i, foto: await trocar(i.foto) })));
  }
  return r;
}

function trocarFotos(d: Dados, trocas: Map<string, string>): Dados {
  if (trocas.size === 0) return d;
  const t = (f?: string) => (f && trocas.get(f)) || f;
  const ts = (l: string[]) => l.map((f) => t(f)!);
  return {
    ...d,
    itens: d.itens.map((i) => ({ ...i, foto: t(i.foto) })),
    clientes: d.clientes.map((c) => ({ ...c, fotosDocumento: ts(c.fotosDocumento) })),
    locacoes: d.locacoes.map((l) => ({
      ...l,
      fotosRetirada: ts(l.fotosRetirada),
      fotosDevolucao: ts(l.fotosDevolucao),
      itens: l.itens.map((i) => ({ ...i, foto: t(i.foto) })),
    })),
  };
}

function useNuvemInterna() {
  const { carregado, dados, aplicarDados } = useDados();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [loja, setLoja] = useState<LojaNuvem | null>(null);
  const [papel, setPapel] = useState<'dono' | 'funcionario' | null>(null);
  const [situacao, setSituacao] = useState<Situacao>(supabase ? 'sem-conta' : 'desligado');
  const [erro, setErro] = useState('');
  const conhecidos = useRef(new Map<string, string>());
  const ultimo = useRef('1970-01-01T00:00:00Z');
  const enviando = useRef(false);
  const pronto = useRef(false);

  // ---------- sessão ----------
  const carregarLoja = useCallback(async (s: Session | null) => {
    if (!supabase || !s) return null;
    const { data: m } = await supabase.from('membros').select('loja_id, papel').eq('usuario_id', s.user.id).limit(1).maybeSingle();
    if (!m) {
      setLoja(null);
      setSituacao('sem-loja');
      return null;
    }
    const { data: l } = await supabase.from('lojas').select('id, nome, codigo_convite, pro_ate, teste_ate').eq('id', m.loja_id).single();
    setPapel(m.papel);
    setLoja(l);
    return l as LojaNuvem;
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const mudar = (s: Session | null) => {
      setSessao(s);
      if (s) {
        carregarLoja(s).catch(() => {});
      } else {
        setLoja(null);
        setSituacao('sem-conta');
      }
    };
    supabase.auth.getSession().then(({ data }) => mudar(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => mudar(s));
    return () => data.subscription.unsubscribe();
  }, [carregarLoja]);

  // o plano vem do servidor (o app não consegue se dar o Pro)
  useEffect(() => {
    if (!loja) return;
    aplicarDados((d) => ({ ...d, plano: { ...d.plano, proAte: loja.pro_ate ?? undefined, testeAte: loja.teste_ate ?? undefined } }));
  }, [loja, aplicarDados]);

  // ---------- receber ----------
  const receber = useCallback(
    async (lojaId: string) => {
      if (!supabase) return;
      for (;;) {
        const { data, error } = await supabase
          .from('registros')
          .select('tipo, id, dados, excluido, atualizado_em')
          .eq('loja_id', lojaId)
          .gt('atualizado_em', ultimo.current)
          .order('atualizado_em', { ascending: true })
          .limit(500);
        if (error) throw error;
        const regs = (data ?? []) as Registro[];
        if (regs.length === 0) break;
        for (const r of regs) {
          if (r.excluido) conhecidos.current.delete(chave(r.tipo, r.id));
          else conhecidos.current.set(chave(r.tipo, r.id), JSON.stringify(r.dados));
        }
        ultimo.current = regs[regs.length - 1].atualizado_em;
        aplicarDados((d) => aplicar(d, regs));
        if (regs.length < 500) break;
      }
      await AsyncStorage.setItem(
        `nuvem:${lojaId}`,
        JSON.stringify({ ultimo: ultimo.current, conhecidos: [...conhecidos.current.entries()] }),
      ).catch(() => {});
    },
    [aplicarDados],
  );

  // ---------- enviar ----------
  const enviar = useCallback(
    async (lojaId: string, d: Dados) => {
      if (!supabase || enviando.current) return;
      enviando.current = true;
      try {
        const atuais = registrosDe(d);
        const presentes = new Set(atuais.map((r) => chave(r.tipo, r.id)));
        const mudados = atuais.filter((r) => conhecidos.current.get(chave(r.tipo, r.id)) !== JSON.stringify(r.dados));
        const removidos = [...conhecidos.current.keys()].filter((k) => !presentes.has(k) && !k.startsWith('loja:'));
        if (mudados.length === 0 && removidos.length === 0) return;
        setSituacao('sincronizando');

        const trocas = new Map<string, string>();
        const linhas = [];
        for (const r of mudados) {
          const dadosComFotos = await subirFotos(lojaId, r.dados, trocas);
          linhas.push({ loja_id: lojaId, tipo: r.tipo, id: r.id, dados: dadosComFotos, excluido: false });
        }
        for (const k of removidos) {
          const [tipo, ...resto] = k.split(':');
          linhas.push({ loja_id: lojaId, tipo, id: resto.join(':'), dados: JSON.parse(conhecidos.current.get(k) ?? '{}'), excluido: true });
        }
        for (let i = 0; i < linhas.length; i += 200) {
          const { error } = await supabase.from('registros').upsert(linhas.slice(i, i + 200), { onConflict: 'loja_id,tipo,id' });
          if (error) throw error;
        }
        for (const l of linhas) {
          const k = chave(l.tipo, l.id);
          if (l.excluido) conhecidos.current.delete(k);
          else conhecidos.current.set(k, JSON.stringify(l.dados));
        }
        if (trocas.size) aplicarDados((x) => trocarFotos(x, trocas));
        await receber(lojaId);
        setSituacao('em-dia');
        setErro('');
      } catch (e) {
        setSituacao('erro');
        setErro(e instanceof Error ? e.message : 'Falha ao sincronizar.');
      } finally {
        enviando.current = false;
      }
    },
    [aplicarDados, receber],
  );

  // primeira sincronização ao abrir a loja
  useEffect(() => {
    if (!supabase || !loja || !carregado) return;
    let ativo = true;
    pronto.current = false;
    (async () => {
      setSituacao('sincronizando');
      try {
        const salvo = JSON.parse((await AsyncStorage.getItem(`nuvem:${loja.id}`)) ?? 'null');
        conhecidos.current = new Map(salvo?.conhecidos ?? []);
        ultimo.current = salvo?.ultimo ?? '1970-01-01T00:00:00Z';
        await receber(loja.id);
        if (!ativo) return;
        pronto.current = true;
        setSituacao('em-dia');
      } catch (e) {
        setSituacao('erro');
        setErro(e instanceof Error ? e.message : 'Falha ao sincronizar.');
      }
    })();
    return () => {
      ativo = false;
    };
  }, [loja, carregado, receber]);

  // envia as mudanças um segundo depois da última alteração
  useEffect(() => {
    if (!loja || !pronto.current) return;
    const t = setTimeout(() => enviar(loja.id, dados), 1000);
    return () => clearTimeout(t);
  }, [dados, loja, enviar]);

  // recebe em tempo real; e confere a cada minuto, caso a conexão caia
  useEffect(() => {
    if (!supabase || !loja) return;
    const cliente = supabase;
    const canal = cliente
      .channel(`registros-${loja.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros', filter: `loja_id=eq.${loja.id}` }, () => {
        receber(loja.id).catch(() => {});
      })
      .subscribe();
    const t = setInterval(() => receber(loja.id).catch(() => {}), 60000);
    return () => {
      clearInterval(t);
      cliente.removeChannel(canal);
    };
  }, [loja, receber]);

  // ---------- ações da tela de conta ----------
  const entrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  }, []);

  const cadastrar = useCallback(async (email: string, senha: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Enviamos um e-mail de confirmação. Confirme e depois entre com sua senha.');
  }, []);

  const criarLoja = useCallback(
    async (nome: string) => {
      if (!supabase) return;
      const { error } = await supabase.rpc('criar_loja', { nome_loja: nome });
      if (error) throw new Error(error.message);
      await carregarLoja(sessao);
    },
    [carregarLoja, sessao],
  );

  const entrarComConvite = useCallback(
    async (codigo: string) => {
      if (!supabase) return;
      const { error } = await supabase.rpc('entrar_com_convite', { codigo });
      if (error) throw new Error(error.message.includes('não encontrado') ? 'Código de convite não encontrado.' : error.message);
      await carregarLoja(sessao);
    },
    [carregarLoja, sessao],
  );

  const iniciarTesteNuvem = useCallback(async () => {
    if (!supabase || !loja) return;
    const { error } = await supabase.rpc('iniciar_teste', { loja: loja.id });
    if (error) throw new Error(error.message);
    await carregarLoja(sessao);
  }, [loja, carregarLoja, sessao]);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return useMemo(
    () => ({
      ligada: !!supabase,
      sessao,
      email: sessao?.user.email ?? '',
      loja,
      papel,
      situacao,
      erro,
      entrar,
      cadastrar,
      criarLoja,
      entrarComConvite,
      iniciarTesteNuvem,
      sair,
      sincronizarAgora: () => (loja ? enviar(loja.id, dados) : Promise.resolve()),
    }),
    [sessao, loja, papel, situacao, erro, entrar, cadastrar, criarLoja, entrarComConvite, iniciarTesteNuvem, sair, enviar, dados],
  );
}

type Contexto = ReturnType<typeof useNuvemInterna>;
const NuvemContext = createContext<Contexto | null>(null);

export function NuvemProvider({ children }: { children: ReactNode }) {
  const valor = useNuvemInterna();
  return <NuvemContext.Provider value={valor}>{children}</NuvemContext.Provider>;
}

export function useNuvem() {
  const ctx = useContext(NuvemContext);
  if (!ctx) throw new Error('useNuvem precisa estar dentro de NuvemProvider');
  return ctx;
}
