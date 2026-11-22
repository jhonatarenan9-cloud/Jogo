import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Botao, Busca, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { estaAberta, saldoDevedor } from '@/lib/calculos';
import { formatarPreco, normalizar } from '@/lib/format';
import { abrirCriacao } from '@/lib/navegar';
import { useDados } from '@/store/dados';

export default function Clientes() {
  const { clientes, locacoes, loja, hoje, podeCriar, ehPro, uso, limites } = useDados();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    const digitos = busca.replace(/\D/g, '');
    return clientes
      .filter(
        (c) =>
          !termo ||
          normalizar(c.nome).includes(termo) ||
          (digitos.length >= 3 && (c.telefone + c.documento).replace(/\D/g, '').includes(digitos)),
      )
      .map((c) => {
        const delas = locacoes.filter((l) => l.clienteId === c.id);
        return {
          ...c,
          total: delas.length,
          abertas: delas.filter(estaAberta).length,
          deve: delas.reduce((s, l) => s + saldoDevedor(l, loja, hoje), 0),
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientes, locacoes, loja, hoje, busca]);

  return (
    <FlatList
      data={lista}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.xs }}>
          <Botao
            titulo={ehPro ? '+ Novo cliente' : `+ Novo cliente (${uso.clientes} de ${limites.clientes})`}
            onPress={() => abrirCriacao('clientes', podeCriar)}
          />
          {clientes.length > 0 && <Busca valor={busca} onChange={setBusca} placeholder="Buscar por nome, telefone ou CPF" />}
        </View>
      }
      ListEmptyComponent={
        <Vazio
          emoji="👥"
          titulo={clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
          texto={clientes.length === 0 ? 'Você também pode cadastrar o cliente na hora de registrar a locação.' : undefined}
        />
      }
      renderItem={({ item: c }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: c.id } })}
          style={({ pressed }) => [styles.linha, pressed && { opacity: 0.8 }]}>
          <View style={styles.avatar}>
            <Text style={styles.inicial}>{c.nome.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.nome} numberOfLines={1}>
              {c.nome}
            </Text>
            <Text style={styles.sub}>
              {c.telefone || 'Sem telefone'} · {c.total} {c.total === 1 ? 'locação' : 'locações'}
              {c.abertas ? ` (${c.abertas} aberta${c.abertas > 1 ? 's' : ''})` : ''}
            </Text>
          </View>
          {c.deve > 0 && <Text style={styles.deve}>deve {formatarPreco(c.deve)}</Text>}
        </Pressable>
      )}
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { fontSize: 17, fontWeight: '800', color: Cores.primariaEscura },
  nome: { fontSize: 16, fontWeight: '700', color: Cores.texto },
  sub: { fontSize: 13, color: Cores.textoSecundario },
  deve: { fontSize: 13, fontWeight: '700', color: Cores.perigo, fontVariant: ['tabular-nums'] },
});
