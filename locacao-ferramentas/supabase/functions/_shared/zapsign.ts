import { ErroUsuario } from './servidor.ts';

const TOKEN = Deno.env.get('ZAPSIGN_TOKEN') ?? '';
const SANDBOX = (Deno.env.get('ZAPSIGN_SANDBOX') ?? 'true') === 'true';
const BASE = SANDBOX ? 'https://sandbox.api.zapsign.com.br/api/v1' : 'https://api.zapsign.com.br/api/v1';

export async function zapsign<T = Record<string, unknown>>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  if (!TOKEN) throw new ErroUsuario('Assinatura eletrônica não configurada no servidor (ZAPSIGN_TOKEN).', 500);
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  if (!r.ok) throw new ErroUsuario(`Serviço de assinatura respondeu ${r.status}: ${texto.slice(0, 200)}`, 502);
  return (texto ? JSON.parse(texto) : {}) as T;
}
