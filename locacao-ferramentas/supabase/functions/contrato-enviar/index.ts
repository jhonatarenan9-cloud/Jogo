// App → servidor: cria o documento no ZapSign e devolve o link para o cliente assinar.
import { documentoZapSign, type LocacaoDoc } from '../_shared/regras.ts';
import { admin, dadosDaLocacao, ErroUsuario, gravarLocacao, json, lojaDoUsuario, servir, URL_SUPABASE } from '../_shared/servidor.ts';
import { zapsign } from '../_shared/zapsign.ts';

servir(async (req) => {
  const { lojaId } = await lojaDoUsuario(req);
  const { locacaoId, pdfBase64, signatario } = await req.json();
  if (!locacaoId || !pdfBase64) throw new ErroUsuario('Contrato incompleto. Gere de novo pelo app.');
  const { locacao, loja } = await dadosDaLocacao(lojaId, locacaoId);

  const idExterno = `${lojaId}|${locacaoId}`;
  const doc = await zapsign<{ token: string; signers: { sign_url: string }[] }>(
    'POST',
    '/docs/',
    documentoZapSign({
      nomeLoja: loja.nome,
      numero: locacao.numero,
      pdfBase64,
      signatario,
      idExterno,
      // depois de assinar, o cliente cai direto na página do boleto
      linkDepois: `${URL_SUPABASE}/functions/v1/apos-assinar?doc=${encodeURIComponent(idExterno)}`,
    }),
  );
  const link = doc.signers?.[0]?.sign_url;
  if (!link) throw new ErroUsuario('O serviço de assinatura não devolveu o link.', 502);
  await admin.from('contratos_externos').upsert({ id_externo: doc.token, loja_id: lojaId, locacao_id: locacaoId });

  const agora = new Date().toISOString();
  const atualizada: LocacaoDoc = {
    ...locacao,
    contrato: { ...(locacao.contrato ?? { vencimento: agora.slice(0, 10), valorCobranca: 0, simulado: false }), etapa: 'enviado', linkAssinatura: link, idExterno: doc.token, enviadoEm: agora, simulado: false },
    historico: [...(locacao.historico ?? []), { data: agora, texto: 'Contrato enviado para assinatura' }],
  };
  await gravarLocacao(lojaId, atualizada);
  return json({ link, idExterno: doc.token });
});
