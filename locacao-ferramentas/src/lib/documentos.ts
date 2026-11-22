import type { Cliente } from '@/store/tipos';

export function soDigitos(t: string) {
  return t.replace(/\D/g, '');
}

export function mascararDocumento(t: string) {
  const d = soDigitos(t).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function mascararCep(t: string) {
  const d = soDigitos(t).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function cpfValido(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(cpf[tamanho])) return false;
  }
  return true;
}

function cnpjValido(cnpj: string) {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (tamanho: number) => {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((s, p, i) => s + Number(cnpj[i]) * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function documentoValido(t: string) {
  const d = soDigitos(t);
  return d.length === 11 ? cpfValido(d) : cnpjValido(d);
}

/** O que falta no cadastro para emitir boleto e, se preciso, negativar. */
export function faltaParaCobranca(c: Cliente) {
  const falta: string[] = [];
  if (!documentoValido(c.documento)) falta.push('CPF/CNPJ');
  if (soDigitos(c.telefone).length < 10) falta.push('celular');
  if (soDigitos(c.cep).length !== 8) falta.push('CEP');
  if (!c.endereco.trim()) falta.push('rua');
  if (!c.numero.trim()) falta.push('número');
  if (!c.bairro.trim()) falta.push('bairro');
  return falta;
}
