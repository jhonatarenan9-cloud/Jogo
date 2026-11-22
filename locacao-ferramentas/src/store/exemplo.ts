import { hojeISO, somarDias } from '@/lib/format';
import { completarCliente, completarLocacao } from '@/store/migracao';
import type { Cliente, Cobranca, Dados, Item, Lancamento, Locacao, Pagamento } from '@/store/tipos';

/** Dados de demonstração, com datas relativas a hoje, para mostrar o app funcionando. */
export function dadosDeExemplo(base: Dados): Dados {
  const hoje = hojeISO();
  const agora = new Date().toISOString();

  const itens: Item[] = [
    ['furadeira', 'Furadeira de impacto', 'Elétricas', 25, 150, 4],
    ['serra', 'Serra circular', 'Elétricas', 35, 250, 2],
    ['martelete', 'Martelete rompedor', 'Construção', 60, 400, 2],
    ['betoneira', 'Betoneira 150 L', 'Construção', 70, 500, 2],
    ['andaime', 'Andaime (módulo)', 'Construção', 12, 80, 10],
    ['escada', 'Escada extensível 7 m', 'Construção', 18, 100, 3],
    ['rocadeira', 'Roçadeira a gasolina', 'Jardinagem', 45, 350, 2],
    ['lavadora', 'Lavadora de alta pressão', 'Limpeza', 35, 200, 3],
  ].map(([id, nome, categoria, precoDia, caucao, quantidade]) => ({
    id: `ex-${id}`,
    nome: nome as string,
    categoria: categoria as string,
    precoDia: precoDia as number,
    caucao: caucao as number,
    quantidade: quantidade as number,
    criadoEm: agora,
  }));

  const clientes: Cliente[] = ([
    ['joao', 'João Pereira', '(11) 98765-4321', 'Pedreiro, cliente frequente', '123.456.789-09'],
    ['ana', 'Ana Lima', '(11) 97654-3210', ''],
    ['construtora', 'Construtora Silva & Filhos', '(11) 3456-7890', 'Paga por Pix no fim do mês'],
    ['carlos', 'Carlos Souza', '(11) 99876-5432', ''],
    ['mariana', 'Mariana Rocha', '(11) 96543-2109', ''],
    ['pedro', 'Pedro Alves', '(11) 95432-1098', ''],
  ] as string[][]).map(([id, nome, telefone, obs, documento]) =>
    completarCliente({ id: `ex-${id}`, nome, telefone, obs, documento: documento ?? '', criadoEm: agora }),
  );

  // dois clientes com cadastro completo, para o boleto e o Serasa funcionarem na demonstração
  const completar = (id: string, extra: Partial<Cliente>) => {
    const i = clientes.findIndex((c) => c.id === `ex-${id}`);
    clientes[i] = { ...clientes[i], ...extra };
  };
  completar('joao', { email: 'joao.pereira@exemplo.com', cep: '01001-000', endereco: 'Praça da Sé', numero: '120', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' });
  completar('construtora', { documento: '11.222.333/0001-81', email: 'compras@construtorasilva.exemplo', cep: '04538-133', endereco: 'Av. Brigadeiro Faria Lima', numero: '3477', bairro: 'Itaim Bibi', cidade: 'São Paulo', uf: 'SP' });
  completar('pedro', { documento: '529.982.247-25', cep: '13010-111', endereco: 'Rua Barão de Jaguara', numero: '45', bairro: 'Centro', cidade: 'Campinas', uf: 'SP' });

  const item = (id: string, qtd = 1) => {
    const i = itens.find((x) => x.id === `ex-${id}`)!;
    return { itemId: i.id, nome: i.nome, precoDia: i.precoDia, qtd };
  };
  let numero = base.proximoNumero;
  const boleto = (valor: number, venceEm: number, etapa: Cobranca['etapa']): Cobranca => ({
    id: `ex-bol-${numero}`,
    etapa,
    valor,
    vencimento: somarDias(hoje, venceEm),
    link: `https://boleto.exemplo/${numero}`,
    criadaEm: agora,
    simulada: true,
  });
  const loc = (
    cliente: string,
    lista: ReturnType<typeof item>[],
    inicioRel: number,
    dias: number,
    pago: 'tudo' | 'metade' | 'nada',
    situacao: Locacao['situacao'] = 'aberta',
    extras: Partial<Locacao> = {},
  ): Locacao => {
    const inicio = somarDias(hoje, inicioRel);
    const valor = lista.reduce((s, i) => s + i.precoDia * i.qtd, 0) * dias;
    const pagamentos: Pagamento[] =
      pago === 'nada'
        ? []
        : [{ id: `p-${numero}`, valor: pago === 'tudo' ? valor : Math.round(valor / 2), forma: 'Pix', data: inicio < hoje ? inicio : hoje }];
    return completarLocacao({
      id: `ex-loc-${numero}`,
      numero: numero++,
      clienteId: `ex-${cliente}`,
      itens: lista,
      inicio,
      dias,
      desconto: 0,
      taxaEntrega: 0,
      caucao: 0,
      pagamentos,
      situacao,
      devolvidaEm: situacao === 'devolvida' ? somarDias(inicio, dias) : undefined,
      multa: 0,
      obs: '',
      criadaEm: `${inicio}T09:00:00.000Z`,
      historico: [{ data: `${inicio}T09:00:00.000Z`, texto: 'Locação registrada' }],
      ...extras,
    });
  };

  const locacoes: Locacao[] = [
    loc('construtora', [item('andaime', 6), item('betoneira')], -40, 30, 'tudo', 'devolvida'),
    loc('joao', [item('martelete')], -25, 3, 'tudo', 'devolvida'),
    loc('ana', [item('lavadora')], -12, 2, 'tudo', 'devolvida'),
    loc('carlos', [item('furadeira'), item('escada')], -9, 5, 'metade'),
    loc('pedro', [item('rocadeira')], -4, 3, 'nada', 'aberta', {
      contrato: { etapa: 'assinado', vencimento: somarDias(hoje, -3), valorCobranca: 135, criadoEm: agora, enviadoEm: agora, assinadoEm: agora, linkAssinatura: 'https://assinatura.exemplo/contrato-5', simulado: true },
      cobrancas: [boleto(135, -3, 'vencida')],
    }),
    loc('joao', [item('serra')], -2, 2, 'tudo'),
    loc('construtora', [item('andaime', 4)], -3, 15, 'nada', 'aberta', {
      contrato: { etapa: 'assinado', vencimento: somarDias(hoje, 4), valorCobranca: 720, criadoEm: agora, enviadoEm: agora, assinadoEm: agora, linkAssinatura: 'https://assinatura.exemplo/contrato-7', simulado: true },
      cobrancas: [boleto(720, 4, 'aguardando')],
    }),
    loc('mariana', [item('lavadora')], -1, 3, 'tudo', 'aberta', { taxaEntrega: 15 }),
    loc('ana', [item('betoneira')], 2, 4, 'metade', 'aberta', {
      contrato: { etapa: 'enviado', vencimento: somarDias(hoje, 7), valorCobranca: 140, criadoEm: agora, enviadoEm: agora, linkAssinatura: 'https://assinatura.exemplo/contrato-9', simulado: true },
    }),
  ];

  const lancamentos: Lancamento[] = [
    ['Troca do motor da betoneira', 'Manutenção', 230, -6, true],
    ['Combustível das entregas', 'Combustível e frete', 120, -3, true],
    ['Aluguel do galpão', 'Aluguel e contas', 900, 6, false],
    ['Conta de luz', 'Aluguel e contas', 210, -2, false],
  ].map(([descricao, categoria, valor, dia, pago], i) => ({
    id: `ex-lanc-${i}`,
    tipo: 'despesa',
    descricao: descricao as string,
    categoria: categoria as string,
    valor: valor as number,
    vencimento: somarDias(hoje, dia as number),
    pagoEm: pago ? somarDias(hoje, dia as number) : undefined,
    forma: pago ? 'Pix' : undefined,
    criadoEm: agora,
  }));

  return {
    ...base,
    lancamentos: [...base.lancamentos, ...lancamentos],
    itens: [...base.itens, ...itens],
    clientes: [...base.clientes, ...clientes],
    locacoes: [...locacoes.reverse(), ...base.locacoes],
    loja: base.loja.nome
      ? base.loja
      : { ...base.loja, nome: 'Locadora Exemplo', telefone: '(11) 3333-4444', documento: '11.444.777/0001-61', endereco: 'Av. Brasil, 1000 - Centro, São Paulo/SP' },
    proximoNumero: numero,
  };
}
