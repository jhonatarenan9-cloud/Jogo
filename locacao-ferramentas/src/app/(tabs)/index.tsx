import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, Selo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { Categoria, CATEGORIAS, Ferramenta, FERRAMENTAS } from '@/data/ferramentas';
import { formatarPreco, hojeISO } from '@/lib/format';
import { useLocacoes } from '@/store/locacoes';

function normalizar(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function Catalogo() {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const { disponiveis } = useLocacoes();

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    return FERRAMENTAS.filter(
      (f) =>
        (!categoria || f.categoria === categoria) &&
        (!termo || normalizar(`${f.nome} ${f.categoria} ${f.descricao}`).includes(termo)),
    );
  }, [busca, categoria]);

  return (
    <FlatList
      data={lista}
      keyExtractor={(f) => f.id}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.md }}>
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar furadeira, escada, lavadora…"
            placeholderTextColor={Cores.textoSecundario}
            style={styles.busca}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip rotulo="Todas" ativo={!categoria} onPress={() => setCategoria(null)} />
            {CATEGORIAS.map((c) => (
              <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.vazio}>Nenhuma ferramenta encontrada para “{busca}”.</Text>
      }
      renderItem={({ item }) => <ItemFerramenta f={item} livres={disponiveis(item.id, hojeISO(), 1)} />}
    />
  );
}

function ItemFerramenta({ f, livres }: { f: Ferramenta; livres: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/ferramenta/[id]', params: { id: f.id } })}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}>
      <View style={styles.emojiCaixa}>
        <Text style={styles.emoji}>{f.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.nome} numberOfLines={1}>
          {f.nome}
        </Text>
        <Text style={styles.categoria}>{f.categoria}</Text>
        {livres > 0 ? (
          <Selo texto={`${livres} disponíve${livres > 1 ? 'is' : 'l'} hoje`} cor={Cores.sucesso} fundo={Cores.sucessoClaro} />
        ) : (
          <Selo texto="Alugada hoje" cor={Cores.aviso} fundo={Cores.avisoClaro} />
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.preco}>{formatarPreco(f.precoDia)}</Text>
        <Text style={styles.porDia}>por dia</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Espaco.lg,
    gap: Espaco.md,
    width: '100%',
    maxWidth: LarguraMaxima,
    alignSelf: 'center',
  },
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
  chips: { gap: Espaco.sm, paddingRight: Espaco.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.cartao,
    borderRadius: Raio.lg,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  emojiCaixa: {
    width: 60,
    height: 60,
    borderRadius: Raio.md,
    backgroundColor: Cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
  nome: { fontSize: 16, fontWeight: '700', color: Cores.texto },
  categoria: { fontSize: 13, color: Cores.textoSecundario },
  preco: { fontSize: 16, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  porDia: { fontSize: 12, color: Cores.textoSecundario },
  vazio: { textAlign: 'center', color: Cores.textoSecundario, marginTop: Espaco.xl },
});
