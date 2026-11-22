// App → servidor: pede ao Asaas a negativação no Serasa de um boleto vencido.
import { asaas, contaDaLoja } from '../_shared/asaas.ts';
import { faltaNoCliente, negativacaoAsaas } from '../_shared/regras.ts';
import { dadosDaLocacao, ErroUsuario, gravarLocacao, json, lojaDoUsuario, servir } from '../_shared/servidor.ts';

export async function negativarBoleto(lojaId: string, locacaoId: string, cobrancaId: string, automatico: boolean) {
  const { locacao, cliente, loja } = await dadosDaLocacao(lojaId, locacaoId);
  const c = locacao.cobrancas?.find((x) => x.id === cobrancaId);
  if (!c?.idExterno) throw new ErroUsuario('Boleto não encontrado.');
  if (c.etapa === 'paga' || c.etapa === 'negativada') return;
  const falta = faltaNoCliente(cliente);
  if (falta.length) throw new ErroUsuario(`Para negativar, complete o cadastro: falta ${falta.join(', ')}.`);
  await asaas(
    await contaDaLoja(lojaId),
    'POST',
    '/paymentDunnings',
    negativacaoAsaas({ pagamentoAsaasId: c.idExterno, cliente, numeroLocacao: locacao.numero, nomeLoja: loja.nome }),
  );
  const agora = new Date().toISOString();
  await gravarLocacao(lojaId, {
    ...locacao,
    cobrancas: locacao.cobrancas.map((x) => (x.id === cobrancaId ? { ...x, etapa: 'negativada', negativadaEm: agora } : x)),
    historico: [
      ...(locacao.historico ?? []),
      { data: agora, texto: automatico ? 'Negativação automática no Serasa solicitada ao Asaas' : 'Negativação no Serasa solicitada ao Asaas' },
    ],
  });
}

if (import.meta.main) {
  servir(async (req) => {
    const { lojaId } = await lojaDoUsuario(req);
    const { locacaoId, cobrancaId } = await req.json();
    await negativarBoleto(lojaId, locacaoId, cobrancaId, false);
    return json({ ok: true });
  });
}
