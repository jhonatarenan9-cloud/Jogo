import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';
import { formatarData } from '@/lib/format';
import { useDados } from '@/store/dados';

/** Faixa que mostra o plano atual e quanto falta para o limite do Grátis. */
export function AvisoPlano() {
  const { ehPro, emTeste, plano, uso, limites } = useDados();

  if (ehPro && !emTeste) return null;

  const texto = emTeste
    ? `Teste do Pro até ${formatarData(plano.testeAte!)}`
    : `Plano Grátis · ${uso.locacoes} de ${limites.locacoes} locações este mês`;
  const perto = !ehPro && uso.locacoes >= limites.locacoes - 3;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/plano')}
      style={[styles.faixa, perto && { backgroundColor: Cores.avisoClaro, borderColor: Cores.avisoClaro }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.texto}>{texto}</Text>
        {!ehPro && (
          <View style={styles.barra}>
            <View style={[styles.preenchido, { width: `${Math.min(100, (uso.locacoes / limites.locacoes) * 100)}%` }]} />
          </View>
        )}
      </View>
      <Text style={styles.link}>{emTeste ? 'Assinar' : 'Ver Pro'} ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.primariaClara,
    borderRadius: Raio.md,
    borderWidth: 1,
    borderColor: Cores.primariaClara,
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.md,
  },
  texto: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  barra: { height: 6, borderRadius: 3, backgroundColor: '#fff', overflow: 'hidden' },
  preenchido: { height: 6, borderRadius: 3, backgroundColor: Cores.primaria },
  link: { fontSize: 14, fontWeight: '800', color: Cores.primariaEscura },
});
