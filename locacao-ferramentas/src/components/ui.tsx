import { ReactNode } from 'react';
import { KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';
import { Etapa } from '@/lib/calculos';
import { formatarDataRelativa, somarDias } from '@/lib/format';

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

export function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  teclado,
  multilinha,
  prefixo,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  multilinha?: boolean;
  prefixo?: string;
}) {
  return (
    <View style={{ gap: Espaco.xs, flex: 1 }}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.inputCaixa}>
        {prefixo ? <Text style={styles.prefixo}>{prefixo}</Text> : null}
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Cores.textoSecundario}
          keyboardType={teclado}
          multiline={multilinha}
          style={[styles.input, multilinha && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
          accessibilityLabel={rotulo}
        />
      </View>
    </View>
  );
}

export function Busca({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={valor}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Cores.textoSecundario}
      style={styles.busca}
      accessibilityLabel={placeholder}
      clearButtonMode="while-editing"
    />
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <View style={styles.tituloLinha}>
      <Text style={styles.titulo}>{children}</Text>
      {acao}
    </View>
  );
}

export function Vazio({ emoji, titulo, texto, children }: { emoji: string; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <View style={styles.vazio}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={styles.vazioTitulo}>{titulo}</Text>
      {texto ? <Text style={styles.vazioTexto}>{texto}</Text> : null}
      {children}
    </View>
  );
}

/** Botão pequeno de "−" ou "+". */
export function BotaoPasso({ sinal, onPress, desativado, rotulo }: { sinal: '−' | '+'; onPress: () => void; desativado?: boolean; rotulo: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      disabled={desativado}
      hitSlop={6}
      style={[styles.passo, desativado && { opacity: 0.35 }]}>
      <Text style={styles.passoTexto}>{sinal}</Text>
    </Pressable>
  );
}

export function Contador({
  valor,
  onChange,
  min = 0,
  max = 999,
  rotulo,
}: {
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  rotulo: string;
}) {
  return (
    <View style={styles.contador}>
      <BotaoPasso sinal="−" rotulo={`Diminuir ${rotulo}`} onPress={() => onChange(Math.max(min, valor - 1))} desativado={valor <= min} />
      <Text style={styles.contadorValor}>{valor}</Text>
      <BotaoPasso sinal="+" rotulo={`Aumentar ${rotulo}`} onPress={() => onChange(Math.min(max, valor + 1))} desativado={valor >= max} />
    </View>
  );
}

export function SeletorData({ valor, onChange, rotulo }: { valor: string; onChange: (v: string) => void; rotulo: string }) {
  return (
    <View style={styles.contador}>
      <BotaoPasso sinal="−" rotulo={`${rotulo}: dia anterior`} onPress={() => onChange(somarDias(valor, -1))} />
      <Text style={[styles.contadorValor, { minWidth: 130, fontSize: 16 }]}>{formatarDataRelativa(valor)}</Text>
      <BotaoPasso sinal="+" rotulo={`${rotulo}: próximo dia`} onPress={() => onChange(somarDias(valor, 1))} />
    </View>
  );
}

const CORES_ETAPA: Record<Etapa, { cor: string; fundo: string }> = {
  agendada: { cor: Cores.primariaEscura, fundo: Cores.primariaClara },
  'em andamento': { cor: Cores.sucesso, fundo: Cores.sucessoClaro },
  'vence hoje': { cor: Cores.aviso, fundo: Cores.avisoClaro },
  atrasada: { cor: Cores.perigo, fundo: Cores.perigoClaro },
  devolvida: { cor: Cores.textoSecundario, fundo: Cores.borda },
  cancelada: { cor: Cores.textoSecundario, fundo: Cores.borda },
};

export function SeloEtapa({ etapa }: { etapa: Etapa }) {
  return <Selo texto={etapa} {...CORES_ETAPA[etapa]} />;
}

const styles = StyleSheet.create({
  rotulo: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  inputCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.cartao,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: Raio.md,
    paddingHorizontal: Espaco.md,
  },
  prefixo: { color: Cores.textoSecundario, fontSize: 16, marginRight: Espaco.xs },
  input: { flex: 1, minHeight: 48, fontSize: 16, color: Cores.texto },
  busca: {
    backgroundColor: Cores.cartao,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: Raio.md,
    paddingHorizontal: Espaco.lg,
    minHeight: 48,
    fontSize: 16,
    color: Cores.texto,
  },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Espaco.sm },
  titulo: { fontSize: 17, fontWeight: '800', color: Cores.texto },
  vazio: { alignItems: 'center', gap: Espaco.sm, paddingVertical: Espaco.xl * 2, paddingHorizontal: Espaco.lg },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: Cores.texto, textAlign: 'center' },
  vazioTexto: { fontSize: 15, color: Cores.textoSecundario, textAlign: 'center', maxWidth: 300, marginBottom: Espaco.sm },
  passo: {
    width: 40,
    height: 40,
    borderRadius: Raio.pill,
    backgroundColor: Cores.cartao,
    borderWidth: 1,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { fontSize: 22, color: Cores.texto, fontWeight: '600', lineHeight: 24 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  contadorValor: { fontSize: 18, fontWeight: '800', color: Cores.texto, minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
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
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
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
