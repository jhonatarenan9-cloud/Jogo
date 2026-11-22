import {
  aplicarEventoAsaas,
  cobrancaAsaas,
  documentoZapSign,
  faltaNoCliente,
  lerAvisoZapSign,
  lerReferencia,
  marcarAssinado,
  paraNegativar,
  type LocacaoDoc,
} from './regras.ts';

function igual(a: unknown, b: unknown, msg: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}\n  esperado: ${JSON.stringify(b)}\n  veio:     ${JSON.stringify(a)}`);
}

const base: LocacaoDoc = {
  id: 'L1',
  numero: 7,
  clienteId: 'C1',
  itens: [{ nome: 'Betoneira', qtd: 1 }, { nome: 'Andaime', qtd: 4 }],
  situacao: 'aberta',
  contrato: { etapa: 'enviado', vencimento: '2026-11-30', valorCobranca: 280, simulado: false },
  cobrancas: [{ id: 'c1', etapa: 'aguardando', valor: 280, vencimento: '2026-11-30', idExterno: 'pay_1', criadaEm: '2026-11-22T10:00:00Z', simulada: false }],
  pagamentos: [],
  historico: [],
};

Deno.test('boleto do Asaas leva multa, juros e referência da locação', () => {
  const p = cobrancaAsaas({ clienteAsaasId: 'cus_1', valor: 280, vencimento: '2026-11-30', locacao: base, nomeLoja: 'Loja X', lojaId: 'LJ', locacaoId: 'L1', cobrancaId: 'c1', multaPct: 5, jurosPct: 3 });
  igual(p.billingType, 'BOLETO', 'tipo');
  igual(p.fine, { value: 2 }, 'multa limitada a 2% (CDC)');
  igual(p.interest, { value: 1 }, 'juros limitados a 1% ao mês');
  igual(lerReferencia(p.externalReference), { lojaId: 'LJ', locacaoId: 'L1', cobrancaId: 'c1' }, 'referência');
  igual(p.description.includes('4x Andaime'), true, 'descrição com itens');
});

Deno.test('pagamento recebido quita o boleto e lança o pagamento uma vez só', () => {
  const pago = aplicarEventoAsaas(base, 'c1', 'PAYMENT_RECEIVED', '2026-11-25')!;
  igual(pago.cobrancas[0].etapa, 'paga', 'etapa');
  igual(pago.pagamentos.length, 1, 'um pagamento');
  igual(pago.pagamentos[0].forma, 'Boleto', 'forma');
  igual(aplicarEventoAsaas(pago, 'c1', 'PAYMENT_CONFIRMED', '2026-11-25'), null, 'confirmação depois do recebimento não muda nada');
  igual(aplicarEventoAsaas(pago, 'c1', 'PAYMENT_OVERDUE', '2026-11-25'), null, 'pago não vence');
});

Deno.test('vencimento, negativação e cancelamento', () => {
  const vencido = aplicarEventoAsaas(base, 'c1', 'PAYMENT_OVERDUE', '2026-12-01')!;
  igual(vencido.cobrancas[0].etapa, 'vencida', 'vencida');
  const negativado = aplicarEventoAsaas(vencido, 'c1', 'PAYMENT_DUNNING_REQUESTED', '2026-12-20')!;
  igual(negativado.cobrancas[0].etapa, 'negativada', 'negativada');
  const pagoDepois = aplicarEventoAsaas(negativado, 'c1', 'PAYMENT_RECEIVED', '2026-12-22')!;
  igual(pagoDepois.cobrancas[0].etapa, 'paga', 'pagar depois de negativado quita');
  igual(aplicarEventoAsaas(base, 'outro', 'PAYMENT_RECEIVED', '2026-11-25'), null, 'boleto desconhecido');
  igual(aplicarEventoAsaas(base, 'c1', 'PAYMENT_DELETED', '2026-11-25')!.cobrancas[0].etapa, 'cancelada', 'cancelada');
});

Deno.test('rotina diária: negativa só depois do prazo e com a opção ligada', () => {
  const loja = { nome: 'X', multaBoletoPct: 2, jurosMesPct: 1, negativarAuto: true, diasParaNegativar: 15 };
  igual(paraNegativar([base], loja, '2026-12-14').length, 0, '14 dias: ainda não');
  igual(paraNegativar([base], loja, '2026-12-15').length, 1, '15 dias: negativa');
  igual(paraNegativar([base], { ...loja, negativarAuto: false }, '2027-01-30').length, 0, 'opção desligada');
  const pago = aplicarEventoAsaas(base, 'c1', 'PAYMENT_RECEIVED', '2026-11-25')!;
  igual(paraNegativar([pago], loja, '2027-01-30').length, 0, 'pago não negativa');
  const simulado = { ...base, cobrancas: [{ ...base.cobrancas[0], simulada: true }] };
  igual(paraNegativar([simulado], loja, '2027-01-30').length, 0, 'simulação não vai ao Serasa');
});

Deno.test('ZapSign: documento com o celular do cliente e aviso de assinatura', () => {
  const d = documentoZapSign({ nomeLoja: 'Loja X', numero: 7, pdfBase64: 'JVBER', signatario: { nome: 'João', telefone: '5511987654321' }, idExterno: 'LJ|L1', linkDepois: 'https://x/apos' });
  igual(d.signers[0].phone_number, '11987654321', 'tira o 55 da frente');
  igual(d.signers[0].send_automatic_whatsapp, false, 'quem manda o WhatsApp é o app');
  igual(d.redirect_link, 'https://x/apos', 'volta para o boleto depois de assinar');
  igual(lerAvisoZapSign({ event_type: 'doc_signed', token: 'abc' }), { token: 'abc', situacao: 'assinado' }, 'assinado');
  igual(lerAvisoZapSign({ status: 'refused', token: 'abc' }), { token: 'abc', situacao: 'recusado' }, 'recusado');
  igual(marcarAssinado(base, '2026-11-22T12:00:00Z').contrato?.etapa, 'assinado', 'marca assinado');
});

Deno.test('cadastro do cliente para boleto', () => {
  igual(
    faltaNoCliente({ id: 'C1', nome: 'João', telefone: '(11) 98765-4321', email: '', documento: '123.456.789-09', cep: '01001-000', endereco: 'Praça da Sé', numero: '1', bairro: 'Sé' }),
    [],
    'completo',
  );
  igual(
    faltaNoCliente({ id: 'C1', nome: 'João', telefone: '', email: '', documento: '', cep: '', endereco: '', numero: '', bairro: '' }),
    ['CPF/CNPJ', 'celular', 'CEP', 'rua', 'número', 'bairro'],
    'vazio',
  );
});
