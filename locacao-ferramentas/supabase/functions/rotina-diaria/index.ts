// Roda uma vez por dia (agendada no banco): negativa automaticamente os boletos
// vencidos há mais dias do que a loja configurou.
import { paraNegativar, type LocacaoDoc, type LojaDoc } from '../_shared/regras.ts';
import { admin, hojeBrasil, json, servir } from '../_shared/servidor.ts';
import { negativarBoleto } from '../negativar/index.ts';

const SEGREDO = Deno.env.get('ROTINA_SEGREDO') ?? '';

servir(async (req) => {
  if (!SEGREDO || req.headers.get('x-rotina-segredo') !== SEGREDO) return json({ erro: 'não autorizado' }, 401);
  const hoje = hojeBrasil();
  const { data: lojas } = await admin.from('registros').select('loja_id, dados').eq('tipo', 'loja').eq('excluido', false);
  const resultado: { loja: string; locacao: number; ok: boolean; erro?: string }[] = [];
  for (const { loja_id, dados } of lojas ?? []) {
    const loja = dados as LojaDoc;
    if (!loja.negativarAuto) continue;
    const { data: pro } = await admin.rpc('loja_pro', { loja: loja_id });
    if (!pro) continue;
    const { data: regs } = await admin.from('registros').select('dados').eq('loja_id', loja_id).eq('tipo', 'locacao').eq('excluido', false);
    for (const { locacao, cobranca } of paraNegativar((regs ?? []).map((r) => r.dados as LocacaoDoc), loja, hoje)) {
      try {
        await negativarBoleto(loja_id, locacao.id, cobranca.id, true);
        resultado.push({ loja: loja_id, locacao: locacao.numero, ok: true });
      } catch (e) {
        resultado.push({ loja: loja_id, locacao: locacao.numero, ok: false, erro: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return json({ hoje, resultado });
});
