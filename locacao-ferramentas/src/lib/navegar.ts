import { router } from 'expo-router';

import type { Recurso } from '@/store/dados';

/**
 * Abre o formulário de criação, ou a tela do plano Pro se o limite
 * do plano Grátis já foi atingido.
 */
export function abrirCriacao(recurso: Recurso, podeCriar: (r: Recurso) => boolean) {
  if (!podeCriar(recurso)) {
    router.push({ pathname: '/plano', params: { motivo: recurso } });
    return;
  }
  if (recurso === 'locacoes') router.push('/locacao/nova');
  if (recurso === 'itens') router.push({ pathname: '/item/[id]', params: { id: 'novo' } });
  if (recurso === 'clientes') router.push({ pathname: '/cliente/[id]', params: { id: 'novo' } });
}
