import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Contador, Linha, Titulo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { mascararDocumento } from '@/lib/documentos';
import { formatarData, mascararTelefone } from '@/lib/format';
import { modoDemonstracao } from '@/lib/supabase';
import { useDados } from '@/store/dados';
import type { Loja } from '@/store/tipos';

export default function Mais() {
  const { carregado, loja } = useDados();
  // Recomeça o formulário quando os dados da loja mudam por fora (ex.: dados de exemplo, sincronização).
  return carregado ? <Conteudo key={JSON.stringify(loja)} /> : null;
}

function Opcao({ titulo, dica, valor, onChange }: { titulo: string; dica: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.opcao}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rotulo}>{titulo}</Text>
        <Text style={styles.sub}>{dica}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        trackColor={{ true: Cores.primaria, false: Cores.borda }}
        thumbColor="#fff"
        accessibilityLabel={titulo}
      />
    </View>
  );
}

function Conteudo() {
  const { loja, salvarLoja, ehPro, proAtivo, emTeste, plano, uso, limites, itens, clientes, locacoes, carregarExemplo, apagarTudo } =
    useDados();
  const [f, setF] = useState<Loja>(loja);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const mudou = JSON.stringify(f) !== JSON.stringify(loja);
  const campo = (k: keyof Loja) => (v: string) => setF((x) => ({ ...x, [k]: v }));
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

        <Titulo>Conta e integrações</Titulo>
        <Cartao style={{ gap: Espaco.sm }}>
          <Text style={styles.sub}>
            {modoDemonstracao
              ? 'Modo demonstração: dados só neste aparelho; assinatura, boleto e Serasa simulados.'
              : 'Servidor ligado: entre na conta para guardar os dados na nuvem e usar assinatura e boletos.'}
          </Text>
          {!modoDemonstracao && <Botao titulo="Conta e nuvem" variante="secundario" onPress={() => router.push('/entrar')} />}
          <Botao titulo="Asaas, assinatura e Serasa" variante="secundario" onPress={() => router.push('/integracoes')} />
        </Cartao>

        <Titulo>Sua locadora (vai no contrato)</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <Campo rotulo="Nome da locadora" valor={f.nome} onChange={campo('nome')} placeholder="Ex.: Locadora do Zé" />
          <Campo
            rotulo="CNPJ ou CPF"
            valor={f.documento}
            onChange={(v) => setF((x) => ({ ...x, documento: mascararDocumento(v) }))}
            teclado="number-pad"
          />
          <Campo
            rotulo="Telefone da loja"
            valor={f.telefone}
            onChange={(v) => setF((x) => ({ ...x, telefone: mascararTelefone(v) }))}
            placeholder="(11) 3333-4444"
            teclado="phone-pad"
          />
          <Campo rotulo="Endereço completo" valor={f.endereco} onChange={campo('endereco')} placeholder="Rua, número, bairro, cidade/UF" />
          <Campo
            rotulo="Cláusulas extras do contrato (uma por linha)"
            valor={f.clausulasExtras}
            onChange={campo('clausulasExtras')}
            placeholder="Ex.: O transporte de volta é por conta do locatário."
            multilinha
          />
        </Cartao>

        <Titulo>Regras de cobrança</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <Opcao
            titulo="Multa por atraso na devolução"
            dica="Uma diária a mais por dia de atraso."
            valor={f.cobrarAtraso}
            onChange={(v) => setF((x) => ({ ...x, cobrarAtraso: v }))}
          />
          <View style={styles.linhaEntre}>
            <Text style={[styles.rotulo, { flex: 1 }]}>Vencimento padrão do boleto (dias após assinar)</Text>
            <Contador valor={f.prazoBoletoDias} onChange={(v) => setF((x) => ({ ...x, prazoBoletoDias: v }))} min={0} max={60} rotulo="dias" />
          </View>
          <View style={styles.linhaEntre}>
            <Text style={[styles.rotulo, { flex: 1 }]}>Multa do boleto (%)</Text>
            <Contador valor={f.multaBoletoPct} onChange={(v) => setF((x) => ({ ...x, multaBoletoPct: v }))} min={0} max={2} rotulo="% de multa" />
          </View>
          <View style={styles.linhaEntre}>
            <Text style={[styles.rotulo, { flex: 1 }]}>Juros do boleto (% ao mês)</Text>
            <Contador valor={f.jurosMesPct} onChange={(v) => setF((x) => ({ ...x, jurosMesPct: v }))} min={0} max={1} rotulo="% de juros" />
          </View>
          <Text style={styles.sub}>Pelo Código de Defesa do Consumidor, a multa máxima é 2% e os juros de mora, 1% ao mês.</Text>
          <Opcao
            titulo="Negativar no Serasa automaticamente"
            dica={`Se o boleto continuar sem pagamento ${f.diasParaNegativar} dias depois do vencimento.`}
            valor={f.negativarAuto}
            onChange={(v) => setF((x) => ({ ...x, negativarAuto: v }))}
          />
          {f.negativarAuto && (
            <View style={styles.linhaEntre}>
              <Text style={[styles.rotulo, { flex: 1 }]}>Dias após o vencimento</Text>
              <Contador
                valor={f.diasParaNegativar}
                onChange={(v) => setF((x) => ({ ...x, diasParaNegativar: v }))}
                min={5}
                max={90}
                rotulo="dias para negativar"
              />
            </View>
          )}
          <Opcao
            titulo="Avisos de devolução no celular"
            dica="Às 8h do dia da devolução e no dia seguinte, se não voltou."
            valor={f.lembretes}
            onChange={(v) => setF((x) => ({ ...x, lembretes: v }))}
          />
        </Cartao>

        <Botao titulo={mudou ? 'Salvar alterações' : 'Salvo ✓'} desativado={!mudou} onPress={() => salvarLoja({ ...f, nome: f.nome.trim() })} />

        <Titulo>Dados</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          {vazio && <Botao titulo="Carregar dados de exemplo" variante="secundario" onPress={carregarExemplo} />}
          {!vazio &&
            (confirmarApagar ? (
              <View style={{ gap: Espaco.sm }}>
                <Text style={[styles.sub, { color: Cores.perigo }]}>
                  Isso apaga itens, clientes, locações e o financeiro deste aparelho. Não dá para desfazer.
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
          <Botao titulo="Relatórios" variante="secundario" onPress={() => router.push('/relatorios')} />
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
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
});
