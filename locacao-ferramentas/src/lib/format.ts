const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function formatarPreco(valor: number) {
  const [inteiro, centavos] = valor.toFixed(2).split('.');
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${comPontos},${centavos}`;
}

/** Data no formato AAAA-MM-DD, sem fuso, para guardar e comparar. */
export function hojeISO() {
  return paraISO(new Date());
}

export function paraISO(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function deISO(iso: string) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(iso: string, dias: number) {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

export function formatarData(iso: string) {
  const d = deISO(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function diaDaSemana(iso: string) {
  return DIAS_SEMANA[deISO(iso).getDay()];
}
