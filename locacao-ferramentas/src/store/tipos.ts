export type Item = {
  id: string;
  nome: string;
  categoria: string;
  precoDia: number;
  caucao: number;
  quantidade: number;
  /** Foto do produto (arquivo no aparelho, data URI na web ou URL na nuvem). */
  foto?: string;
  criadoEm: string;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  /** CPF ou CNPJ, só números ou formatado. Obrigatório para boleto e negativação. */
  documento: string;
  cep: string;
  endereco: string; // rua
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  obs: string;
  /** Fotos do documento de identidade, comprovante de endereço etc. */
  fotosDocumento: string[];
  criadoEm: string;
};

/** Cópia do item no momento da locação, para o histórico não mudar se o preço mudar. */
export type ItemLocado = {
  itemId: string;
  nome: string;
  precoDia: number;
  qtd: number;
  foto?: string;
};

export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartão' | 'Boleto' | 'Caução';
export const FORMAS_PAGAMENTO: FormaPagamento[] = ['Pix', 'Dinheiro', 'Cartão'];

export type Pagamento = {
  id: string;
  valor: number;
  forma: FormaPagamento;
  data: string; // AAAA-MM-DD
  /** Preenchido quando o pagamento veio do boleto/Pix da cobrança online. */
  cobrancaId?: string;
};

export type EtapaContrato = 'rascunho' | 'enviado' | 'assinado' | 'recusado';

export type Contrato = {
  etapa: EtapaContrato;
  /** Vencimento do boleto escolhido na criação, gerado quando o contrato é assinado. */
  vencimento: string;
  /** Valor que será cobrado no boleto (normalmente o saldo da locação). */
  valorCobranca: number;
  criadoEm: string;
  enviadoEm?: string;
  assinadoEm?: string;
  linkAssinatura?: string;
  idExterno?: string; // documento no serviço de assinatura
  simulado: boolean; // true no modo demonstração (sem servidor)
};

export type EtapaCobranca = 'aguardando' | 'paga' | 'vencida' | 'negativada' | 'cancelada';

export type Cobranca = {
  id: string;
  etapa: EtapaCobranca;
  valor: number;
  vencimento: string;
  link?: string; // página do boleto/Pix
  idExterno?: string; // cobrança no Asaas
  criadaEm: string;
  pagaEm?: string;
  negativadaEm?: string;
  simulada: boolean;
};

export type Ocorrencia = { data: string; texto: string };

export type Locacao = {
  id: string;
  numero: number;
  clienteId: string;
  itens: ItemLocado[];
  inicio: string; // AAAA-MM-DD
  dias: number;
  desconto: number;
  taxaEntrega: number;
  caucao: number;
  pagamentos: Pagamento[];
  situacao: 'aberta' | 'devolvida' | 'cancelada';
  devolvidaEm?: string;
  multa: number; // fixada na devolução
  /** Cobrança por avaria encontrada na devolução. */
  avaria: number;
  avariaDescricao: string;
  /** Quanto da caução foi devolvido ao cliente (o resto foi retido). */
  caucaoDevolvida?: number;
  fotosRetirada: string[];
  fotosDevolucao: string[];
  contrato?: Contrato;
  cobrancas: Cobranca[];
  historico: Ocorrencia[];
  obs: string;
  criadaEm: string; // ISO completo
};

export type CategoriaDespesa =
  | 'Manutenção'
  | 'Compra de equipamento'
  | 'Combustível e frete'
  | 'Aluguel e contas'
  | 'Salários'
  | 'Impostos e taxas'
  | 'Outros';

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  'Manutenção',
  'Compra de equipamento',
  'Combustível e frete',
  'Aluguel e contas',
  'Salários',
  'Impostos e taxas',
  'Outros',
];

/** Despesa ou receita avulsa (as receitas das locações vêm dos pagamentos). */
export type Lancamento = {
  id: string;
  tipo: 'despesa' | 'receita';
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string; // AAAA-MM-DD
  pagoEm?: string; // vazio = a pagar / a receber
  forma?: FormaPagamento;
  criadoEm: string;
};

export type Loja = {
  nome: string;
  telefone: string;
  documento: string; // CNPJ ou CPF da locadora, vai no contrato
  endereco: string; // endereço completo, vai no contrato
  cobrarAtraso: boolean;
  /** Multa (%) e juros ao mês (%) do boleto, enviados ao Asaas. */
  multaBoletoPct: number;
  jurosMesPct: number;
  /** Prazo padrão de vencimento do boleto, em dias depois da assinatura. */
  prazoBoletoDias: number;
  /** Negativar no Serasa automaticamente depois de X dias de boleto vencido. */
  negativarAuto: boolean;
  diasParaNegativar: number;
  /** Avisos no celular do dono sobre devoluções. */
  lembretes: boolean;
  clausulasExtras: string;
};

export type Plano = {
  /** Fim do teste grátis do Pro (AAAA-MM-DD), se já foi usado. */
  testeAte?: string;
  /** Fim do período pago do Pro (AAAA-MM-DD). Preenchido pela cobrança, quando ligada. */
  proAte?: string;
  ciclo?: 'mensal' | 'anual';
};

export type Dados = {
  versao: 2;
  itens: Item[];
  clientes: Cliente[];
  locacoes: Locacao[];
  lancamentos: Lancamento[];
  loja: Loja;
  plano: Plano;
  proximoNumero: number;
};
