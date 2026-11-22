import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { estaAberta, previsaoDevolucao } from '@/lib/calculos';
import { deISO, diasEntre, somarDias } from '@/lib/format';
import { modoDemonstracao } from '@/lib/supabase';
import { useDados } from '@/store/dados';
import type { Cliente, Locacao } from '@/store/tipos';

/**
 * Tarefas que rodam sozinhas enquanto o app está aberto:
 * - marca boletos vencidos;
 * - no modo demonstração, simula a negativação automática (no servidor real, quem faz isso é a rotina diária do servidor);
 * - agenda os avisos de devolução no celular do dono da loja.
 */
export function useRotinas() {
  const { carregado, locacoes, clientes, loja, hoje, atualizarCobranca } = useDados();

  useEffect(() => {
    if (!carregado) return;
    for (const l of locacoes) {
      for (const c of l.cobrancas) {
        if (c.etapa === 'aguardando' && c.vencimento < hoje) {
          atualizarCobranca(l.id, c.id, { etapa: 'vencida' }, 'Boleto venceu sem pagamento');
        } else if (
          c.etapa === 'vencida' &&
          c.simulada &&
          modoDemonstracao &&
          loja.negativarAuto &&
          diasEntre(c.vencimento, hoje) >= loja.diasParaNegativar
        ) {
          atualizarCobranca(
            l.id,
            c.id,
            { etapa: 'negativada', negativadaEm: new Date().toISOString() },
            `Negativação automática no Serasa após ${loja.diasParaNegativar} dias (simulação)`,
          );
        }
      }
    }
  }, [carregado, locacoes, loja.negativarAuto, loja.diasParaNegativar, hoje, atualizarCobranca]);

  useEffect(() => {
    if (!carregado || Platform.OS === 'web') return;
    const t = setTimeout(() => {
      agendarLembretes(loja.lembretes ? locacoes : [], clientes).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [carregado, locacoes, clientes, loja.lembretes]);
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

const HORA_AVISO = 8;

function as8h(iso: string) {
  const d = deISO(iso);
  d.setHours(HORA_AVISO, 0, 0, 0);
  return d;
}

/** Refaz todos os avisos: no dia da devolução e no dia seguinte, se ainda não voltou. */
async function agendarLembretes(locacoes: Locacao[], clientes: Cliente[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const abertas = locacoes.filter(estaAberta);
  if (abertas.length === 0) return;
  const permissao = await Notifications.getPermissionsAsync();
  if (!permissao.granted) {
    const pedido = await Notifications.requestPermissionsAsync();
    if (!pedido.granted) return;
  }
  const agora = Date.now();
  let agendados = 0;
  for (const l of abertas) {
    if (agendados >= 60) break; // limite do iOS para avisos agendados
    const nome = clientes.find((c) => c.id === l.clienteId)?.nome ?? 'Cliente';
    const itens = l.itens.map((i) => i.nome).join(', ');
    const previsao = previsaoDevolucao(l);
    const avisos = [
      { quando: as8h(previsao), titulo: `Devolução hoje: ${nome}`, texto: `Locação nº ${l.numero}: ${itens}` },
      { quando: as8h(somarDias(previsao, 1)), titulo: `Atrasada: ${nome}`, texto: `A locação nº ${l.numero} (${itens}) não foi devolvida.` },
    ];
    for (const a of avisos) {
      if (a.quando.getTime() <= agora) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: a.titulo, body: a.texto, data: { locacaoId: l.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.quando },
      });
      agendados++;
    }
  }
}
