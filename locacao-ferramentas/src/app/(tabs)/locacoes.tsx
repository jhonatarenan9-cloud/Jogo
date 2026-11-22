import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Botao, Cartao, Linha, Selo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { buscarFerramenta } from '@/data/ferramentas';
import { formatarData, formatarPreco } from '@/lib/format';
import { Etapa, etapaDaLocacao, fimDaLocacao, Locacao, useLocacoes } from '@/store/locacoes';

const SELO: Record<Etapa, { cor: string; fundo: string }> = {
  agendada: { cor: Cores.primariaEscura, fundo: Cores.primariaClara },
  'em andamento': { cor: Cores.sucesso, fundo: Cores.sucessoClaro },
  atrasada: { cor: Cores.perigo, fundo: Cores.perigoClaro },
  devolvida: { cor: Cores.textoSecundario, fundo: Cores.borda },
  cancelada: { cor: Cores.textoSecundario, fundo: Cores.borda },
};

const ORDEM: Etapa[] = ['atrasada', 'em andamento', 'agendada', 'devolvida', 'cancelada'];

export default function Locacoes() {
  const { locacoes, carregado } = useLocacoes();
  const { nova } = useLocalSearchParams<{ nova?: string }>();
  const [avisoVisto, setAvisoVisto] = useState(false);

  const ordenadas = [...locacoes].sort(
    (a, b) => ORDEM.indexOf(etapaDaLocacao(a)) - ORDEM.indexOf(etapaDaLocacao(b)) || (a.inicio < b.inicio ? -1 : 1),
  );

  return (
    <FlatList
      data={ordenadas}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.conteudo}
      ListHeaderComponent={
        nova && !avisoVisto && locacoes.length > 0 ? (
          <Cartao style={styles.aviso}>
            <Text style={styles.avisoTexto}>✅ Locação confirmada! Leve um documento com foto na retirada.</Text>
            <Botao titulo="Ok" variante="secundario" onPress={() => setAvisoVisto(true)} />
          </Cartao>
        ) : undefined
      }
      ListEmptyComponent={
        carregado ? (
          <View style={styles.vazio}>
            <Text style={{ fontSize: 48 }}>🧰</Text>
            <Text style={styles.vazioTitulo}>Nenhuma locação ainda</Text>
            <Text style={styles.vazioTexto}>Escolha uma ferramenta no catálogo e reserve em poucos toques.</Text>
            <Botao titulo="Ver catálogo" onPress={() => router.navigate('/')} />
          </View>
        ) : undefined
      }
      renderItem={({ item }) => <ItemLocacao l={item} />}
    />
  );
}

function ItemLocacao({ l }: { l: Locacao }) {
  const { devolver, cancelar } = useLocacoes();
  const ferramenta = buscarFerramenta(l.ferramentaId);
  const etapa = etapaDaLocacao(l);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <Cartao style={{ gap: Espaco.sm }}>
      <View style={styles.cabecalho}>
        <Text style={{ fontSize: 30 }}>{ferramenta?.emoji ?? '🔧'}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.nome}>{ferramenta?.nome ?? 'Ferramenta'}</Text>
          <Selo texto={etapa} {...SELO[etapa]} />
        </View>
      </View>
      <Linha rotulo="Retirada" valor={formatarData(l.inicio)} />
      <Linha rotulo="Devolução" valor={formatarData(fimDaLocacao(l))} />
      <Linha rotulo="Recebimento" valor={l.entrega ? 'Entrega' : 'Retirar na loja'} />
      <Linha rotulo="Total" valor={formatarPreco(l.total)} destaque />

      {etapa === 'agendada' &&
        (confirmando ? (
          <View style={styles.acoes}>
            <Botao titulo="Manter" variante="secundario" onPress={() => setConfirmando(false)} style={{ flex: 1 }} />
            <Botao titulo="Sim, cancelar" variante="perigo" onPress={() => cancelar(l.id)} style={{ flex: 1 }} />
          </View>
        ) : (
          <Botao titulo="Cancelar reserva" variante="secundario" onPress={() => setConfirmando(true)} />
        ))}
      {(etapa === 'em andamento' || etapa === 'atrasada') && (
        <Botao titulo="Marcar como devolvida" onPress={() => devolver(l.id)} />
      )}
      {etapa === 'atrasada' && (
        <Text style={styles.atraso}>O prazo acabou. Devolva logo para não pagar diárias extras.</Text>
      )}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Espaco.lg,
    gap: Espaco.md,
    width: '100%',
    maxWidth: LarguraMaxima,
    alignSelf: 'center',
    flexGrow: 1,
  },
  aviso: { backgroundColor: Cores.sucessoClaro, borderColor: Cores.sucessoClaro, gap: Espaco.md },
  avisoTexto: { fontSize: 15, color: Cores.sucesso, fontWeight: '600' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, marginBottom: Espaco.xs },
  nome: { fontSize: 16, fontWeight: '700', color: Cores.texto },
  acoes: { flexDirection: 'row', gap: Espaco.sm },
  atraso: { fontSize: 13, color: Cores.perigo },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.md, paddingVertical: 60 },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: Cores.texto },
  vazioTexto: { fontSize: 15, color: Cores.textoSecundario, textAlign: 'center', maxWidth: 280 },
});
