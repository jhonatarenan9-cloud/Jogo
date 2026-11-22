import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { FormularioPerfil } from '@/components/formulario-perfil';
import { Cartao, Linha } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { formatarPreco } from '@/lib/format';
import { etapaDaLocacao, useLocacoes } from '@/store/locacoes';

export default function Conta() {
  const { locacoes, carregado } = useLocacoes();
  const devolvidas = locacoes.filter((l) => etapaDaLocacao(l) === 'devolvida').length;
  const gasto = locacoes.filter((l) => l.situacao !== 'cancelada').reduce((s, l) => s + l.total, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {carregado && <FormularioPerfil />}

        <Cartao style={{ gap: 2 }}>
          <Text style={[styles.titulo, { marginBottom: Espaco.sm }]}>Resumo</Text>
          <Linha rotulo="Locações feitas" valor={String(locacoes.length)} />
          <Linha rotulo="Devolvidas" valor={String(devolvidas)} />
          <Linha rotulo="Total gasto" valor={formatarPreco(gasto)} />
        </Cartao>

        <Cartao style={{ gap: Espaco.sm }}>
          <Text style={styles.titulo}>Como funciona</Text>
          <Text style={styles.texto}>1. Escolha a ferramenta, a data e quantos dias precisa.</Text>
          <Text style={styles.texto}>2. Retire na loja ou receba em casa.</Text>
          <Text style={styles.texto}>3. A caução é devolvida quando a ferramenta volta em bom estado.</Text>
          <Text style={styles.texto}>4. A partir de 3 dias a diária fica mais barata (até 25% em 15 dias).</Text>
        </Cartao>
      </ScrollView>
    </KeyboardAvoidingView>
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
  titulo: { fontSize: 18, fontWeight: '800', color: Cores.texto },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22 },
});
