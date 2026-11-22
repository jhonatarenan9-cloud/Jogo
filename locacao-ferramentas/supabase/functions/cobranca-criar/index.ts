// App → servidor: gera um boleto avulso (ex.: saldo depois de estender a locação).
import { criarBoleto } from '../_shared/cobranca.ts';
import { ErroUsuario, hojeBrasil, json, lojaDoUsuario, servir } from '../_shared/servidor.ts';

servir(async (req) => {
  const { lojaId } = await lojaDoUsuario(req);
  const { locacaoId, valor, vencimento } = await req.json();
  if (!locacaoId || !(valor > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(vencimento ?? '')) throw new ErroUsuario('Dados do boleto inválidos.');
  const cobranca = await criarBoleto(lojaId, locacaoId, Number(valor), vencimento < hojeBrasil() ? hojeBrasil() : vencimento);
  return json(cobranca);
});
