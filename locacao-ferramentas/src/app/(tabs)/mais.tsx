import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Linha, Titulo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { formatarData, mascararTelefone } from '@/lib/format';
import { useDados } from '@/store/dados';

export default function Mais() {
  const { carregado, loja } = useDados();
  // Espera os dados salvos e recomeça o formulário quando os dados da loja mudam (ex.: dados de exemplo).
  return carregado ? <Conteudo key={`${loja.nome}|${loja.telefone}`} /> : null;
}

function Conteudo() {
  const { loja, salvarLoja, ehPro, proAtivo, emTeste, plano, uso, limites, itens, clientes, locacoes, carregarExemplo, apagarTudo } =
    useDados();
  const [nome, setNome] = useState(loja.nome);
  const [telefone, setTelefone] = useState(loja.telefone);
  const [salvo, setSalvo] = useState(true);
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const vazio = itens.length === 0 && clientes.length === 0 && locacoes.length === 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Titulo>Plano</Titulo>
        <Cartao style={{ gap: Espaco.sm }}>
          <Text style={styles.plano}>{proAtivo ? 'Pro ✓' : emTeste ? 'Pro (teste grátis)' : 'Grátis'}</Text>
          {proAtivo && plano.proAte && <Text style={styles.sub}>Renova em {formatarData(plano.proAte)}</Text>}
          {emTeste && plano.testeAte && <Text style={styles.sub}>Teste termina em {formatarData(plano.testeAte)}</Text>}
          {!ehPro && (
            <View style={{ gap: 2 }}>
              <Linha rotulo="Itens no estoque" valor={`${uso.itens} de ${limites.itens}`} />
              <Linha rotulo="Clientes" valor={`${uso.clientes} de ${limites.clientes}`} />
              <Linha rotulo="Locações este mês" valor={`${uso.locacoes} de ${limites.locacoes}`} />
            </View>
          )}
          {!proAtivo && <Botao titulo={emTeste ? 'Assinar o Pro' : 'Conhecer o Pro'} onPress={() => router.push('/plano')} />}
        </Cartao>

        <Titulo>Sua locadora</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <Campo
            rotulo="Nome da locadora"
            valor={nome}
            onChange={(v) => {
              setNome(v);
              setSalvo(false);
            }}
            placeholder="Ex.: Locadora do Zé"
          />
          <Campo
            rotulo="Telefone da loja"
            valor={telefone}
            onChange={(v) => {
              setTelefone(mascararTelefone(v));
              setSalvo(false);
            }}
            placeholder="(11) 3333-4444"
            teclado="phone-pad"
          />
          <View style={styles.opcao}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rotulo}>Cobrar multa por atraso</Text>
              <Text style={styles.sub}>Uma diária a mais por dia de atraso na devolução.</Text>
            </View>
            <Switch
              value={loja.cobrarAtraso}
              onValueChange={(v) => salvarLoja({ ...loja, cobrarAtraso: v })}
              trackColor={{ true: Cores.primaria, false: Cores.borda }}
              thumbColor="#fff"
              accessibilityLabel="Cobrar multa por atraso"
            />
          </View>
          <Botao
            titulo={salvo ? 'Salvo ✓' : 'Salvar'}
            desativado={salvo}
            onPress={() => {
              salvarLoja({ ...loja, nome: nome.trim(), telefone });
              setSalvo(true);
            }}
          />
        </Cartao>

        <Titulo>Ferramentas</Titulo>
        <Botao titulo="Relatórios" variante="secundario" onPress={() => router.push('/relatorios')} />

        <Titulo>Dados</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <Text style={styles.sub}>
            Os dados ficam guardados neste aparelho. A sincronização na nuvem, para usar em mais de um celular, chega numa próxima versão.
          </Text>
          {vazio && <Botao titulo="Carregar dados de exemplo" variante="secundario" onPress={carregarExemplo} />}
          {!vazio &&
            (confirmarApagar ? (
              <View style={{ gap: Espaco.sm }}>
                <Text style={[styles.sub, { color: Cores.perigo }]}>
                  Isso apaga itens, clientes e locações deste aparelho. Não dá para desfazer.
                </Text>
                <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
                  <Botao titulo="Voltar" variante="secundario" onPress={() => setConfirmarApagar(false)} style={{ flex: 1 }} />
                  <Botao
                    titulo="Apagar tudo"
                    variante="perigo"
                    onPress={() => {
                      apagarTudo();
                      setConfirmarApagar(false);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <Botao titulo="Apagar todos os dados" variante="perigo" onPress={() => setConfirmarApagar(true)} />
            ))}
        </Cartao>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  plano: { fontSize: 20, fontWeight: '800', color: Cores.texto },
  rotulo: { fontSize: 15, fontWeight: '600', color: Cores.texto },
  sub: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
});
