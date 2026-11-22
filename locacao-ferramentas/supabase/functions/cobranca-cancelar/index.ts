// App → servidor: cancela o boleto no Asaas.
import { asaas, contaDaLoja } from '../_shared/asaas.ts';
import { dadosDaLocacao, ErroUsuario, json, lojaDoUsuario, servir } from '../_shared/servidor.ts';

servir(async (req) => {
  const { lojaId } = await lojaDoUsuario(req, false);
  const { locacaoId, cobrancaId } = await req.json();
  const { locacao } = await dadosDaLocacao(lojaId, locacaoId);
  const c = locacao.cobrancas?.find((x) => x.id === cobrancaId);
  if (!c?.idExterno) throw new ErroUsuario('Boleto não encontrado.');
  await asaas(await contaDaLoja(lojaId), 'DELETE', `/payments/${c.idExterno}`);
  // o aviso PAYMENT_DELETED do Asaas marca como cancelado na locação
  return json({ ok: true });
});
