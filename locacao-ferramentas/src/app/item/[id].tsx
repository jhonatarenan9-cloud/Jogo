import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalendarioDisponibilidade } from '@/components/calendario';
import { SeletorFoto } from '@/components/fotos';
import { Botao, Campo, Cartao, Chip, Contador, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { estaAberta } from '@/lib/calculos';
import { lerValor, valorParaCampo } from '@/lib/format';
import { useDados } from '@/store/dados';

export default function TelaItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { carregado, itens } = useDados();
  if (!carregado) return null;
  const item = itens.find((i) => i.id === id);
  if (id !== 'novo' && !item) {
    return <Vazio emoji="🔍" titulo="Item não encontrado" />;
  }
  return <FormularioItem key={id} id={item?.id} />;
}

function FormularioItem({ id }: { id?: string }) {
  const { itens, locacoes, clientes, hoje, salvarItem, excluirItem } = useDados();
  const original = itens.find((i) => i.id === id);
  const [nome, setNome] = useState(original?.nome ?? '');
  const [categoria, setCategoria] = useState(original?.categoria ?? '');
  const [preco, setPreco] = useState(valorParaCampo(original?.precoDia ?? 0));
  const [caucao, setCaucao] = useState(valorParaCampo(original?.caucao ?? 0));
  const [quantidade, setQuantidade] = useState(original?.quantidade ?? 1);
  const [foto, setFoto] = useState(original?.foto);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const categorias = [...new Set(itens.map((i) => i.categoria).filter(Boolean))].sort();
  const emUso = !!id && locacoes.some((l) => estaAberta(l) && l.itens.some((i) => i.itemId === id));
  const valido = nome.trim().length >= 2 && lerValor(preco) > 0;

  function salvar() {
    salvarItem({
      id,
      nome: nome.trim(),
      categoria: categoria.trim(),
      precoDia: lerValor(preco),
      caucao: lerValor(caucao),
      quantidade,
      foto,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Editar item' : 'Novo item' }} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Cartao>
          <SeletorFoto foto={foto} onChange={setFoto} rotulo="Foto do produto (aparece no contrato)" />
        </Cartao>
        <Cartao style={{ gap: Espaco.md }}>
          <Campo rotulo="Nome do item" valor={nome} onChange={setNome} placeholder="Ex.: Betoneira 150 L" />
          <Campo rotulo="Categoria" valor={categoria} onChange={setCategoria} placeholder="Ex.: Construção" />
          {categorias.length > 0 && (
            <View style={styles.chips}>
              {categorias.map((c) => (
                <Chip key={c} rotulo={c} ativo={categoria === c} onPress={() => setCategoria(c)} />
              ))}
            </View>
          )}
          <View style={styles.linha}>
            <Campo rotulo="Diária" valor={preco} onChange={setPreco} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
            <Campo rotulo="Caução (opcional)" valor={caucao} onChange={setCaucao} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
          </View>
          <View style={styles.qtd}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rotulo}>Unidades no estoque</Text>
              <Text style={styles.dica}>Quantas desse item você tem para alugar.</Text>
            </View>
            <Contador valor={quantidade} onChange={setQuantidade} min={1} rotulo="unidades" />
          </View>
        </Cartao>

        <Botao titulo="Salvar item" onPress={salvar} desativado={!valido} />

        {original && (
          <>
            <Titulo>Agenda de disponibilidade</Titulo>
            <Cartao>
              <CalendarioDisponibilidade item={original} locacoes={locacoes} clientes={clientes} hoje={hoje} />
            </Cartao>
          </>
        )}

        {id &&
          (emUso ? (
            <Text style={styles.dica}>Este item está em uma locação aberta e não pode ser excluído agora.</Text>
          ) : confirmarExclusao ? (
            <View style={styles.linha}>
              <Botao titulo="Manter" variante="secundario" onPress={() => setConfirmarExclusao(false)} style={{ flex: 1 }} />
              <Botao
                titulo="Excluir de vez"
                variante="perigo"
                onPress={() => {
                  excluirItem(id);
                  router.back();
                }}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Botao titulo="Excluir item" variante="perigo" onPress={() => setConfirmarExclusao(true)} />
          ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  linha: { flexDirection: 'row', gap: Espaco.md },
  qtd: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  rotulo: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  dica: { fontSize: 13, color: Cores.textoSecundario },
});
