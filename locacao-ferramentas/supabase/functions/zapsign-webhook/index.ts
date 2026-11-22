// ZapSign → servidor: contrato assinado. Marca na locação e gera o boleto.
import { garantirBoletoDoContrato } from '../_shared/cobranca.ts';
import { lerAvisoZapSign, marcarAssinado, marcarRecusado } from '../_shared/regras.ts';
import { admin, dadosDaLocacao, gravarLocacao, json, primeiraVez, servir } from '../_shared/servidor.ts';

const SEGREDO = Deno.env.get('ZAPSIGN_WEBHOOK_SEGREDO') ?? '';

servir(async (req) => {
  // o segredo vai na URL cadastrada no ZapSign: .../zapsign-webhook?segredo=...
  if (!SEGREDO || new URL(req.url).searchParams.get('segredo') !== SEGREDO) return json({ erro: 'não autorizado' }, 401);
  const aviso = lerAvisoZapSign(await req.json());
  if (!aviso || aviso.situacao === 'outro') return json({ ok: true, ignorado: true });

  const { data: mapa } = await admin.from('contratos_externos').select('loja_id, locacao_id').eq('id_externo', aviso.token).maybeSingle();
  if (!mapa) return json({ ok: true, desconhecido: true });
  if (!(await primeiraVez(`zapsign:${aviso.token}:${aviso.situacao}`, 'zapsign'))) return json({ ok: true, repetido: true });

  const { locacao } = await dadosDaLocacao(mapa.loja_id, mapa.locacao_id);
  const agora = new Date().toISOString();
  if (aviso.situacao === 'recusado') {
    await gravarLocacao(mapa.loja_id, marcarRecusado(locacao, agora));
    return json({ ok: true });
  }
  await gravarLocacao(mapa.loja_id, marcarAssinado(locacao, agora));
  const link = await garantirBoletoDoContrato(mapa.loja_id, mapa.locacao_id);
  return json({ ok: true, boleto: link });
});
