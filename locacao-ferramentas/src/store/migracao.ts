import type { Cliente, Dados, Item, Locacao, Loja } from '@/store/tipos';

export const LOJA_PADRAO: Loja = {
  nome: '',
  telefone: '',
  documento: '',
  endereco: '',
  cobrarAtraso: true,
  multaBoletoPct: 2,
  jurosMesPct: 1,
  prazoBoletoDias: 5,
  negativarAuto: false,
  diasParaNegativar: 15,
  lembretes: true,
  clausulasExtras: '',
};

export const DADOS_VAZIOS: Dados = {
  versao: 2,
  itens: [],
  clientes: [],
  locacoes: [],
  lancamentos: [],
  loja: LOJA_PADRAO,
  plano: {},
  proximoNumero: 1,
};

export function completarItem(i: Partial<Item>): Item {
  return {
    id: i.id ?? '',
    nome: i.nome ?? '',
    categoria: i.categoria ?? '',
    precoDia: i.precoDia ?? 0,
    caucao: i.caucao ?? 0,
    quantidade: i.quantidade ?? 1,
    foto: i.foto,
    criadoEm: i.criadoEm ?? new Date().toISOString(),
  };
}

export function completarCliente(c: Partial<Cliente>): Cliente {
  return {
    id: c.id ?? '',
    nome: c.nome ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    documento: c.documento ?? '',
    cep: c.cep ?? '',
    endereco: c.endereco ?? '',
    numero: c.numero ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    obs: c.obs ?? '',
    fotosDocumento: c.fotosDocumento ?? [],
    criadoEm: c.criadoEm ?? new Date().toISOString(),
  };
}

export function completarLocacao(l: Partial<Locacao>): Locacao {
  return {
    id: l.id ?? '',
    numero: l.numero ?? 0,
    clienteId: l.clienteId ?? '',
    itens: l.itens ?? [],
    inicio: l.inicio ?? '',
    dias: l.dias ?? 1,
    desconto: l.desconto ?? 0,
    taxaEntrega: l.taxaEntrega ?? 0,
    caucao: l.caucao ?? 0,
    pagamentos: l.pagamentos ?? [],
    situacao: l.situacao ?? 'aberta',
    devolvidaEm: l.devolvidaEm,
    multa: l.multa ?? 0,
    avaria: l.avaria ?? 0,
    avariaDescricao: l.avariaDescricao ?? '',
    caucaoDevolvida: l.caucaoDevolvida,
    fotosRetirada: l.fotosRetirada ?? [],
    fotosDevolucao: l.fotosDevolucao ?? [],
    contrato: l.contrato,
    cobrancas: l.cobrancas ?? [],
    historico: l.historico ?? [],
    obs: l.obs ?? '',
    criadaEm: l.criadaEm ?? new Date().toISOString(),
  };
}

/**
 * Lê dados salvos de qualquer versão e completa os campos novos com valores neutros.
 * Nada é inventado: campos que não existiam ficam vazios ou zerados.
 */
export function migrar(salvo: Partial<Dados> | Record<string, unknown>): Dados {
  const s = salvo as Partial<Dados>;
  return {
    versao: 2,
    itens: (s.itens ?? []).map(completarItem),
    clientes: (s.clientes ?? []).map(completarCliente),
    locacoes: (s.locacoes ?? []).map(completarLocacao),
    lancamentos: s.lancamentos ?? [],
    loja: { ...LOJA_PADRAO, ...s.loja },
    plano: { ...s.plano },
    proximoNumero: s.proximoNumero ?? 1,
  };
}
