import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';

type BotaoProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  desativado?: boolean;
  style?: ViewStyle;
};

export function Botao({ titulo, onPress, variante = 'primario', desativado, style }: BotaoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desativado}
      style={({ pressed }) => [
        styles.botao,
        variante === 'primario' && styles.botaoPrimario,
        variante === 'secundario' && styles.botaoSecundario,
        variante === 'perigo' && styles.botaoPerigo,
        desativado && styles.botaoDesativado,
        pressed && !desativado && { opacity: 0.8 },
        style,
      ]}>
      <Text
        style={[
          styles.botaoTexto,
          variante === 'secundario' && { color: Cores.texto },
          variante === 'perigo' && { color: Cores.perigo },
        ]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

export function Chip({
  rotulo,
  ativo,
  onPress,
}: {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[styles.chip, ativo && styles.chipAtivo]}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.cartao, style]}>{children}</View>;
}

export function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[styles.selo, { backgroundColor: fundo }]}>
      <Text style={[styles.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function Linha({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.linha}>
      <Text style={[styles.linhaRotulo, destaque && styles.linhaDestaque]}>{rotulo}</Text>
      <Text style={[styles.linhaValor, destaque && styles.linhaDestaque]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 48,
    paddingHorizontal: Espaco.lg,
    borderRadius: Raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoPrimario: { backgroundColor: Cores.primaria },
  botaoSecundario: { backgroundColor: Cores.cartao, borderWidth: 1, borderColor: Cores.borda },
  botaoPerigo: { backgroundColor: Cores.perigoClaro },
  botaoDesativado: { opacity: 0.45 },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chip: {
    paddingHorizontal: Espaco.md,
    paddingVertical: Espaco.sm,
    borderRadius: Raio.pill,
    backgroundColor: Cores.cartao,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  chipAtivo: { backgroundColor: Cores.texto, borderColor: Cores.texto },
  chipTexto: { color: Cores.texto, fontSize: 14, fontWeight: '600' },
  chipTextoAtivo: { color: '#fff' },
  cartao: {
    backgroundColor: Cores.cartao,
    borderRadius: Raio.lg,
    padding: Espaco.lg,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: Espaco.sm,
    paddingVertical: 2,
    borderRadius: Raio.pill,
  },
  seloTexto: { fontSize: 12, fontWeight: '700' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  linhaRotulo: { color: Cores.textoSecundario, fontSize: 15 },
  linhaValor: { color: Cores.texto, fontSize: 15, fontVariant: ['tabular-nums'] },
  linhaDestaque: { color: Cores.texto, fontSize: 17, fontWeight: '800' },
});
