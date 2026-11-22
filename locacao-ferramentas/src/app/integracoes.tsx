import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Chip, Titulo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { configurarAsaas } from '@/lib/servidor';
import { modoDemonstracao } from '@/lib/supabase';
import { useNuvem } from '@/store/nuvem';

function Passo({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.passo}>
      <Text style={styles.numero}>{n}</Text>
      <Text style={[styles.texto, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

export default function Integracoes() {
  const nuvem = useNuvem();
  const [chave, setChave] = useState('');
  const [sandbox, setSandbox] = useState(true);
  const [ok, setOk] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function conectar() {
    setErro('');
    setOk('');
    setOcupado(true);
    try {
      const r = await configurarAsaas(chave.trim(), sandbox);
      setOk(`Conectado à conta "${r.nomeConta}"${sandbox ? ' (ambiente de testes)' : ''}.`);
      setChave('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Cartao style={{ gap: Espaco.sm }}>
          <Text style={styles.titulo}>Como funciona</Text>
          <Passo n={1}>Você registra a locação e toca em “Enviar para assinar no WhatsApp”.</Passo>
          <Passo n={2}>O cliente recebe o link, vê o contrato com as fotos e assina pelo celular (ZapSign, com validade jurídica).</Passo>
          <Passo n={3}>Assim que assina, o boleto com o vencimento escolhido é gerado no seu Asaas e abre para ele. O Asaas também manda por e-mail/SMS.</Passo>
          <Passo n={4}>Quando ele paga, o app dá baixa sozinho. Se não pagar, você pode negativar no Serasa pelo Asaas (ou deixar automático).</Passo>
        </Cartao>

        {modoDemonstracao ? (
          <Cartao style={{ gap: Espaco.sm, backgroundColor: Cores.avisoClaro, borderColor: Cores.avisoClaro }}>
            <Text style={[styles.titulo, { color: Cores.aviso }]}>Modo demonstração</Text>
            <Text style={[styles.texto, { color: Cores.aviso }]}>
              Este app ainda não está ligado a um servidor, então assinatura, boleto e Serasa são simulados. O passo a passo para ligar
              está no README do projeto: criar o projeto no Supabase, a conta no ZapSign e publicar as funções do servidor.
            </Text>
          </Cartao>
        ) : !nuvem.loja ? (
          <Cartao style={{ gap: Espaco.sm }}>
            <Text style={styles.texto}>Entre na sua conta para conectar o Asaas.</Text>
            <Botao titulo="Entrar" onPress={() => router.push('/entrar')} />
          </Cartao>
        ) : nuvem.papel !== 'dono' ? (
          <Cartao>
            <Text style={styles.texto}>Só o dono da locadora pode conectar o Asaas.</Text>
          </Cartao>
        ) : (
          <>
            <Titulo>Conectar o Asaas</Titulo>
            <Cartao style={{ gap: Espaco.md }}>
              <Passo n={1}>Crie sua conta grátis em asaas.com (ou use a de testes em sandbox.asaas.com).</Passo>
              <Passo n={2}>No Asaas, vá em Integrações › Chave de API e gere uma chave.</Passo>
              <Passo n={3}>Cole a chave aqui. Ela fica guardada só no servidor, nunca no celular.</Passo>
              <View style={styles.chips}>
                <Chip rotulo="Testes (sandbox)" ativo={sandbox} onPress={() => setSandbox(true)} />
                <Chip rotulo="Produção (dinheiro real)" ativo={!sandbox} onPress={() => setSandbox(false)} />
              </View>
              <Campo rotulo="Chave de API do Asaas" valor={chave} onChange={setChave} placeholder="$aact_..." />
              <Botao titulo="Conectar" onPress={conectar} desativado={ocupado || chave.trim().length < 20} />
              {ok ? <Text style={styles.ok}>{ok}</Text> : null}
              {erro ? <Text style={styles.erro}>{erro}</Text> : null}
            </Cartao>
          </>
        )}

        <Text style={styles.dica}>
          Negativação: o Asaas notifica o cliente antes da inclusão no Serasa, como exige o Código de Defesa do Consumidor, e cobra uma
          tarifa por negativação. Confira os valores e prazos na sua conta Asaas.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  titulo: { fontSize: 17, fontWeight: '800', color: Cores.texto },
  texto: { fontSize: 14, color: Cores.texto, lineHeight: 20 },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  passo: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  numero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Cores.primariaClara,
    color: Cores.primariaEscura,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '800',
    fontSize: 13,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  ok: { fontSize: 14, color: Cores.sucesso, fontWeight: '700' },
  erro: { fontSize: 14, color: Cores.perigo },
});
