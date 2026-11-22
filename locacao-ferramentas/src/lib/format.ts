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

export function formatarDataLonga(iso: string) {
  const d = deISO(iso);
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Nome relativo para datas próximas: hoje, amanhã, ontem; senão "ter, 24 nov". */
export function formatarDataRelativa(iso: string, hoje = hojeISO()) {
  const dif = diasEntre(hoje, iso);
  if (dif === 0) return 'hoje';
  if (dif === 1) return 'amanhã';
  if (dif === -1) return 'ontem';
  return `${diaDaSemana(iso)}, ${formatarData(iso)}`;
}

/** Quantos dias de `a` até `b` (positivo se `b` vem depois). */
export function diasEntre(a: string, b: string) {
  return Math.round((deISO(b).getTime() - deISO(a).getTime()) / 86400000);
}

export function nomeDoMes(mesISO: string) {
  const [a, m] = mesISO.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** Lê "1.234,50" ou "1234.5" como número. Vazio ou inválido vira 0. */
export function lerValor(texto: string) {
  const limpo = texto.trim().replace(/[^\d,.-]/g, '');
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function valorParaCampo(n: number) {
  return n ? n.toFixed(2).replace('.', ',').replace(/,00$/, '') : '';
}

export function mascararTelefone(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function normalizar(t: string) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
