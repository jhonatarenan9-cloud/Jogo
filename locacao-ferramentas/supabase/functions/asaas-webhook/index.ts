// Asaas → servidor: pagamento recebido, vencido, cancelado ou negativado.
import { aplicarEventoAsaas, EVENTOS_ASAAS, lerReferencia } from '../_shared/regras.ts';
import { admin, dadosDaLocacao, gravarLocacao, hojeBrasil, json, primeiraVez, servir } from '../_shared/servidor.ts';

servir(async (req) => {
  const corpo = await req.json();
  const evento = String(corpo.event ?? '');
  const ref = lerReferencia(corpo.payment?.externalReference);
  if (!ref || !EVENTOS_ASAAS.includes(evento)) return json({ ok: true, ignorado: true });

  // cada loja tem o próprio token de webhook: confere antes de mexer em qualquer coisa
  const { data: segredo } = await admin.from('segredos_loja').select('asaas_webhook_token').eq('loja_id', ref.lojaId).maybeSingle();
  if (!segredo?.asaas_webhook_token || req.headers.get('asaas-access-token') !== segredo.asaas_webhook_token) {
    return json({ erro: 'não autorizado' }, 401);
  }
  if (!(await primeiraVez(`asaas:${corpo.id ?? `${corpo.payment?.id}:${evento}`}`, 'asaas'))) return json({ ok: true, repetido: true });

  const { locacao } = await dadosDaLocacao(ref.lojaId, ref.locacaoId);
  const nova = aplicarEventoAsaas(locacao, ref.cobrancaId, evento, hojeBrasil());
  if (nova) await gravarLocacao(ref.lojaId, nova);
  return json({ ok: true });
});
