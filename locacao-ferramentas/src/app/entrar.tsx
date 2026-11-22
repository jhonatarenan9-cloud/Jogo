import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Chip, Linha, Selo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { useDados } from '@/store/dados';
import { Situacao, useNuvem } from '@/store/nuvem';

const ROTULO: Record<Situacao, { texto: string; cor: string; fundo: string }> = {
  desligado: { texto: 'servidor desligado', cor: Cores.textoSecundario, fundo: Cores.borda },
  'sem-conta': { texto: 'sem conta', cor: Cores.textoSecundario, fundo: Cores.borda },
  'sem-loja': { texto: 'falta a locadora', cor: Cores.aviso, fundo: Cores.avisoClaro },
  sincronizando: { texto: 'sincronizando…', cor: Cores.aviso, fundo: Cores.avisoClaro },
  'em-dia': { texto: 'tudo salvo na nuvem', cor: Cores.sucesso, fundo: Cores.sucessoClaro },
  erro: { texto: 'erro ao sincronizar', cor: Cores.perigo, fundo: Cores.perigoClaro },
};

export default function Entrar() {
  const nuvem = useNuvem();
  const { loja: lojaLocal } = useDados();
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeLoja, setNomeLoja] = useState(lojaLocal.nome);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<void>) {
    setErro('');
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado.');
    } finally {
      setOcupado(false);
    }
  }

  if (!nuvem.ligada) {
    return (
      <View style={styles.conteudo}>
        <Text style={styles.texto}>O servidor ainda não foi configurado neste app. Veja o passo a passo no README do projeto.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {!nuvem.sessao ? (
          <Cartao style={{ gap: Espaco.md }}>
            <View style={styles.chips}>
              <Chip rotulo="Já tenho conta" ativo={modo === 'entrar'} onPress={() => setModo('entrar')} />
              <Chip rotulo="Criar conta" ativo={modo === 'cadastrar'} onPress={() => setModo('cadastrar')} />
            </View>
            <Campo rotulo="E-mail" valor={email} onChange={setEmail} teclado="email-address" placeholder="voce@email.com" />
            <Campo rotulo="Senha" valor={senha} onChange={setSenha} placeholder="mínimo 8 caracteres" />
            <Botao
              titulo={modo === 'entrar' ? 'Entrar' : 'Criar conta'}
              desativado={ocupado || !email.includes('@') || senha.length < 8}
              onPress={() => executar(() => (modo === 'entrar' ? nuvem.entrar(email.trim(), senha) : nuvem.cadastrar(email.trim(), senha)))}
            />
            <Text style={styles.dica}>Depois de entrar, os dados deste celular vão para a nuvem e aparecem nos outros aparelhos da loja.</Text>
          </Cartao>
        ) : !nuvem.loja ? (
          <>
            <Cartao style={{ gap: Espaco.md }}>
              <Text style={styles.titulo}>Sou o dono</Text>
              <Campo rotulo="Nome da locadora" valor={nomeLoja} onChange={setNomeLoja} placeholder="Ex.: Locadora do Zé" />
              <Botao titulo="Criar minha locadora" desativado={ocupado || nomeLoja.trim().length < 2} onPress={() => executar(() => nuvem.criarLoja(nomeLoja))} />
            </Cartao>
            <Cartao style={{ gap: Espaco.md }}>
              <Text style={styles.titulo}>Sou funcionário</Text>
              <Campo rotulo="Código de convite" valor={codigo} onChange={(v) => setCodigo(v.toUpperCase())} placeholder="Peça ao dono" />
              <Botao
                titulo="Entrar na locadora"
                variante="secundario"
                desativado={ocupado || codigo.trim().length < 6}
                onPress={() => executar(() => nuvem.entrarComConvite(codigo))}
              />
            </Cartao>
            <Botao titulo="Sair da conta" variante="secundario" onPress={() => executar(nuvem.sair)} />
          </>
        ) : (
          <>
            <Cartao style={{ gap: Espaco.sm }}>
              <View style={styles.linhaEntre}>
                <Text style={styles.titulo}>{nuvem.loja.nome}</Text>
                <Selo {...ROTULO[nuvem.situacao]} />
              </View>
              <Linha rotulo="Conta" valor={nuvem.email} />
              <Linha rotulo="Você é" valor={nuvem.papel === 'dono' ? 'dono' : 'funcionário'} />
              {nuvem.erro ? <Text style={styles.erro}>{nuvem.erro}</Text> : null}
              <Botao titulo="Sincronizar agora" variante="secundario" onPress={() => executar(nuvem.sincronizarAgora)} desativado={ocupado} />
            </Cartao>
            {nuvem.papel === 'dono' && (
              <Cartao style={{ gap: Espaco.sm }}>
                <Text style={styles.titulo}>Convidar funcionário</Text>
                <Text style={styles.dica}>O funcionário cria uma conta no app e digita este código:</Text>
                <Text selectable style={styles.codigo}>
                  {nuvem.loja.codigo_convite}
                </Text>
              </Cartao>
            )}
            <Botao titulo="Sair da conta" variante="perigo" onPress={() => executar(nuvem.sair)} />
            <Text style={styles.dica}>Ao sair, os dados continuam neste celular; ao entrar de novo, voltam a sincronizar.</Text>
          </>
        )}
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center' },
  titulo: { fontSize: 17, fontWeight: '800', color: Cores.texto },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22 },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  erro: { fontSize: 14, color: Cores.perigo },
  chips: { flexDirection: 'row', gap: Espaco.sm },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  codigo: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: Cores.primariaEscura, textAlign: 'center', paddingVertical: Espaco.sm },
});
