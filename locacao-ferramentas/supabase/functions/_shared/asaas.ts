import { ErroUsuario, admin } from './servidor.ts';

export type ContaAsaas = { chave: string; sandbox: boolean; webhookToken?: string };

export function urlAsaas(sandbox: boolean) {
  return sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
}

export async function asaas<T = Record<string, unknown>>(conta: ContaAsaas, metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(`${urlAsaas(conta.sandbox)}${caminho}`, {
    method: metodo,
    headers: { access_token: conta.chave, 'Content-Type': 'application/json', 'User-Agent': 'controle-locacao' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : {};
  if (!r.ok) {
    const msg = (dados?.errors ?? []).map((e: { description: string }) => e.description).join(' ') || `Asaas respondeu ${r.status}`;
    throw new ErroUsuario(`Asaas: ${msg}`, r.status === 401 ? 400 : 502);
  }
  return dados as T;
}

export async function contaDaLoja(lojaId: string): Promise<ContaAsaas> {
  const { data } = await admin.from('segredos_loja').select('asaas_chave, asaas_sandbox, asaas_webhook_token').eq('loja_id', lojaId).maybeSingle();
  if (!data?.asaas_chave) throw new ErroUsuario('Conecte a conta do Asaas em Configurações › Integrações.', 400);
  return { chave: data.asaas_chave, sandbox: data.asaas_sandbox, webhookToken: data.asaas_webhook_token ?? undefined };
}
