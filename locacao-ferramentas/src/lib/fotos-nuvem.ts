import { File } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Fotos na nuvem ficam no Storage privado do Supabase, guardadas como "sb:caminho".
 * Para mostrar, o app pede um link temporário (válido por 1 hora).
 */
export const PREFIXO_NUVEM = 'sb:';
const BUCKET = 'fotos';
const cache = new Map<string, { url: string; ate: number }>();

export function ehFotoLocal(foto?: string) {
  return !!foto && (foto.startsWith('file:') || foto.startsWith('data:') || foto.startsWith('content:'));
}

export async function urlDaFoto(foto: string): Promise<string> {
  if (!foto.startsWith(PREFIXO_NUVEM) || !supabase) return foto;
  const guardado = cache.get(foto);
  if (guardado && guardado.ate > Date.now()) return guardado.url;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(foto.slice(PREFIXO_NUVEM.length), 3600);
  const url = data?.signedUrl ?? '';
  if (url) cache.set(foto, { url, ate: Date.now() + 50 * 60 * 1000 });
  return url;
}

/** Converte a foto (local ou da nuvem) para o endereço que a tela consegue mostrar. */
export function useUrlDaFoto(foto?: string) {
  const [url, setUrl] = useState(() => (foto && !foto.startsWith(PREFIXO_NUVEM) ? foto : cache.get(foto ?? '')?.url ?? ''));
  useEffect(() => {
    if (!foto) return;
    let ativo = true;
    urlDaFoto(foto)
      .then((u) => ativo && setUrl(u))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [foto]);
  return foto ? url : '';
}

function base64ParaBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Envia uma foto local para a pasta da loja e devolve o novo identificador "sb:...". */
export async function enviarFoto(lojaId: string, foto: string): Promise<string> {
  if (!supabase) return foto;
  const bytes =
    foto.startsWith('data:')
      ? base64ParaBytes(foto.slice(foto.indexOf(',') + 1))
      : Platform.OS === 'web'
        ? new Uint8Array(await (await fetch(foto)).arrayBuffer())
        : await new File(foto).bytes();
  const caminho = `${lojaId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return PREFIXO_NUVEM + caminho;
}
