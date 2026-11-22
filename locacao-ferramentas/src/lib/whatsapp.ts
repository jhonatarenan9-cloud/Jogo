import { Linking } from 'react-native';

/** Abre uma conversa no WhatsApp com o número (DDD + número) e a mensagem prontos. */
export function abrirWhatsApp(telefone: string, mensagem: string) {
  let digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  const url = `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
  Linking.openURL(url).catch(() => {});
}

export function temWhatsApp(telefone: string) {
  return telefone.replace(/\D/g, '').length >= 10;
}
