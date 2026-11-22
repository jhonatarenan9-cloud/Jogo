// App → servidor: o dono cola a chave de API do Asaas; o servidor confere, guarda e cadastra o webhook.
import { asaas, type ContaAsaas } from '../_shared/asaas.ts';
import { EVENTOS_ASAAS } from '../_shared/regras.ts';
import { admin, ErroUsuario, json, lojaDoUsuario, servir, URL_SUPABASE } from '../_shared/servidor.ts';

servir(async (req) => {
  const { lojaId, papel } = await lojaDoUsuario(req, false);
  if (papel !== 'dono') throw new ErroUsuario('Só o dono da locadora pode conectar o Asaas.', 403);
  const { chave, sandbox } = await req.json();
  if (typeof chave !== 'string' || chave.trim().length < 20) throw new ErroUsuario('Cole a chave de API completa do Asaas.');

  const webhookToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const conta: ContaAsaas = { chave: chave.trim(), sandbox: !!sandbox };
  // confere a chave
  await asaas(conta, 'GET', '/finance/balance');
  let nomeConta = 'Conta Asaas';
  try {
    const info = await asaas<{ name?: string; companyName?: string }>(conta, 'GET', '/myAccount/commercialInfo');
    nomeConta = info.companyName || info.name || nomeConta;
  } catch { /* nome é só para mostrar */ }

  // cadastra (ou recadastra) o aviso de pagamentos apontando para este servidor
  await asaas(conta, 'POST', '/webhooks', {
    name: 'Controle de Locação',
    url: `${URL_SUPABASE}/functions/v1/asaas-webhook`,
    email: '',
    enabled: true,
    interrupted: false,
    authToken: webhookToken,
    sendType: 'SEQUENTIALLY',
    events: EVENTOS_ASAAS,
  });

  await admin.from('segredos_loja').upsert({
    loja_id: lojaId,
    asaas_chave: conta.chave,
    asaas_sandbox: conta.sandbox,
    asaas_conta: nomeConta,
    asaas_webhook_token: webhookToken,
    atualizado_em: new Date().toISOString(),
  });
  return json({ nomeConta });
});
