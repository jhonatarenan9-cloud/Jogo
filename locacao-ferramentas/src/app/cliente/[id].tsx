import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GaleriaFotos } from '@/components/fotos';
import { LinhaLocacao } from '@/components/linha-locacao';
import { Botao, Campo, Cartao, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { estaAberta } from '@/lib/calculos';
import { documentoValido, faltaParaCobranca, mascararCep, mascararDocumento } from '@/lib/documentos';
import { mascararTelefone } from '@/lib/format';
import { abrirWhatsApp, temWhatsApp } from '@/lib/whatsapp';
import { useDados } from '@/store/dados';
import { completarCliente } from '@/store/migracao';
import type { Cliente } from '@/store/tipos';

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
  const [c, setC] = useState<Cliente>(original ?? completarCliente({}));
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const campo = (k: keyof Cliente) => (v: string) => setC((x) => ({ ...x, [k]: v }));

  const historico = id ? locacoes.filter((l) => l.clienteId === id).sort((a, b) => b.numero - a.numero) : [];
  const temAberta = historico.some(estaAberta);
  const docInvalido = c.documento.trim() !== '' && !documentoValido(c.documento);
  const valido = c.nome.trim().length >= 2 && !docInvalido;
  const falta = faltaParaCobranca(c);

  function salvar() {
    salvarCliente({ ...c, id, nome: c.nome.trim() });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? original?.nome : 'Novo cliente' }} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {id && temWhatsApp(c.telefone) && (
          <Botao
            titulo="Chamar no WhatsApp"
            variante="secundario"
            onPress={() => abrirWhatsApp(c.telefone, `Olá, ${c.nome.split(' ')[0]}! Aqui é da ${loja.nome || 'locadora'}.`)}
          />
        )}
        <Cartao style={{ gap: Espaco.md }}>
          <Campo rotulo="Nome" valor={c.nome} onChange={campo('nome')} placeholder="Nome completo ou razão social" />
          <Campo
            rotulo="CPF ou CNPJ"
            valor={c.documento}
            onChange={(v) => setC((x) => ({ ...x, documento: mascararDocumento(v) }))}
            placeholder="000.000.000-00"
            teclado="number-pad"
          />
          {docInvalido && <Text style={styles.erro}>CPF ou CNPJ inválido. Confira os números.</Text>}
          <View style={styles.linha}>
            <Campo
              rotulo="Celular / WhatsApp"
              valor={c.telefone}
              onChange={(v) => setC((x) => ({ ...x, telefone: mascararTelefone(v) }))}
              placeholder="(11) 91234-5678"
              teclado="phone-pad"
            />
          </View>
          <Campo rotulo="E-mail (opcional)" valor={c.email} onChange={campo('email')} placeholder="cliente@email.com" teclado="email-address" />
        </Cartao>

        <Cartao style={{ gap: Espaco.md }}>
          <Text style={styles.subtitulo}>Endereço</Text>
          <View style={styles.linha}>
            <Campo rotulo="CEP" valor={c.cep} onChange={(v) => setC((x) => ({ ...x, cep: mascararCep(v) }))} placeholder="00000-000" teclado="number-pad" />
            <Campo rotulo="Número" valor={c.numero} onChange={campo('numero')} placeholder="123" />
          </View>
          <Campo rotulo="Rua" valor={c.endereco} onChange={campo('endereco')} placeholder="Rua, avenida…" />
          <Campo rotulo="Bairro" valor={c.bairro} onChange={campo('bairro')} />
          <View style={styles.linha}>
            <View style={{ flex: 3 }}>
              <Campo rotulo="Cidade" valor={c.cidade} onChange={campo('cidade')} />
            </View>
            <View style={{ flex: 1 }}>
              <Campo rotulo="UF" valor={c.uf} onChange={(v) => setC((x) => ({ ...x, uf: v.toUpperCase().slice(0, 2) }))} placeholder="SP" />
            </View>
          </View>
          {falta.length > 0 && (
            <Text style={styles.dica}>Para enviar boleto e, se preciso, negativar no Serasa, falta: {falta.join(', ')}.</Text>
          )}
        </Cartao>

        <Cartao>
          <GaleriaFotos
            titulo="Documentos"
            dica="RG ou CNH (frente e verso) e comprovante de endereço."
            fotos={c.fotosDocumento}
            onAdicionar={(f) => setC((x) => ({ ...x, fotosDocumento: [...x.fotosDocumento, ...f] }))}
            onRemover={(f) => setC((x) => ({ ...x, fotosDocumento: x.fotosDocumento.filter((y) => y !== f) }))}
          />
        </Cartao>

        <Cartao>
          <Campo rotulo="Observações" valor={c.obs} onChange={campo('obs')} placeholder="Ex.: só paga em dinheiro" multilinha />
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
  subtitulo: { fontSize: 16, fontWeight: '800', color: Cores.texto },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  erro: { fontSize: 13, color: Cores.perigo },
});
