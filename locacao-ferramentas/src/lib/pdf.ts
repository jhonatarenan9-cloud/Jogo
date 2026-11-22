import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { htmlContrato, htmlRecibo } from '@/lib/contrato';
import { fotoParaPdf } from '@/lib/fotos';
import type { Cliente, Locacao, Loja } from '@/store/tipos';

export async function montarHtmlContrato(loja: Loja, cliente: Cliente, locacao: Locacao, hoje: string) {
  const fotos: Record<string, string> = {};
  for (const i of locacao.itens) fotos[i.itemId] = await fotoParaPdf(i.foto);
  const vistoria = (await Promise.all(locacao.fotosRetirada.map(fotoParaPdf))).filter(Boolean);
  return htmlContrato({ loja, cliente, locacao, fotos, fotosVistoria: vistoria, hoje });
}

export function montarHtmlRecibo(loja: Loja, cliente: Cliente | undefined, locacao: Locacao, hoje: string) {
  return htmlRecibo({ loja, cliente, locacao, hoje });
}

/** Gera o PDF. Devolve o arquivo e o conteúdo em base64 (para enviar ao serviço de assinatura). */
export async function gerarPdf(html: string) {
  if (Platform.OS === 'web') return null; // na web o navegador imprime/salva a partir da visualização
  return Print.printToFileAsync({ html, base64: true });
}

/** Abre o menu do celular para mandar o PDF (WhatsApp, e-mail, salvar). */
export async function compartilharPdf(html: string, titulo: string) {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const pdf = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: titulo });
  } else {
    await Print.printAsync({ uri: pdf.uri });
  }
}
