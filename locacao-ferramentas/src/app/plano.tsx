import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Cartao, Chip } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import { DIAS_TESTE, LIMITES_GRATIS, PRECO_PRO, VANTAGENS_PRO } from '@/constants/plano';
import { formatarData, formatarPreco } from '@/lib/format';
import { useDados } from '@/store/dados';

const MOTIVOS: Record<string, string> = {
  itens: `Você chegou ao limite de ${LIMITES_GRATIS.itens} itens do plano Grátis.`,
  clientes: `Você chegou ao limite de ${LIMITES_GRATIS.clientes} clientes do plano Grátis.`,
  locacoes: `Você já registrou ${LIMITES_GRATIS.locacoesPorMes} locações este mês, o limite do plano Grátis.`,
  relatorios: 'Os relatórios fazem parte do plano Pro.',
};

export default function Plano() {
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();
  const { plano, proAtivo, emTeste, iniciarTeste } = useDados();
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('anual');
  const [avisoCobranca, setAvisoCobranca] = useState(false);

  const podeTestar = !plano.testeAte && !proAtivo;
  const porMes = ciclo === 'mensal' ? PRECO_PRO.mensal : PRECO_PRO.anual / 12;
  const economia = PRECO_PRO.mensal * 12 - PRECO_PRO.anual;

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      {motivo && MOTIVOS[motivo] ? (
        <Cartao style={styles.motivo}>
          <Text style={styles.motivoTexto}>{MOTIVOS[motivo]}</Text>
        </Cartao>
      ) : null}

      <View style={{ alignItems: 'center', gap: Espaco.xs, paddingVertical: Espaco.sm }}>
        <Text style={{ fontSize: 44 }}>🚀</Text>
        <Text style={styles.titulo}>Plano Pro</Text>
        <Text style={styles.sub}>Para a locadora que não quer perder nenhuma devolução nem nenhum real.</Text>
      </View>

      <Cartao style={{ gap: Espaco.md }}>
        {VANTAGENS_PRO.map((v) => (
          <View key={v} style={styles.vantagem}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.texto}>{v}</Text>
          </View>
        ))}
      </Cartao>

      {proAtivo ? (
        <Cartao>
          <Text style={styles.texto}>Você já é Pro. Obrigado! 🧡</Text>
        </Cartao>
      ) : (
        <>
          <View style={styles.ciclos}>
            <Chip rotulo="Mensal" ativo={ciclo === 'mensal'} onPress={() => setCiclo('mensal')} />
            <Chip rotulo={`Anual · economize ${formatarPreco(economia)}`} ativo={ciclo === 'anual'} onPress={() => setCiclo('anual')} />
          </View>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={styles.preco}>
              {formatarPreco(porMes)}
              <Text style={styles.porMes}> /mês</Text>
            </Text>
            <Text style={styles.sub}>
              {ciclo === 'anual' ? `${formatarPreco(PRECO_PRO.anual)} cobrados uma vez por ano` : 'Cobrado todo mês. Cancele quando quiser.'}
            </Text>
          </View>

          {podeTestar && (
            <Botao
              titulo={`Testar grátis por ${DIAS_TESTE} dias`}
              onPress={() => {
                iniciarTeste();
                router.back();
              }}
            />
          )}
          {emTeste && plano.testeAte && (
            <Text style={[styles.sub, { textAlign: 'center' }]}>Seu teste vai até {formatarData(plano.testeAte)}.</Text>
          )}
          <Botao
            titulo={`Assinar ${ciclo === 'anual' ? 'anual' : 'mensal'}`}
            variante={podeTestar ? 'secundario' : 'primario'}
            onPress={() => setAvisoCobranca(true)}
          />
          {avisoCobranca && (
            <Cartao style={{ backgroundColor: Cores.avisoClaro, borderColor: Cores.avisoClaro }}>
              <Text style={[styles.texto, { color: Cores.aviso }]}>
                A cobrança ainda não está ligada nesta versão de teste. Assim que a conta de pagamentos for configurada,
                este botão abre o pagamento.
              </Text>
            </Cartao>
          )}
        </>
      )}

      <Text style={[styles.sub, { textAlign: 'center' }]}>
        Plano Grátis: até {LIMITES_GRATIS.itens} itens, {LIMITES_GRATIS.clientes} clientes e {LIMITES_GRATIS.locacoesPorMes} locações
        por mês.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  motivo: { backgroundColor: Cores.avisoClaro, borderColor: Cores.avisoClaro },
  motivoTexto: { fontSize: 15, fontWeight: '700', color: Cores.aviso },
  titulo: { fontSize: 26, fontWeight: '800', color: Cores.texto },
  sub: { fontSize: 14, color: Cores.textoSecundario, textAlign: 'center', lineHeight: 20 },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22, flex: 1 },
  vantagem: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  check: { fontSize: 16, fontWeight: '800', color: Cores.sucesso, lineHeight: 22 },
  ciclos: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm, justifyContent: 'center' },
  preco: { fontSize: 36, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  porMes: { fontSize: 16, fontWeight: '600', color: Cores.textoSecundario },
});
