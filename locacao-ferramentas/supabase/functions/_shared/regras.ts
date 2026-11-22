// Regras do servidor sem dependência de Deno, para poderem ser testadas com Node.
// Tipos mínimos espelhando src/store/tipos.ts do app.

export type Cobranca = {
  id: string;
  etapa: 'aguardando' | 'paga' | 'vencida' | 'negativada' | 'cancelada';
  valor: number;
  vencimento: string;
  link?: string;
  idExterno?: string;
  criadaEm: string;
  pagaEm?: string;
  negativadaEm?: string;
  simulada: boolean;
};

export type LocacaoDoc = {
  id: string;
  numero: number;
  clienteId: string;
  itens: { nome: string; qtd: number }[];
  situacao: 'aberta' | 'devolvida' | 'cancelada';
  contrato?: {
    etapa: 'rascunho' | 'enviado' | 'assinado' | 'recusado';
    vencimento: string;
    valorCobranca: number;
    linkAssinatura?: string;
    idExterno?: string;
    enviadoEm?: string;
    assinadoEm?: string;
    simulado: boolean;
  };
  cobrancas: Cobranca[];
  pagamentos: { id: string; valor: number; forma: string; data: string; cobrancaId?: string }[];
  historico: { data: string; texto: string }[];
};

export type ClienteDoc = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
};

export type LojaDoc = {
  nome: string;
  multaBoletoPct: number;
  jurosMesPct: number;
  negativarAuto: boolean;
  diasParaNegativar: number;
};

export const soDigitos = (t: string) => (t ?? '').replace(/\D/g, '');

export function brl(v: number) {
  const [i, c] = v.toFixed(2).split('.');
  return `R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`;
}

export function dataBr(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / 86400000);
}

export function novoId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Referência gravada no Asaas para achar a locação quando o aviso de pagamento chegar. */
export function referencia(lojaId: string, locacaoId: string, cobrancaId: string) {
  return `${lojaId}|${locacaoId}|${cobrancaId}`;
}

export function lerReferencia(ref?: string | null) {
  const [lojaId, locacaoId, cobrancaId] = (ref ?? '').split('|');
  return lojaId && locacaoId && cobrancaId ? { lojaId, locacaoId, cobrancaId } : null;
}

/** O que falta no cadastro do cliente para boleto/negativação. */
export function faltaNoCliente(c: ClienteDoc) {
  const falta: string[] = [];
  const doc = soDigitos(c.documento);
  if (doc.length !== 11 && doc.length !== 14) falta.push('CPF/CNPJ');
  if (soDigitos(c.telefone).length < 10) falta.push('celular');
  if (soDigitos(c.cep).length !== 8) falta.push('CEP');
  if (!c.endereco?.trim()) falta.push('rua');
  if (!c.numero?.trim()) falta.push('número');
  if (!c.bairro?.trim()) falta.push('bairro');
  return falta;
}

// ------------------------------------------------------------------ Asaas

export function clienteAsaas(c: ClienteDoc, lojaId: string) {
  return {
    name: c.nome,
    cpfCnpj: soDigitos(c.documento),
    mobilePhone: soDigitos(c.telefone),
    email: c.email || undefined,
    postalCode: soDigitos(c.cep),
    address: c.endereco,
    addressNumber: c.numero,
    province: c.bairro,
    externalReference: `${lojaId}|${c.id}`,
    // o Asaas avisa o cliente por e-mail/SMS quando o boleto é criado e antes de vencer
    notificationDisabled: false,
  };
}

export function cobrancaAsaas(p: {
  clienteAsaasId: string;
  valor: number;
  vencimento: string;
  locacao: Pick<LocacaoDoc, 'numero' | 'itens'>;
  nomeLoja: string;
  lojaId: string;
  locacaoId: string;
  cobrancaId: string;
  multaPct: number;
  jurosPct: number;
}) {
  const itens = p.locacao.itens.map((i) => (i.qtd > 1 ? `${i.qtd}x ${i.nome}` : i.nome)).join(', ');
  return {
    customer: p.clienteAsaasId,
    billingType: 'BOLETO', // boleto com QR Code Pix
    value: Math.round(p.valor * 100) / 100,
    dueDate: p.vencimento,
    description: `${p.nomeLoja || 'Locação'} - locação nº ${p.locacao.numero}: ${itens}`.slice(0, 500),
    externalReference: referencia(p.lojaId, p.locacaoId, p.cobrancaId),
    fine: { value: Math.min(2, Math.max(0, p.multaPct)) },
    interest: { value: Math.min(1, Math.max(0, p.jurosPct)) },
  };
}

export function negativacaoAsaas(p: { pagamentoAsaasId: string; cliente: ClienteDoc; numeroLocacao: number; nomeLoja: string }) {
  return {
    payment: p.pagamentoAsaasId,
    type: 'CREDIT_BUREAU', // Serasa
    description: `Débito da locação nº ${p.numeroLocacao} - ${p.nomeLoja}`.slice(0, 200),
    customerName: p.cliente.nome,
    customerCpfCnpj: soDigitos(p.cliente.documento),
    customerPrimaryPhone: soDigitos(p.cliente.telefone),
    customerPostalCode: soDigitos(p.cliente.cep),
    customerAddress: p.cliente.endereco,
    customerAddressNumber: p.cliente.numero,
    customerProvince: p.cliente.bairro,
  };
}

/** Eventos do Asaas que o app acompanha (configurados no webhook de cada loja). */
export const EVENTOS_ASAAS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_DUNNING_REQUESTED',
  'PAYMENT_DUNNING_RECEIVED',
];

function comHistorico(l: LocacaoDoc, texto: string, agora: string): LocacaoDoc {
  return { ...l, historico: [...(l.historico ?? []), { data: agora, texto }] };
}

/** Aplica um aviso do Asaas à locação. Devolve null quando não há nada a mudar. */
export function aplicarEventoAsaas(
  l: LocacaoDoc,
  cobrancaId: string,
  evento: string,
  hoje: string,
  agora = new Date().toISOString(),
): LocacaoDoc | null {
  const c = (l.cobrancas ?? []).find((x) => x.id === cobrancaId);
  if (!c) return null;
  const trocar = (m: Partial<Cobranca>) => (l.cobrancas ?? []).map((x) => (x.id === cobrancaId ? { ...x, ...m } : x));

  switch (evento) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED': {
      if (c.etapa === 'paga') return null;
      const jaLancado = (l.pagamentos ?? []).some((p) => p.cobrancaId === cobrancaId);
      return comHistorico(
        {
          ...l,
          cobrancas: trocar({ etapa: 'paga', pagaEm: hoje }),
          pagamentos: jaLancado
            ? l.pagamentos
            : [...(l.pagamentos ?? []), { id: `bol-${cobrancaId}`, valor: c.valor, forma: 'Boleto', data: hoje, cobrancaId }],
        },
        `Boleto de ${brl(c.valor)} pago`,
        agora,
      );
    }
    case 'PAYMENT_OVERDUE':
      if (c.etapa !== 'aguardando') return null;
      return comHistorico({ ...l, cobrancas: trocar({ etapa: 'vencida' }) }, 'Boleto venceu sem pagamento', agora);
    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      if (c.etapa === 'cancelada' || c.etapa === 'paga') return null;
      return comHistorico({ ...l, cobrancas: trocar({ etapa: 'cancelada' }) }, 'Boleto cancelado no Asaas', agora);
    case 'PAYMENT_DUNNING_REQUESTED':
    case 'PAYMENT_DUNNING_RECEIVED':
      if (c.etapa === 'negativada' || c.etapa === 'paga') return null;
      return comHistorico(
        { ...l, cobrancas: trocar({ etapa: 'negativada', negativadaEm: agora }) },
        'Negativação no Serasa registrada pelo Asaas',
        agora,
      );
    default:
      return null;
  }
}

export function marcarAssinado(l: LocacaoDoc, agora: string): LocacaoDoc {
  if (!l.contrato || l.contrato.etapa === 'assinado') return l;
  return comHistorico({ ...l, contrato: { ...l.contrato, etapa: 'assinado', assinadoEm: agora } }, 'Contrato assinado pelo cliente', agora);
}

export function marcarRecusado(l: LocacaoDoc, agora: string): LocacaoDoc {
  if (!l.contrato || l.contrato.etapa === 'assinado') return l;
  return comHistorico({ ...l, contrato: { ...l.contrato, etapa: 'recusado' } }, 'Cliente recusou o contrato', agora);
}

export function comCobranca(l: LocacaoDoc, c: Cobranca, agora: string): LocacaoDoc {
  if ((l.cobrancas ?? []).some((x) => x.id === c.id)) return l;
  return comHistorico(
    { ...l, cobrancas: [...(l.cobrancas ?? []), c] },
    `Boleto de ${brl(c.valor)} gerado, vence em ${dataBr(c.vencimento)}`,
    agora,
  );
}

/** Boletos que a rotina diária deve negativar. */
export function paraNegativar(locacoes: LocacaoDoc[], loja: LojaDoc, hoje: string) {
  if (!loja.negativarAuto) return [];
  const lista: { locacao: LocacaoDoc; cobranca: Cobranca }[] = [];
  for (const l of locacoes) {
    if (l.situacao === 'cancelada') continue;
    for (const c of l.cobrancas ?? []) {
      if (c.simulada || !c.idExterno) continue;
      const vencido = c.etapa === 'vencida' || (c.etapa === 'aguardando' && c.vencimento < hoje);
      if (vencido && diasEntre(c.vencimento, hoje) >= loja.diasParaNegativar) lista.push({ locacao: l, cobranca: c });
    }
  }
  return lista;
}

// ------------------------------------------------------------------ ZapSign

export function documentoZapSign(p: {
  nomeLoja: string;
  numero: number;
  pdfBase64: string;
  signatario: { nome: string; telefone: string; email?: string };
  idExterno: string;
  linkDepois?: string;
}) {
  const tel = soDigitos(p.signatario.telefone).replace(/^55(?=\d{10,11}$)/, '');
  return {
    name: `Contrato de locação nº ${p.numero} - ${p.nomeLoja || 'Locadora'}`.slice(0, 255),
    base64_pdf: p.pdfBase64,
    lang: 'pt-br',
    external_id: p.idExterno,
    disable_signer_emails: true,
    ...(p.linkDepois ? { redirect_link: p.linkDepois } : {}),
    signers: [
      {
        name: p.signatario.nome,
        email: p.signatario.email || '',
        phone_country: '55',
        phone_number: tel,
        auth_mode: 'assinaturaTela',
        send_automatic_email: false,
        send_automatic_whatsapp: false,
        lock_name: true,
        lock_phone: true,
        qualification: 'Locatário',
      },
    ],
  };
}

/** Lê o aviso do ZapSign: devolve o documento e se foi assinado ou recusado. */
export function lerAvisoZapSign(corpo: Record<string, unknown>) {
  const evento = String(corpo.event_type ?? '');
  const token = String(corpo.token ?? (corpo.doc as { token?: string } | undefined)?.token ?? '');
  const status = String(corpo.status ?? '');
  if (!token) return null;
  if (evento === 'doc_signed' || status === 'signed') return { token, situacao: 'assinado' as const };
  if (evento === 'doc_refused' || status === 'refused') return { token, situacao: 'recusado' as const };
  return { token, situacao: 'outro' as const };
}
