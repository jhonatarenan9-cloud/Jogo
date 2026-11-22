import { diariaTotal, multaPrevista, previsaoDevolucao, saldoDevedor, subtotal, totalLocacao, totalPago } from '@/lib/calculos';
import { deISO, formatarPreco } from '@/lib/format';
import type { Cliente, Locacao, Loja } from '@/store/tipos';

/** Fotos já convertidas para data URI (ver fotoParaPdf), por item. */
export type FotosDoContrato = Record<string, string>;

function esc(t: string | number | undefined) {
  return String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataBr(iso: string) {
  const d = deISO(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function enderecoCliente(c: Cliente) {
  const partes = [
    [c.endereco, c.numero].filter(Boolean).join(', '),
    c.bairro,
    [c.cidade, c.uf].filter(Boolean).join('/'),
    c.cep ? `CEP ${c.cep}` : '',
  ].filter(Boolean);
  return partes.join(' · ') || 'não informado';
}

const ESTILO = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917; margin: 0; padding: 28px; font-size: 12.5px; line-height: 1.5; background: #fff; }
  h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: .02em; }
  h2 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .06em; color: #c2410c; }
  .topo { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #e8590c; padding-bottom: 10px; }
  .muted { color: #6b6560; }
  .partes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .caixa { border: 1px solid #e7e3dd; border-radius: 8px; padding: 10px 12px; }
  .caixa b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #6b6560; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; color: #6b6560; border-bottom: 1px solid #e7e3dd; padding: 6px 6px; }
  td { border-bottom: 1px solid #f0ede8; padding: 6px; vertical-align: middle; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .foto { width: 64px; height: 64px; border-radius: 6px; object-fit: cover; background: #fff1e6; display: block; }
  .semfoto { width: 64px; height: 64px; border-radius: 6px; background: #fff1e6; }
  .totais td { border: none; padding: 3px 6px; }
  .totais tr.forte td { font-weight: 800; font-size: 14px; border-top: 1px solid #e7e3dd; padding-top: 6px; }
  ol { padding-left: 18px; margin: 0; }
  li { margin-bottom: 6px; }
  .assin { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 36px; }
  .linha { border-top: 1px solid #1c1917; padding-top: 4px; text-align: center; font-size: 11.5px; }
  .vistoria { display: flex; flex-wrap: wrap; gap: 6px; }
  .vistoria img { width: 110px; height: 110px; object-fit: cover; border-radius: 6px; }
  .rodape { margin-top: 18px; font-size: 10.5px; color: #6b6560; }
  @media (max-width: 520px) { body { padding: 16px; } .partes, .assin { grid-template-columns: 1fr; } }
`;

export function htmlContrato({
  loja,
  cliente,
  locacao: l,
  fotos,
  fotosVistoria = [],
  hoje,
}: {
  loja: Loja;
  cliente: Cliente;
  locacao: Locacao;
  fotos: FotosDoContrato;
  fotosVistoria?: string[];
  hoje: string;
}) {
  const total = totalLocacao(l, loja, hoje);
  const pago = totalPago(l);
  const saldo = saldoDevedor(l, loja, hoje);
  const multa = multaPrevista(l, loja, hoje);
  const c = l.contrato;
  const linhasItens = l.itens
    .map((i) => {
      const foto = fotos[i.itemId];
      return `<tr>
        <td>${foto ? `<img class="foto" src="${foto}" alt="">` : '<div class="semfoto"></div>'}</td>
        <td><b>${esc(i.nome)}</b></td>
        <td class="num">${i.qtd}</td>
        <td class="num">${formatarPreco(i.precoDia)}</td>
        <td class="num">${l.dias}</td>
        <td class="num">${formatarPreco(i.precoDia * i.qtd * l.dias)}</td>
      </tr>`;
    })
    .join('');

  const pagamentoTexto =
    saldo <= 0
      ? 'O valor total foi pago no ato da contratação.'
      : c && c.valorCobranca > 0
        ? `O saldo de ${formatarPreco(c.valorCobranca)} será pago por boleto bancário com vencimento em ${dataBr(c.vencimento)}, enviado ao LOCATÁRIO após a assinatura deste contrato.`
        : `O saldo de ${formatarPreco(saldo)} será pago na devolução dos bens.`;

  const clausulas = [
    `<b>Objeto.</b> A LOCADORA aluga ao LOCATÁRIO os bens descritos na tabela acima, que o LOCATÁRIO declara receber em perfeito estado de funcionamento e conservação${fotosVistoria.length ? ', conforme fotos da vistoria anexas' : ''}.`,
    `<b>Prazo.</b> A locação começa em ${dataBr(l.inicio)} e os bens devem ser devolvidos até ${dataBr(previsaoDevolucao(l))} (${l.dias} ${l.dias === 1 ? 'dia' : 'dias'}), no endereço da LOCADORA, salvo outro combinado por escrito.`,
    `<b>Preço e pagamento.</b> O valor total da locação é de ${formatarPreco(total)}. ${pago > 0 ? `Já foram pagos ${formatarPreco(pago)}. ` : ''}${pagamentoTexto}`,
    l.caucao > 0
      ? `<b>Caução.</b> O LOCATÁRIO entrega caução de ${formatarPreco(l.caucao)}, devolvida no fim da locação, descontados eventuais valores devidos por atraso, avaria, perda ou falta de pagamento.`
      : '',
    `<b>Uso e conservação.</b> O LOCATÁRIO se compromete a usar os bens de acordo com sua finalidade e as instruções do fabricante, a não emprestar nem sublocar, e a devolvê-los limpos e no mesmo estado em que os recebeu, ressalvado o desgaste natural do uso.`,
    `<b>Danos, perda e roubo.</b> O LOCATÁRIO responde por danos, perda, furto ou roubo dos bens durante a locação, devendo pagar o conserto ou, se não for possível, o valor de reposição de bem equivalente.`,
    loja.cobrarAtraso
      ? `<b>Atraso na devolução.</b> Cada dia de atraso na devolução será cobrado como uma diária adicional, no valor de ${formatarPreco(diariaTotal(l))} por dia, sem prejuízo das demais penalidades.`
      : '',
    `<b>Inadimplência.</b> O não pagamento no vencimento sujeita o LOCATÁRIO a multa de ${loja.multaBoletoPct}% e juros de ${loja.jurosMesPct}% ao mês. Persistindo a dívida, a LOCADORA poderá, após notificação prévia, incluir o nome do LOCATÁRIO nos cadastros de proteção ao crédito (como Serasa) e cobrar o débito pelos meios legais.`,
    ...loja.clausulasExtras
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => esc(t)),
    `<b>Assinatura eletrônica.</b> As partes reconhecem como válida a assinatura deste contrato por meio eletrônico, nos termos do art. 10, §2º, da Medida Provisória 2.200-2/2001 e da Lei 14.063/2020.`,
    `<b>Foro.</b> Fica eleito o foro da comarca da sede da LOCADORA para resolver qualquer questão relativa a este contrato.`,
  ].filter(Boolean);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contrato de locação nº ${l.numero}</title><style>${ESTILO}</style></head><body>
<div class="topo">
  <div><h1>CONTRATO DE LOCAÇÃO DE BENS MÓVEIS</h1><div class="muted">Nº ${l.numero} · emitido em ${dataBr(hoje)}</div></div>
  <div style="text-align:right"><b>${esc(loja.nome || 'Locadora')}</b><div class="muted">${esc(loja.telefone)}</div></div>
</div>

<h2>Partes</h2>
<div class="partes">
  <div class="caixa"><b>Locadora</b>${esc(loja.nome || '—')}<br>${loja.documento ? `CPF/CNPJ ${esc(loja.documento)}<br>` : ''}${esc(loja.endereco)}${loja.telefone ? `<br>${esc(loja.telefone)}` : ''}</div>
  <div class="caixa"><b>Locatário</b>${esc(cliente.nome)}<br>${cliente.documento ? `CPF/CNPJ ${esc(cliente.documento)}<br>` : ''}${esc(enderecoCliente(cliente))}<br>${esc([cliente.telefone, cliente.email].filter(Boolean).join(' · '))}</div>
</div>

<h2>Bens locados</h2>
<table>
  <thead><tr><th style="width:76px">Foto</th><th>Item</th><th class="num">Qtd</th><th class="num">Diária</th><th class="num">Dias</th><th class="num">Valor</th></tr></thead>
  <tbody>${linhasItens}</tbody>
</table>
<table class="totais" style="margin-top:6px;max-width:320px;margin-left:auto">
  <tr><td>Diárias</td><td class="num">${formatarPreco(subtotal(l))}</td></tr>
  ${l.desconto > 0 ? `<tr><td>Desconto</td><td class="num">− ${formatarPreco(l.desconto)}</td></tr>` : ''}
  ${l.taxaEntrega > 0 ? `<tr><td>Frete</td><td class="num">${formatarPreco(l.taxaEntrega)}</td></tr>` : ''}
  ${multa > 0 ? `<tr><td>Multa por atraso</td><td class="num">${formatarPreco(multa)}</td></tr>` : ''}
  ${l.avaria > 0 ? `<tr><td>Avarias</td><td class="num">${formatarPreco(l.avaria)}</td></tr>` : ''}
  <tr class="forte"><td>Total</td><td class="num">${formatarPreco(total)}</td></tr>
  ${pago > 0 ? `<tr><td>Pago</td><td class="num">${formatarPreco(pago)}</td></tr>` : ''}
  ${saldo > 0 ? `<tr><td><b>A pagar</b></td><td class="num"><b>${formatarPreco(saldo)}</b></td></tr>` : ''}
  ${l.caucao > 0 ? `<tr><td class="muted">Caução</td><td class="num muted">${formatarPreco(l.caucao)}</td></tr>` : ''}
</table>

<h2>Cláusulas</h2>
<ol>${clausulas.map((t) => `<li>${t}</li>`).join('')}</ol>

${
  fotosVistoria.length
    ? `<h2>Vistoria na retirada</h2><div class="vistoria">${fotosVistoria.map((f) => `<img src="${f}" alt="">`).join('')}</div>`
    : ''
}

<div class="assin">
  <div class="linha">${esc(loja.nome || 'LOCADORA')}</div>
  <div class="linha">${esc(cliente.nome)} · LOCATÁRIO</div>
</div>
<p class="rodape">Documento gerado pelo app Controle de Locação.</p>
</body></html>`;
}

export function htmlRecibo({ loja, cliente, locacao: l, hoje }: { loja: Loja; cliente?: Cliente; locacao: Locacao; hoje: string }) {
  const total = totalLocacao(l, loja, hoje);
  const pago = totalPago(l);
  const saldo = saldoDevedor(l, loja, hoje);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Recibo nº ${l.numero}</title><style>${ESTILO}</style></head><body>
<div class="topo"><div><h1>RECIBO</h1><div class="muted">Locação nº ${l.numero} · ${dataBr(hoje)}</div></div>
<div style="text-align:right"><b>${esc(loja.nome || 'Locadora')}</b><div class="muted">${esc(loja.documento)}</div></div></div>
<p>Recebemos de <b>${esc(cliente?.nome ?? '')}</b>${cliente?.documento ? `, CPF/CNPJ ${esc(cliente.documento)},` : ''} o valor de <b>${formatarPreco(pago)}</b>
referente à locação dos itens abaixo, de ${dataBr(l.inicio)} a ${dataBr(previsaoDevolucao(l))}.</p>
<table><thead><tr><th>Item</th><th class="num">Qtd</th><th class="num">Diária</th><th class="num">Dias</th><th class="num">Valor</th></tr></thead><tbody>
${l.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td class="num">${i.qtd}</td><td class="num">${formatarPreco(i.precoDia)}</td><td class="num">${l.dias}</td><td class="num">${formatarPreco(i.precoDia * i.qtd * l.dias)}</td></tr>`).join('')}
</tbody></table>
<h2>Pagamentos</h2>
<table><tbody>${l.pagamentos.map((p) => `<tr><td>${dataBr(p.data)}</td><td>${esc(p.forma)}</td><td class="num">${formatarPreco(p.valor)}</td></tr>`).join('') || '<tr><td class="muted">Nenhum pagamento registrado.</td></tr>'}</tbody></table>
<table class="totais" style="margin-top:6px;max-width:320px;margin-left:auto">
<tr class="forte"><td>Total</td><td class="num">${formatarPreco(total)}</td></tr>
<tr><td>Pago</td><td class="num">${formatarPreco(pago)}</td></tr>
<tr><td>${saldo > 0 ? '<b>Falta pagar</b>' : 'Situação'}</td><td class="num">${saldo > 0 ? `<b>${formatarPreco(saldo)}</b>` : 'Quitado'}</td></tr>
</table>
<div class="assin" style="grid-template-columns:1fr"><div class="linha">${esc(loja.nome || 'LOCADORA')}</div></div>
</body></html>`;
}
