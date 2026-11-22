import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Botao, Busca, Selo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { unidadesLivres } from '@/lib/calculos';
import { formatarPreco, normalizar, somarDias } from '@/lib/format';
import { abrirCriacao } from '@/lib/navegar';
import { useDados } from '@/store/dados';

export default function Estoque() {
  const { itens, locacoes, hoje, podeCriar, ehPro, uso, limites } = useDados();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    return itens
      .filter((i) => !termo || normalizar(`${i.nome} ${i.categoria}`).includes(termo))
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  }, [itens, busca]);

  return (
    <FlatList
      data={lista}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.xs }}>
          <Botao
            titulo={ehPro ? '+ Adicionar item' : `+ Adicionar item (${uso.itens} de ${limites.itens})`}
            onPress={() => abrirCriacao('itens', podeCriar)}
          />
          {itens.length > 0 && <Busca valor={busca} onChange={setBusca} placeholder="Buscar item ou categoria" />}
        </View>
      }
      ListEmptyComponent={
        <Vazio
          emoji="🧰"
          titulo={itens.length === 0 ? 'Seu estoque está vazio' : 'Nenhum item encontrado'}
          texto={itens.length === 0 ? 'Cadastre o que você aluga, com o preço da diária e quantas unidades tem.' : undefined}
        />
      }
      renderItem={({ item }) => {
        const livres = unidadesLivres(item, hoje, somarDias(hoje, 1), locacoes, hoje);
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.sub}>
                {item.categoria || 'Sem categoria'} · {formatarPreco(item.precoDia)}/dia
              </Text>
            </View>
            {livres === 0 ? (
              <Selo texto="todos fora" cor={Cores.perigo} fundo={Cores.perigoClaro} />
            ) : (
              <Selo
                texto={`${livres} de ${item.quantidade} livre${livres > 1 ? 's' : ''}`}
                cor={livres < item.quantidade ? Cores.aviso : Cores.sucesso}
                fundo={livres < item.quantidade ? Cores.avisoClaro : Cores.sucessoClaro}
              />
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.sm, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.cartao,
    borderRadius: Raio.lg,
    borderWidth: 1,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  nome: { fontSize: 16, fontWeight: '700', color: Cores.texto },
  sub: { fontSize: 14, color: Cores.textoSecundario },
});
