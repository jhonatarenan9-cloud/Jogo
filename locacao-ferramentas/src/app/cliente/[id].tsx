import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LinhaLocacao } from '@/components/linha-locacao';
import { Botao, Campo, Cartao, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { estaAberta } from '@/lib/calculos';
import { mascararTelefone } from '@/lib/format';
import { abrirWhatsApp, temWhatsApp } from '@/lib/whatsapp';
import { useDados } from '@/store/dados';

export default function TelaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { carregado, clientes } = useDados();
  if (!carregado) return null;
  const cliente = clientes.find((c) => c.id === id);
  if (id !== 'novo' && !cliente) return <Vazio emoji="🔍" titulo="Cliente não encontrado" />;
  return <FormularioCliente key={id} id={cliente?.id} />;
}

function FormularioCliente({ id }: { id?: string }) {
  const { clientes, locacoes, loja, salvarCliente, excluirCliente } = useDados();
  const original = clientes.find((c) => c.id === id);
  const [nome, setNome] = useState(original?.nome ?? '');
  const [telefone, setTelefone] = useState(original?.telefone ?? '');
  const [documento, setDocumento] = useState(original?.documento ?? '');
  const [endereco, setEndereco] = useState(original?.endereco ?? '');
  const [obs, setObs] = useState(original?.obs ?? '');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const historico = id ? locacoes.filter((l) => l.clienteId === id).sort((a, b) => b.numero - a.numero) : [];
  const temAberta = historico.some(estaAberta);
  const valido = nome.trim().length >= 2;

  function salvar() {
    salvarCliente({ id, nome: nome.trim(), telefone, documento: documento.trim(), endereco: endereco.trim(), obs: obs.trim() });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? original?.nome : 'Novo cliente' }} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {id && temWhatsApp(telefone) && (
          <Botao
            titulo="Chamar no WhatsApp"
            variante="secundario"
            onPress={() => abrirWhatsApp(telefone, `Olá, ${nome.split(' ')[0]}! Aqui é da ${loja.nome || 'locadora'}.`)}
          />
        )}
        <Cartao style={{ gap: Espaco.md }}>
          <Campo rotulo="Nome" valor={nome} onChange={setNome} placeholder="Nome completo ou empresa" />
          <Campo
            rotulo="Telefone / WhatsApp"
            valor={telefone}
            onChange={(v) => setTelefone(mascararTelefone(v))}
            placeholder="(11) 91234-5678"
            teclado="phone-pad"
          />
          <Campo rotulo="CPF ou CNPJ (opcional)" valor={documento} onChange={setDocumento} teclado="number-pad" />
          <Campo rotulo="Endereço (opcional)" valor={endereco} onChange={setEndereco} placeholder="Rua, número, bairro" />
          <Campo rotulo="Observações" valor={obs} onChange={setObs} placeholder="Ex.: só paga em dinheiro" multilinha />
        </Cartao>

        <Botao titulo="Salvar cliente" onPress={salvar} desativado={!valido} />

        {id && (
          <>
            <Titulo>Histórico ({historico.length})</Titulo>
            {historico.length === 0 ? (
              <Text style={styles.dica}>Nenhuma locação ainda.</Text>
            ) : (
              historico.map((l) => <LinhaLocacao key={l.id} l={l} mostrarCliente={false} />)
            )}

            {temAberta ? (
              <Text style={styles.dica}>Este cliente tem locação aberta e não pode ser excluído agora.</Text>
            ) : confirmarExclusao ? (
              <View style={styles.linha}>
                <Botao titulo="Manter" variante="secundario" onPress={() => setConfirmarExclusao(false)} style={{ flex: 1 }} />
                <Botao
                  titulo="Excluir de vez"
                  variante="perigo"
                  onPress={() => {
                    excluirCliente(id);
                    router.back();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Botao titulo="Excluir cliente" variante="perigo" onPress={() => setConfirmarExclusao(true)} />
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  linha: { flexDirection: 'row', gap: Espaco.md },
  dica: { fontSize: 13, color: Cores.textoSecundario },
});
