import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SeloEtapa } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { diasEntre, formatarDataRelativa, formatarPreco } from '@/lib/format';
import { etapaDaLocacao, previsaoDevolucao, saldoDevedor } from '@/lib/calculos';
import { useDados } from '@/store/dados';
import type { Locacao } from '@/store/tipos';

export function resumoItens(l: Locacao) {
  return l.itens.map((i) => (i.qtd > 1 ? `${i.qtd}× ${i.nome}` : i.nome)).join(', ');
}

export function LinhaLocacao({ l, mostrarCliente = true }: { l: Locacao; mostrarCliente?: boolean }) {
  const { clientes, loja, hoje } = useDados();
  const cliente = clientes.find((c) => c.id === l.clienteId);
  const etapa = etapaDaLocacao(l, hoje);
  const saldo = saldoDevedor(l, loja, hoje);
  const previsao = previsaoDevolucao(l);

  let prazo = '';
  if (etapa === 'agendada') prazo = `Retirada ${formatarDataRelativa(l.inicio, hoje)}`;
  else if (etapa === 'atrasada') {
    const d = diasEntre(previsao, hoje);
    prazo = `${d} ${d === 1 ? 'dia' : 'dias'} de atraso`;
  } else if (etapa === 'vence hoje') prazo = 'Devolução hoje';
  else if (etapa === 'em andamento') prazo = `Devolve ${formatarDataRelativa(previsao, hoje)}`;
  else if (etapa === 'devolvida' && l.devolvidaEm) prazo = `Devolvida ${formatarDataRelativa(l.devolvidaEm, hoje)}`;
  else prazo = 'Cancelada';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/locacao/[id]', params: { id: l.id } })}
      style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.topo}>
          <Text style={styles.numero}>#{l.numero}</Text>
          <Text style={styles.nome} numberOfLines={1}>
            {mostrarCliente ? (cliente?.nome ?? 'Cliente removido') : resumoItens(l)}
          </Text>
        </View>
        {mostrarCliente && (
          <Text style={styles.itens} numberOfLines={1}>
            {resumoItens(l)}
          </Text>
        )}
        <Text style={[styles.prazo, etapa === 'atrasada' && { color: Cores.perigo, fontWeight: '700' }]}>{prazo}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SeloEtapa etapa={etapa} />
        {saldo > 0 && etapa !== 'cancelada' ? <Text style={styles.saldo}>falta {formatarPreco(saldo)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    gap: Espaco.md,
    backgroundColor: Cores.cartao,
    borderRadius: Raio.lg,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  topo: { flexDirection: 'row', gap: Espaco.sm, alignItems: 'baseline' },
  numero: { fontSize: 13, color: Cores.textoSecundario, fontWeight: '700', fontVariant: ['tabular-nums'] },
  nome: { flex: 1, fontSize: 16, fontWeight: '700', color: Cores.texto },
  itens: { fontSize: 14, color: Cores.textoSecundario },
  prazo: { fontSize: 13, color: Cores.textoSecundario },
  saldo: { fontSize: 13, fontWeight: '700', color: Cores.perigo, fontVariant: ['tabular-nums'] },
});
