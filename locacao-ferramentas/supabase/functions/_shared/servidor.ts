// Peças comuns das funções do servidor (Deno / Supabase Edge Functions).
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.119.2';

import type { ClienteDoc, LocacaoDoc, LojaDoc } from './regras.ts';

export const URL_SUPABASE = Deno.env.get('SUPABASE_URL') ?? '';
const CHAVE_SERVICO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

export const admin: SupabaseClient = createClient(URL_SUPABASE, CHAVE_SERVICO, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export class ErroUsuario extends Error {
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
  }
}

export function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Envolve a função: CORS, JSON e mensagens de erro legíveis para o app. */
export function servir(tratar: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    try {
      return await tratar(req);
    } catch (e) {
      if (e instanceof ErroUsuario) return json({ erro: e.message }, e.status);
      console.error(e);
      return json({ erro: 'Erro no servidor. Tente de novo em instantes.' }, 500);
    }
  });
}

/** Usuário logado que chamou a função, e a loja dele. */
export async function lojaDoUsuario(req: Request, exigirPro = true) {
  const auth = req.headers.get('Authorization') ?? '';
  const comoUsuario = createClient(URL_SUPABASE, CHAVE_PUBLICA, { global: { headers: { Authorization: auth } } });
  const { data } = await comoUsuario.auth.getUser();
  if (!data.user) throw new ErroUsuario('Entre na sua conta de novo.', 401);
  const { data: membro } = await admin.from('membros').select('loja_id, papel').eq('usuario_id', data.user.id).limit(1).maybeSingle();
  if (!membro) throw new ErroUsuario('Sua conta ainda não está ligada a uma locadora.', 403);
  if (exigirPro) {
    const { data: pro } = await admin.rpc('loja_pro', { loja: membro.loja_id });
    if (!pro) throw new ErroUsuario('Assinatura eletrônica e boletos fazem parte do plano Pro.', 402);
  }
  return { usuarioId: data.user.id, lojaId: membro.loja_id as string, papel: membro.papel as 'dono' | 'funcionario' };
}

export async function lerRegistro<T>(lojaId: string, tipo: string, id: string): Promise<T | null> {
  const { data } = await admin.from('registros').select('dados').eq('loja_id', lojaId).eq('tipo', tipo).eq('id', id).maybeSingle();
  return (data?.dados as T) ?? null;
}

export async function gravarLocacao(lojaId: string, l: LocacaoDoc) {
  // o gatilho mesclar_locacao no banco junta com o que o app gravou no meio tempo
  const { error } = await admin.from('registros').update({ dados: l }).eq('loja_id', lojaId).eq('tipo', 'locacao').eq('id', l.id);
  if (error) throw error;
}

export async function dadosDaLocacao(lojaId: string, locacaoId: string) {
  const locacao = await lerRegistro<LocacaoDoc>(lojaId, 'locacao', locacaoId);
  if (!locacao) throw new ErroUsuario('Locação não encontrada no servidor. Aguarde a sincronização e tente de novo.', 404);
  const cliente = await lerRegistro<ClienteDoc>(lojaId, 'cliente', locacao.clienteId);
  if (!cliente) throw new ErroUsuario('Cliente da locação não encontrado no servidor.', 404);
  const loja = (await lerRegistro<LojaDoc>(lojaId, 'loja', 'loja')) ?? {
    nome: '',
    multaBoletoPct: 2,
    jurosMesPct: 1,
    negativarAuto: false,
    diasParaNegativar: 15,
  };
  return { locacao, cliente, loja };
}

export function hojeBrasil() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Evita processar o mesmo aviso duas vezes. Devolve false se já foi processado. */
export async function primeiraVez(id: string, origem: string) {
  const { error } = await admin.from('eventos_processados').insert({ id, origem });
  return !error;
}
