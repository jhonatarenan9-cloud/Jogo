import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Chip, SeletorData, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { lerValor, valorParaCampo } from '@/lib/format';
import { useDados } from '@/store/dados';
import { CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, FormaPagamento, Lancamento } from '@/store/tipos';

const CATEGORIAS_RECEITA = ['Venda de equipamento', 'Serviço', 'Outros'];

export default function TelaLancamento() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: 'despesa' | 'receita' }>();
  const { carregado, lancamentos } = useDados();
  if (!carregado) return null;
  const x = lancamentos.find((l) => l.id === id);
  if (id !== 'novo' && !x) return <Vazio emoji="🔍" titulo="Lançamento não encontrado" />;
  return <Formulario key={id} original={x} tipoNovo={tipo ?? 'despesa'} />;
}

function Formulario({ original, tipoNovo }: { original?: Lancamento; tipoNovo: 'despesa' | 'receita' }) {
  const { hoje, salvarLancamento, excluirLancamento } = useDados();
  const tipo = original?.tipo ?? tipoNovo;
  const categorias = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;
  const [descricao, setDescricao] = useState(original?.descricao ?? '');
  const [categoria, setCategoria] = useState(original?.categoria ?? categorias[0]);
  const [valor, setValor] = useState(valorParaCampo(original?.valor ?? 0));
  const [vencimento, setVencimento] = useState(original?.vencimento ?? hoje);
  const [pago, setPago] = useState(original ? !!original.pagoEm : true);
  const [forma, setForma] = useState<FormaPagamento>(original?.forma ?? 'Pix');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const valido = descricao.trim().length >= 2 && lerValor(valor) > 0;
  const palavra = tipo === 'despesa' ? 'Paga' : 'Recebida';

  function salvar() {
    salvarLancamento({
      id: original?.id,
      tipo,
      descricao: descricao.trim(),
      categoria,
      valor: lerValor(valor),
      vencimento,
      pagoEm: pago ? (original?.pagoEm ?? (vencimento <= hoje ? vencimento : hoje)) : undefined,
      forma: pago ? forma : undefined,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: original ? 'Editar lançamento' : tipo === 'despesa' ? 'Nova despesa' : 'Nova receita' }} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Cartao style={{ gap: Espaco.md }}>
          <Campo
            rotulo="Descrição"
            valor={descricao}
            onChange={setDescricao}
            placeholder={tipo === 'despesa' ? 'Ex.: Troca do motor da betoneira' : 'Ex.: Venda de furadeira usada'}
          />
          <Campo rotulo="Valor" valor={valor} onChange={setValor} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
          <Text style={styles.rotulo}>Categoria</Text>
          <View style={styles.chips}>
            {categorias.map((c) => (
              <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
            ))}
          </View>
          <View style={styles.linhaEntre}>
            <Text style={styles.rotulo}>{tipo === 'despesa' ? 'Vencimento' : 'Data'}</Text>
            <SeletorData valor={vencimento} onChange={setVencimento} rotulo="Vencimento" />
          </View>
          <View style={styles.chips}>
            <Chip rotulo={palavra} ativo={pago} onPress={() => setPago(true)} />
            <Chip rotulo={tipo === 'despesa' ? 'A pagar' : 'A receber'} ativo={!pago} onPress={() => setPago(false)} />
          </View>
          {pago && (
            <View style={styles.chips}>
              {FORMAS_PAGAMENTO.map((f) => (
                <Chip key={f} rotulo={f} ativo={forma === f} onPress={() => setForma(f)} />
              ))}
            </View>
          )}
        </Cartao>

        <Botao titulo="Salvar" onPress={salvar} desativado={!valido} />

        {original &&
          (confirmarExclusao ? (
            <View style={styles.acoes}>
              <Botao titulo="Manter" variante="secundario" onPress={() => setConfirmarExclusao(false)} style={{ flex: 1 }} />
              <Botao
                titulo="Excluir de vez"
                variante="perigo"
                onPress={() => {
                  excluirLancamento(original.id);
                  router.back();
                }}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Botao titulo="Excluir lançamento" variante="perigo" onPress={() => setConfirmarExclusao(true)} />
          ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center' },
  rotulo: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  acoes: { flexDirection: 'row', gap: Espaco.sm },
});
