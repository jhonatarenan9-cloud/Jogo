import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AvisoPlano } from '@/components/aviso-plano';
import { LinhaLocacao } from '@/components/linha-locacao';
import { Botao, Cartao, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { estaAberta, etapaDaLocacao, mesDe, saldoDevedor } from '@/lib/calculos';
import { formatarPreco } from '@/lib/format';
import { abrirCriacao } from '@/lib/navegar';
import { useDados } from '@/store/dados';

export default function Inicio() {
  const { carregado, locacoes, itens, clientes, loja, hoje, podeCriar, carregarExemplo } = useDados();

  const resumo = useMemo(() => {
    const abertas = locacoes.filter(estaAberta);
    const atrasadas = abertas.filter((l) => etapaDaLocacao(l, hoje) === 'atrasada');
    const venceHoje = abertas.filter((l) => etapaDaLocacao(l, hoje) === 'vence hoje');
    const retiradasHoje = abertas.filter((l) => l.inicio === hoje && etapaDaLocacao(l, hoje) !== 'vence hoje');
    const recebidoMes = locacoes
      .flatMap((l) => l.pagamentos)
      .filter((p) => mesDe(p.data) === mesDe(hoje))
      .reduce((s, p) => s + p.valor, 0);
    const aReceber = locacoes.reduce((s, l) => s + saldoDevedor(l, loja, hoje), 0);
    return { abertas, atrasadas, venceHoje, retiradasHoje, recebidoMes, aReceber };
  }, [locacoes, loja, hoje]);

  if (!carregado) return null;

  const semNada = itens.length === 0 && clientes.length === 0 && locacoes.length === 0;
  if (semNada) {
    return (
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Vazio
          emoji="🧰"
          titulo="Bem-vindo ao controle da sua locadora"
          texto="Cadastre seus itens e clientes e registre cada locação. O app avisa quem está atrasado e quanto falta receber.">
          <Botao titulo="Cadastrar meu primeiro item" onPress={() => abrirCriacao('itens', podeCriar)} style={{ alignSelf: 'stretch' }} />
          <Botao titulo="Ver com dados de exemplo" variante="secundario" onPress={carregarExemplo} style={{ alignSelf: 'stretch' }} />
        </Vazio>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <AvisoPlano />

      <View style={styles.grade}>
        <Indicador rotulo="Locações abertas" valor={String(resumo.abertas.length)} />
        <Indicador
          rotulo="Atrasadas"
          valor={String(resumo.atrasadas.length)}
          alerta={resumo.atrasadas.length > 0}
        />
        <Indicador rotulo="Recebido no mês" valor={formatarPreco(resumo.recebidoMes)} />
        <Indicador rotulo="A receber" valor={formatarPreco(resumo.aReceber)} alerta={resumo.aReceber > 0} />
      </View>

      <Botao titulo="+ Nova locação" onPress={() => abrirCriacao('locacoes', podeCriar)} />

      <Secao titulo="Atrasadas" lista={resumo.atrasadas} vazio="Nenhuma locação atrasada. 👏" />
      <Secao titulo="Devolvem hoje" lista={resumo.venceHoje} vazio="Nenhuma devolução prevista para hoje." />
      {resumo.retiradasHoje.length > 0 && <Secao titulo="Retiradas de hoje" lista={resumo.retiradasHoje} vazio="" />}

      <Botao titulo="Relatórios" variante="secundario" onPress={() => router.push('/relatorios')} />
    </ScrollView>
  );
}

function Indicador({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <Cartao style={styles.indicador}>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
      <Text style={[styles.indicadorValor, alerta && { color: Cores.perigo }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </Cartao>
  );
}

function Secao({ titulo, lista, vazio }: { titulo: string; lista: ReturnType<typeof useDados>['locacoes']; vazio: string }) {
  return (
    <View style={{ gap: Espaco.sm }}>
      <Titulo>
        {titulo} {lista.length > 0 ? `(${lista.length})` : ''}
      </Titulo>
      {lista.length === 0 ? (
        <Text style={styles.vazio}>{vazio}</Text>
      ) : (
        lista.map((l) => <LinhaLocacao key={l.id} l={l} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    padding: Espaco.lg,
    gap: Espaco.md,
    width: '100%',
    maxWidth: LarguraMaxima,
    alignSelf: 'center',
    paddingBottom: Espaco.xl * 2,
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  indicador: { flexGrow: 1, flexBasis: '45%', gap: 4, padding: Espaco.md },
  indicadorRotulo: { fontSize: 13, color: Cores.textoSecundario, fontWeight: '600' },
  indicadorValor: { fontSize: 22, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  vazio: { fontSize: 14, color: Cores.textoSecundario },
});
