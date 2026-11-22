import { soDigitos } from '@/lib/documentos';
import { supabase } from '@/lib/supabase';
import type { Cliente, Cobranca, Locacao } from '@/store/tipos';

/**
 * Chamadas ao servidor (Supabase Edge Functions), que falam com o serviço de
 * assinatura (ZapSign) e com o Asaas (boleto, Pix e negativação no Serasa).
 * As chaves desses serviços ficam só no servidor, nunca no app.
 *
 * Sem servidor (modo demonstração), tudo é simulado para mostrar o fluxo.
 */

export type NovaCobranca = Omit<Cobranca, 'criadaEm'>;

function idDemo() {
  return Math.random().toString(36).slice(2, 10);
}

async function chamar<T>(funcao: string, corpo: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Servidor não configurado.');
  const { data, error } = await supabase.functions.invoke(funcao, { body: corpo });
  if (error) {
    let mensagem = 'Não foi possível falar com o servidor. Verifique a internet e tente de novo.';
    try {
      const detalhe = await (error as { context?: Response }).context?.json();
      if (detalhe?.erro) mensagem = detalhe.erro;
    } catch {}
    throw new Error(mensagem);
  }
  return data as T;
}

/** Envia o PDF do contrato para o serviço de assinatura e devolve o link para o cliente assinar. */
export async function enviarContrato(params: {
  locacao: Locacao;
  cliente: Cliente;
  pdfBase64: string | null;
}): Promise<{ link: string; idExterno?: string; simulado: boolean }> {
  if (!supabase) {
    return { link: `https://assinatura.exemplo/contrato-${params.locacao.numero}-${idDemo()}`, simulado: true };
  }
  if (!params.pdfBase64) throw new Error('Gere o contrato pelo app no celular para enviar para assinatura.');
  const r = await chamar<{ link: string; idExterno: string }>('contrato-enviar', {
    locacaoId: params.locacao.id,
    numero: params.locacao.numero,
    pdfBase64: params.pdfBase64,
    signatario: {
      nome: params.cliente.nome,
      telefone: soDigitos(params.cliente.telefone),
      email: params.cliente.email,
      documento: soDigitos(params.cliente.documento),
    },
  });
  return { ...r, simulado: false };
}

/** Gera boleto/Pix no Asaas com o vencimento escolhido. */
export async function gerarCobranca(params: {
  locacao: Locacao;
  valor: number;
  vencimento: string;
}): Promise<NovaCobranca> {
  if (!supabase) {
    return {
      id: idDemo(),
      etapa: 'aguardando',
      valor: params.valor,
      vencimento: params.vencimento,
      link: `https://boleto.exemplo/${idDemo()}`,
      simulada: true,
    };
  }
  return chamar<NovaCobranca>('cobranca-criar', {
    locacaoId: params.locacao.id,
    valor: params.valor,
    vencimento: params.vencimento,
  });
}

/** Pede ao Asaas a inclusão do débito no Serasa. */
export async function negativar(params: { locacao: Locacao; cobranca: Cobranca }): Promise<void> {
  if (!supabase || params.cobranca.simulada) return;
  await chamar('negativar', { locacaoId: params.locacao.id, cobrancaId: params.cobranca.id });
}

export async function cancelarCobranca(params: { locacao: Locacao; cobranca: Cobranca }): Promise<void> {
  if (!supabase || params.cobranca.simulada) return;
  await chamar('cobranca-cancelar', { locacaoId: params.locacao.id, cobrancaId: params.cobranca.id });
}

/** Salva a chave do Asaas da locadora no servidor (o app nunca guarda a chave). */
export async function configurarAsaas(chave: string, sandbox: boolean): Promise<{ nomeConta: string }> {
  return chamar('asaas-configurar', { chave, sandbox });
}
