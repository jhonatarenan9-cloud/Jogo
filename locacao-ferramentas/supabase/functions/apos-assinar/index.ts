// Página para onde o ZapSign manda o cliente depois de assinar: abre o boleto.
import { garantirBoletoDoContrato } from '../_shared/cobranca.ts';
import { marcarAssinado } from '../_shared/regras.ts';
import { admin, dadosDaLocacao, gravarLocacao } from '../_shared/servidor.ts';

function pagina(titulo: string, texto: string) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 20px;color:#1c1917">
<h1 style="font-size:22px">${titulo}</h1><p style="font-size:16px;line-height:1.5">${texto}</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req) => {
  try {
    const [lojaId, locacaoId] = (new URL(req.url).searchParams.get('doc') ?? '').split('|');
    const { data: mapa } = await admin.from('contratos_externos').select('id_externo').eq('loja_id', lojaId).eq('locacao_id', locacaoId).limit(1).maybeSingle();
    if (!mapa) return pagina('Contrato não encontrado', 'Fale com a locadora.');
    const { locacao } = await dadosDaLocacao(lojaId, locacaoId);
    // o redirecionamento só acontece depois da assinatura; marca já, sem esperar o aviso do ZapSign
    if (locacao.contrato && locacao.contrato.etapa !== 'assinado') await gravarLocacao(lojaId, marcarAssinado(locacao, new Date().toISOString()));
    const link = await garantirBoletoDoContrato(lojaId, locacaoId);
    if (link) return Response.redirect(link, 302);
    return pagina('Contrato assinado ✅', 'Obrigado! A locadora vai enviar a cobrança para você.');
  } catch (e) {
    console.error(e);
    return pagina('Contrato assinado ✅', 'Obrigado! O boleto será enviado para você pelo WhatsApp ou e-mail em instantes.');
  }
});
