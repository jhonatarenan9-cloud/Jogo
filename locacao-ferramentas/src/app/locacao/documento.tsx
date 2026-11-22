import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VisualizadorHtml } from '@/components/visualizador-html';
import { Botao } from '@/components/ui';
import { Cores, Espaco } from '@/constants/theme';
import { compartilharPdf, montarHtmlContrato, montarHtmlRecibo } from '@/lib/pdf';
import { useDados } from '@/store/dados';

export default function Documento() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo: 'contrato' | 'recibo' }>();
  const { carregado, locacoes, clientes, loja, hoje } = useDados();
  const [html, setHtml] = useState('');
  const [erro, setErro] = useState('');
  const insets = useSafeAreaInsets();
  const l = locacoes.find((x) => x.id === id);
  const cliente = clientes.find((c) => c.id === l?.clienteId);
  const titulo = tipo === 'recibo' ? `Recibo nº ${l?.numero ?? ''}` : `Contrato nº ${l?.numero ?? ''}`;

  useEffect(() => {
    if (!carregado || !l || !cliente) return;
    let ativo = true;
    (tipo === 'recibo' ? Promise.resolve(montarHtmlRecibo(loja, cliente, l, hoje)) : montarHtmlContrato(loja, cliente, l, hoje))
      .then((h) => ativo && setHtml(h))
      .catch(() => ativo && setErro('Não foi possível montar o documento.'));
    return () => {
      ativo = false;
    };
  }, [carregado, l, cliente, loja, hoje, tipo]);

  if (carregado && (!l || !cliente)) {
    return (
      <View style={styles.centro}>
        <Text style={styles.texto}>Locação ou cliente não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: titulo }} />
      {html ? (
        <VisualizadorHtml html={html} />
      ) : (
        <View style={styles.centro}>{erro ? <Text style={styles.texto}>{erro}</Text> : <ActivityIndicator color={Cores.primaria} />}</View>
      )}
      <View style={[styles.rodape, { paddingBottom: Espaco.md + insets.bottom }]}>
        <Botao
          titulo="Salvar ou enviar PDF"
          desativado={!html}
          onPress={() => compartilharPdf(html, titulo).catch(() => setErro('Não foi possível gerar o PDF.'))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Espaco.lg },
  texto: { fontSize: 15, color: Cores.texto },
  rodape: { backgroundColor: Cores.cartao, borderTopWidth: 1, borderTopColor: Cores.borda, paddingHorizontal: Espaco.lg, paddingTop: Espaco.md },
});
