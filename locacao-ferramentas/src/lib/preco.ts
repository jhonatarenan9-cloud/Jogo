export const TAXA_ENTREGA = 15;

/** Desconto por período: quanto mais dias, menor a diária. */
export function descontoPorDias(dias: number) {
  if (dias >= 15) return 0.25;
  if (dias >= 7) return 0.15;
  if (dias >= 3) return 0.05;
  return 0;
}

export function calcularOrcamento(precoDia: number, dias: number, entrega: boolean) {
  const bruto = precoDia * dias;
  const desconto = Math.round(bruto * descontoPorDias(dias) * 100) / 100;
  const taxaEntrega = entrega ? TAXA_ENTREGA : 0;
  return { bruto, desconto, taxaEntrega, total: bruto - desconto + taxaEntrega };
}
