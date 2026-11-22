import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormularioPerfil } from '@/components/formulario-perfil';
import { Botao, Cartao, Chip, Linha } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { buscarFerramenta } from '@/data/ferramentas';
import { diaDaSemana, formatarData, formatarPreco, hojeISO, somarDias } from '@/lib/format';
import { calcularOrcamento, descontoPorDias, TAXA_ENTREGA } from '@/lib/preco';
import { useLocacoes } from '@/store/locacoes';

const DIAS_RAPIDOS = [1, 3, 7, 15];

export default function DetalheFerramenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ferramenta = buscarFerramenta(id);
  const { disponiveis, alugar, perfil, carregado } = useLocacoes();
  const insets = useSafeAreaInsets();

  const datas = useMemo(() => Array.from({ length: 14 }, (_, i) => somarDias(hojeISO(), i)), []);
  const [inicio, setInicio] = useState(datas[0]);
  const [dias, setDias] = useState(1);
  const [entrega, setEntrega] = useState(false);

  if (!ferramenta) {
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>Ferramenta não encontrada.</Text>
        <Botao titulo="Voltar ao catálogo" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const livres = disponiveis(ferramenta.id, inicio, dias);
  const orcamento = calcularOrcamento(ferramenta.precoDia, dias, entrega);
  const desconto = descontoPorDias(dias);
  const precisaPerfil = !perfil.nome.trim() || !perfil.telefone.trim() || (entrega && !perfil.endereco.trim());

  function confirmar() {
    if (!ferramenta || precisaPerfil) return;
    alugar({ ferramentaId: ferramenta.id, inicio, dias, entrega });
    router.replace({ pathname: '/locacoes', params: { nova: '1' } });
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: ferramenta.nome }} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.topo}>
          <Text style={styles.emoji}>{ferramenta.emoji}</Text>
          <Text style={styles.titulo}>{ferramenta.nome}</Text>
          <Text style={styles.subtitulo}>
            {formatarPreco(ferramenta.precoDia)} por dia · caução de {formatarPreco(ferramenta.caucao)}
          </Text>
        </View>

        <Cartao style={{ gap: Espaco.sm }}>
          <Text style={styles.texto}>{ferramenta.descricao}</Text>
          {ferramenta.especificacoes.map((e) => (
            <Text key={e} style={styles.especificacao}>
              • {e}
            </Text>
          ))}
        </Cartao>

        <Text style={styles.secao}>Quando você retira?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
          {datas.map((d, i) => {
            const ativo = d === inicio;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                onPress={() => setInicio(d)}
                style={[styles.data, ativo && styles.dataAtiva]}>
                <Text style={[styles.dataSemana, ativo && { color: '#fff' }]}>
                  {i === 0 ? 'hoje' : i === 1 ? 'amanhã' : diaDaSemana(d)}
                </Text>
                <Text style={[styles.dataDia, ativo && { color: '#fff' }]}>{formatarData(d)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.secao}>Por quantos dias?</Text>
        <View style={styles.diasLinha}>
          <Pressable
            accessibilityLabel="Menos um dia"
            onPress={() => setDias((d) => Math.max(1, d - 1))}
            style={styles.passo}>
            <Text style={styles.passoTexto}>−</Text>
          </Pressable>
          <View style={{ alignItems: 'center', minWidth: 90 }}>
            <Text style={styles.diasNumero}>{dias}</Text>
            <Text style={styles.subtitulo}>{dias === 1 ? 'dia' : 'dias'}</Text>
          </View>
          <Pressable
            accessibilityLabel="Mais um dia"
            onPress={() => setDias((d) => Math.min(30, d + 1))}
            style={styles.passo}>
            <Text style={styles.passoTexto}>+</Text>
          </Pressable>
        </View>
        <View style={styles.chips}>
          {DIAS_RAPIDOS.map((n) => (
            <Chip key={n} rotulo={n === 1 ? '1 dia' : `${n} dias`} ativo={dias === n} onPress={() => setDias(n)} />
          ))}
        </View>
        <Text style={styles.dica}>
          {desconto > 0
            ? `Desconto de ${desconto * 100}% aplicado. Devolução até ${formatarData(somarDias(inicio, dias))}.`
            : `A partir de 3 dias você ganha desconto. Devolução até ${formatarData(somarDias(inicio, dias))}.`}
        </Text>

        <Text style={styles.secao}>Como você quer receber?</Text>
        <View style={styles.chips}>
          <Chip rotulo="Retirar na loja" ativo={!entrega} onPress={() => setEntrega(false)} />
          <Chip rotulo={`Entrega (+${formatarPreco(TAXA_ENTREGA)})`} ativo={entrega} onPress={() => setEntrega(true)} />
        </View>

        <Cartao style={{ gap: 2 }}>
          <Linha rotulo={`${formatarPreco(ferramenta.precoDia)} × ${dias} ${dias === 1 ? 'dia' : 'dias'}`} valor={formatarPreco(orcamento.bruto)} />
          {orcamento.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarPreco(orcamento.desconto)}`} />}
          {entrega && <Linha rotulo="Entrega" valor={formatarPreco(orcamento.taxaEntrega)} />}
          <View style={styles.divisor} />
          <Linha rotulo="Total" valor={formatarPreco(orcamento.total)} destaque />
          <Text style={styles.dica}>
            Caução de {formatarPreco(ferramenta.caucao)} é cobrada na retirada e devolvida no fim.
          </Text>
        </Cartao>

        {carregado && precisaPerfil && (
          <FormularioPerfil
            exigirEndereco={entrega}
            dica={entrega ? 'Precisamos do seu contato e do endereço para a entrega.' : 'Precisamos do seu contato para confirmar.'}
          />
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: Espaco.md + insets.bottom }]}>
        <Text style={[styles.dica, livres === 0 && { color: Cores.perigo }]}>
          {livres === 0
            ? 'Indisponível nessas datas. Tente outro dia.'
            : precisaPerfil
              ? 'Preencha e salve seus dados acima para alugar.'
              : `${livres} ${livres === 1 ? 'unidade livre' : 'unidades livres'} nesse período.`}
        </Text>
        <Botao
          titulo={`Alugar por ${formatarPreco(orcamento.total)}`}
          onPress={confirmar}
          desativado={livres === 0 || precisaPerfil}
        />
      </View>
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
    paddingBottom: Espaco.xl,
  },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.lg, padding: Espaco.lg },
  topo: { alignItems: 'center', gap: Espaco.xs, paddingVertical: Espaco.sm },
  emoji: { fontSize: 64 },
  titulo: { fontSize: 24, fontWeight: '800', color: Cores.texto, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: Cores.textoSecundario, textAlign: 'center' },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22 },
  especificacao: { fontSize: 14, color: Cores.textoSecundario },
  secao: { fontSize: 17, fontWeight: '700', color: Cores.texto, marginTop: Espaco.sm },
  data: {
    width: 74,
    paddingVertical: Espaco.sm,
    borderRadius: Raio.md,
    borderWidth: 1,
    borderColor: Cores.borda,
    backgroundColor: Cores.cartao,
    alignItems: 'center',
  },
  dataAtiva: { backgroundColor: Cores.primaria, borderColor: Cores.primaria },
  dataSemana: { fontSize: 12, color: Cores.textoSecundario, fontWeight: '600' },
  dataDia: { fontSize: 15, color: Cores.texto, fontWeight: '700' },
  diasLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Espaco.xl },
  passo: {
    width: 48,
    height: 48,
    borderRadius: Raio.pill,
    backgroundColor: Cores.cartao,
    borderWidth: 1,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { fontSize: 24, color: Cores.texto, fontWeight: '600' },
  diasNumero: { fontSize: 34, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: Espaco.sm },
  rodape: {
    backgroundColor: Cores.cartao,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingHorizontal: Espaco.lg,
    paddingTop: Espaco.md,
    gap: Espaco.sm,
  },
});
