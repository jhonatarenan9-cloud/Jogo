import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { LinhaLocacao } from '@/components/linha-locacao';
import { Botao, Busca, Chip, Vazio } from '@/components/ui';
import { Espaco, LarguraMaxima } from '@/constants/theme';
import { Etapa, etapaDaLocacao, estaAberta } from '@/lib/calculos';
import { normalizar } from '@/lib/format';
import { abrirCriacao } from '@/lib/navegar';
import { useDados } from '@/store/dados';
import type { Locacao } from '@/store/tipos';

const FILTROS = ['Abertas', 'Atrasadas', 'Hoje', 'Finalizadas', 'Todas'] as const;
type Filtro = (typeof FILTROS)[number];

const ORDEM: Etapa[] = ['atrasada', 'vence hoje', 'em andamento', 'agendada', 'devolvida', 'cancelada'];

function passaNoFiltro(l: Locacao, f: Filtro, hoje: string) {
  const e = etapaDaLocacao(l, hoje);
  if (f === 'Abertas') return estaAberta(l);
  if (f === 'Atrasadas') return e === 'atrasada';
  if (f === 'Hoje') return e === 'vence hoje' || (estaAberta(l) && l.inicio === hoje);
  if (f === 'Finalizadas') return !estaAberta(l);
  return true;
}

export default function Locacoes() {
  const { locacoes, clientes, hoje, podeCriar } = useDados();
  const [filtro, setFiltro] = useState<Filtro>('Abertas');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim().replace(/^#/, ''));
    const nomes = new Map(clientes.map((c) => [c.id, normalizar(c.nome)]));
    return locacoes
      .filter((l) => passaNoFiltro(l, filtro, hoje))
      .filter(
        (l) =>
          !termo ||
          String(l.numero) === termo ||
          (nomes.get(l.clienteId) ?? '').includes(termo) ||
          l.itens.some((i) => normalizar(i.nome).includes(termo)),
      )
      .sort((a, b) => {
        const ordem = ORDEM.indexOf(etapaDaLocacao(a, hoje)) - ORDEM.indexOf(etapaDaLocacao(b, hoje));
        return ordem || b.numero - a.numero;
      });
  }, [locacoes, clientes, filtro, busca, hoje]);

  return (
    <FlatList
      data={lista}
      keyExtractor={(l) => l.id}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.xs }}>
          <Botao titulo="+ Nova locação" onPress={() => abrirCriacao('locacoes', podeCriar)} />
          <Busca valor={busca} onChange={setBusca} placeholder="Buscar por cliente, item ou nº" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
            {FILTROS.map((f) => (
              <Chip key={f} rotulo={f} ativo={filtro === f} onPress={() => setFiltro(f)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <Vazio
          emoji="📋"
          titulo={locacoes.length === 0 ? 'Nenhuma locação registrada' : 'Nada por aqui'}
          texto={locacoes.length === 0 ? 'Toque em “Nova locação” para registrar a primeira.' : 'Nenhuma locação neste filtro.'}
        />
      }
      renderItem={({ item }) => <LinhaLocacao l={item} />}
    />
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Espaco.lg,
    gap: Espaco.sm,
    width: '100%',
    maxWidth: LarguraMaxima,
    alignSelf: 'center',
  },
});
