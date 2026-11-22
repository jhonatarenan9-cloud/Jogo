import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Cartao, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { mesDe, saldoDevedor } from '@/lib/calculos';
import { formatarPreco, nomeDoMes } from '@/lib/format';
import { useDados } from '@/store/dados';

function ultimosMeses(hoje: string, n: number) {
  const [a, m] = hoje.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(a, m - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

export default function Relatorios() {
  const { carregado, ehPro, locacoes, clientes, loja, hoje } = useDados();

  const dados = useMemo(() => {
    const meses = ultimosMeses(hoje, 6).map((mes) => ({
      mes,
      recebido: locacoes
        .flatMap((l) => l.pagamentos)
        .filter((p) => mesDe(p.data) === mes)
        .reduce((s, p) => s + p.valor, 0),
      locacoes: locacoes.filter((l) => l.situacao !== 'cancelada' && mesDe(l.inicio) === mes).length,
    }));

    const porItem = new Map<string, { nome: string; vezes: number; diarias: number; valor: number }>();
    for (const l of locacoes) {
      if (l.situacao === 'cancelada') continue;
      for (const i of l.itens) {
        const atual = porItem.get(i.itemId) ?? { nome: i.nome, vezes: 0, diarias: 0, valor: 0 };
        atual.vezes += 1;
        atual.diarias += i.qtd * l.dias;
        atual.valor += i.precoDia * i.qtd * l.dias;
        porItem.set(i.itemId, atual);
      }
    }
    const topItens = [...porItem.values()].sort((a, b) => b.valor - a.valor).slice(0, 5);

    const devedores = clientes
      .map((c) => ({
        c,
        deve: locacoes.filter((l) => l.clienteId === c.id).reduce((s, l) => s + saldoDevedor(l, loja, hoje), 0),
      }))
      .filter((x) => x.deve > 0)
      .sort((a, b) => b.deve - a.deve);

    return { meses, topItens, devedores };
  }, [locacoes, clientes, loja, hoje]);

  if (!carregado) return null;
  if (!ehPro) {
    return (
      <Vazio
        emoji="📊"
        titulo="Relatórios são do plano Pro"
        texto="Veja quanto entrou em cada mês, quais itens dão mais dinheiro e quem está devendo.">
        <Botao titulo="Conhecer o Pro" onPress={() => router.replace({ pathname: '/plano', params: { motivo: 'relatorios' } })} />
      </Vazio>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <Titulo>Recebido por mês</Titulo>
      <Cartao style={{ gap: 0, paddingVertical: Espaco.sm }}>
        <Cabecalho colunas={['Mês', 'Locações', 'Recebido']} />
        {dados.meses.map((m) => (
          <LinhaTabela key={m.mes} colunas={[nomeDoMes(m.mes), String(m.locacoes), formatarPreco(m.recebido)]} />
        ))}
      </Cartao>

      <Titulo>Itens que mais faturam</Titulo>
      <Cartao style={{ gap: 0, paddingVertical: Espaco.sm }}>
        {dados.topItens.length === 0 ? (
          <Text style={styles.vazio}>Ainda não há locações.</Text>
        ) : (
          <>
            <Cabecalho colunas={['Item', 'Diárias', 'Valor']} />
            {dados.topItens.map((i) => (
              <LinhaTabela key={i.nome} colunas={[i.nome, String(i.diarias), formatarPreco(i.valor)]} />
            ))}
          </>
        )}
      </Cartao>

      <Titulo>Quem está devendo</Titulo>
      <Cartao style={{ gap: 0, paddingVertical: Espaco.sm }}>
        {dados.devedores.length === 0 ? (
          <Text style={styles.vazio}>Ninguém devendo. 👏</Text>
        ) : (
          dados.devedores.map(({ c, deve }) => <LinhaTabela key={c.id} colunas={[c.nome, '', formatarPreco(deve)]} alerta />)
        )}
      </Cartao>
    </ScrollView>
  );
}

function Cabecalho({ colunas }: { colunas: string[] }) {
  return (
    <View style={[styles.linha, { borderTopWidth: 0 }]}>
      {colunas.map((c, i) => (
        <Text key={i} style={[styles.celula, i === 0 && styles.primeira, styles.cabecalho]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

function LinhaTabela({ colunas, alerta }: { colunas: string[]; alerta?: boolean }) {
  return (
    <View style={styles.linha}>
      {colunas.map((c, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={[styles.celula, i === 0 && styles.primeira, alerta && i === colunas.length - 1 && { color: Cores.perigo, fontWeight: '700' }]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  linha: { flexDirection: 'row', paddingVertical: Espaco.sm, borderTopWidth: 1, borderTopColor: Cores.borda, gap: Espaco.sm },
  celula: { flex: 1, fontSize: 14, color: Cores.texto, textAlign: 'right', fontVariant: ['tabular-nums'] },
  primeira: { flex: 2, textAlign: 'left' },
  cabecalho: { fontSize: 12, fontWeight: '700', color: Cores.textoSecundario, textTransform: 'uppercase' },
  vazio: { fontSize: 14, color: Cores.textoSecundario, paddingVertical: Espaco.sm },
});
