import { asaas, contaDaLoja } from './asaas.ts';
import { clienteAsaas, cobrancaAsaas, comCobranca, faltaNoCliente, novoId, soDigitos, type Cobranca } from './regras.ts';
import { admin, dadosDaLocacao, ErroUsuario, gravarLocacao } from './servidor.ts';

/** Cria (ou reaproveita) o cliente no Asaas e gera o boleto; grava na locação. */
export async function criarBoleto(lojaId: string, locacaoId: string, valor: number, vencimento: string): Promise<Cobranca> {
  const { locacao, cliente, loja } = await dadosDaLocacao(lojaId, locacaoId);
  const falta = faltaNoCliente(cliente);
  if (falta.length) throw new ErroUsuario(`Complete o cadastro do cliente: falta ${falta.join(', ')}.`);
  if (!(valor > 0)) throw new ErroUsuario('Não há valor a cobrar.');
  const conta = await contaDaLoja(lojaId);

  const busca = await asaas<{ data: { id: string }[] }>(conta, 'GET', `/customers?cpfCnpj=${soDigitos(cliente.documento)}`);
  const clienteId = busca.data?.[0]?.id ?? (await asaas<{ id: string }>(conta, 'POST', '/customers', clienteAsaas(cliente, lojaId))).id;

  const cobrancaId = novoId();
  const pagamento = await asaas<{ id: string; invoiceUrl: string }>(
    conta,
    'POST',
    '/payments',
    cobrancaAsaas({
      clienteAsaasId: clienteId,
      valor,
      vencimento,
      locacao,
      nomeLoja: loja.nome,
      lojaId,
      locacaoId,
      cobrancaId,
      multaPct: loja.multaBoletoPct,
      jurosPct: loja.jurosMesPct,
    }),
  );
  await admin.from('cobrancas_externas').insert({ id_externo: pagamento.id, loja_id: lojaId, locacao_id: locacaoId, cobranca_id: cobrancaId });

  const cobranca: Cobranca = {
    id: cobrancaId,
    etapa: 'aguardando',
    valor,
    vencimento,
    link: pagamento.invoiceUrl,
    idExterno: pagamento.id,
    criadaEm: new Date().toISOString(),
    simulada: false,
  };
  await gravarLocacao(lojaId, comCobranca(locacao, cobranca, cobranca.criadaEm));
  return cobranca;
}

/**
 * Gera o boleto do contrato assinado uma única vez, mesmo que o aviso do ZapSign
 * chegue repetido ou junto com o redirecionamento do cliente.
 */
export async function garantirBoletoDoContrato(lojaId: string, locacaoId: string): Promise<string | null> {
  const { data: trava, error } = await admin
    .from('boleto_do_contrato')
    .insert({ loja_id: lojaId, locacao_id: locacaoId })
    .select()
    .maybeSingle();
  if (error || !trava) {
    // outro processo já está gerando: espera o link aparecer (até ~10 s)
    for (let i = 0; i < 10; i++) {
      const { data } = await admin.from('boleto_do_contrato').select('link').eq('loja_id', lojaId).eq('locacao_id', locacaoId).maybeSingle();
      if (data?.link) return data.link;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return null;
  }
  try {
    const { locacao } = await dadosDaLocacao(lojaId, locacaoId);
    const c = locacao.contrato;
    if (!c || !(c.valorCobranca > 0)) return null;
    const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const boleto = await criarBoleto(lojaId, locacaoId, c.valorCobranca, c.vencimento < hoje ? hoje : c.vencimento);
    await admin.from('boleto_do_contrato').update({ cobranca_id: boleto.id, link: boleto.link }).eq('loja_id', lojaId).eq('locacao_id', locacaoId);
    return boleto.link ?? null;
  } catch (e) {
    // libera a trava para tentar de novo no próximo aviso
    await admin.from('boleto_do_contrato').delete().eq('loja_id', lojaId).eq('locacao_id', locacaoId);
    throw e;
  }
}
