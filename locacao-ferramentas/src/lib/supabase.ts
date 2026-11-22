import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Endereço e chave pública do projeto Supabase. Ficam no arquivo .env
 * (EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY). A chave pública
 * pode ir no app: quem protege os dados são as regras de acesso do banco.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const CHAVE_PUBLICA = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null =
  URL && CHAVE_PUBLICA
    ? createClient(URL, CHAVE_PUBLICA, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

/** Sem Supabase configurado, o app roda só no aparelho e simula assinatura e cobrança. */
export const modoDemonstracao = supabase === null;
