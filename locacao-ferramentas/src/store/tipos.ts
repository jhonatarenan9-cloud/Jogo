export type Item = {
  id: string;
  nome: string;
  categoria: string;
  precoDia: number;
  caucao: number;
  quantidade: number;
  criadoEm: string;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  documento: string;
  endereco: string;
  obs: string;
  criadoEm: string;
};

/** Cópia do item no momento da locação, para o histórico não mudar se o preço mudar. */
export type ItemLocado = {
  itemId: string;
  nome: string;
  precoDia: number;
  qtd: number;
};

export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartão';
export const FORMAS_PAGAMENTO: FormaPagamento[] = ['Pix', 'Dinheiro', 'Cartão'];

export type Pagamento = {
  id: string;
  valor: number;
  forma: FormaPagamento;
  data: string; // AAAA-MM-DD
};

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
  obs: string;
  criadaEm: string; // ISO completo
};

export type Loja = {
  nome: string;
  telefone: string;
  cobrarAtraso: boolean;
};

export type Plano = {
  /** Fim do teste grátis do Pro (AAAA-MM-DD), se já foi usado. */
  testeAte?: string;
  /** Fim do período pago do Pro (AAAA-MM-DD). Preenchido pela cobrança, quando ligada. */
  proAte?: string;
  ciclo?: 'mensal' | 'anual';
};

export type Dados = {
  versao: 1;
  itens: Item[];
  clientes: Cliente[];
  locacoes: Locacao[];
  loja: Loja;
  plano: Plano;
  proximoNumero: number;
};
