import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BotaoPasso, Botao, Cartao, Chip, Linha, Selo, Titulo } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { mesDe } from '@/lib/calculos';
import { contasAPagar, contasAReceber, mesAnterior, Movimento, resumoDoMes } from '@/lib/financeiro';
import { formatarData, formatarPreco, nomeDoMes } from '@/lib/format';
import { useDados } from '@/store/dados';

type Aba = 'resumo' | 'pagar' | 'receber';

export default function Financeiro() {
  const { carregado, locacoes, lancamentos, clientes, loja, hoje, salvarLancamento } = useDados();
  const [mes, setMes] = useState(mesDe(hoje));
  const [aba, setAba] = useState<Aba>('resumo');
  const base = useMemo(() => ({ locacoes, lancamentos, clientes }), [locacoes, lancamentos, clientes]);

  const resumo = useMemo(() => resumoDoMes(base, mes), [base, mes]);
  const receber = useMemo(() => contasAReceber(base, loja, hoje), [base, loja, hoje]);
  const pagar = useMemo(() => contasAPagar(base, hoje), [base, hoje]);
  const nomes = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  if (!carregado) return null;

  const novo = (tipo: 'despesa' | 'receita') => router.push({ pathname: '/lancamento/[id]', params: { id: 'novo', tipo } });

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <View style={styles.acoes}>
        <Botao titulo="+ Despesa" onPress={() => novo('despesa')} style={{ flex: 1 }} />
        <Botao titulo="+ Receita avulsa" variante="secundario" onPress={() => novo('receita')} style={{ flex: 1 }} />
      </View>

      <View style={styles.grade}>
        <Indicador rotulo="A receber" valor={formatarPreco(receber.total)} cor={receber.total > 0 ? Cores.sucesso : undefined} />
        <Indicador
          rotulo={pagar.vencidas.length ? `A pagar (${pagar.vencidas.length} vencida${pagar.vencidas.length > 1 ? 's' : ''})` : 'A pagar'}
          valor={formatarPreco(pagar.total)}
          cor={pagar.vencidas.length ? Cores.perigo : undefined}
        />
      </View>

      <View style={styles.chips}>
        <Chip rotulo="Mês a mês" ativo={aba === 'resumo'} onPress={() => setAba('resumo')} />
        <Chip rotulo={`Contas a pagar (${pagar.lista.length})`} ativo={aba === 'pagar'} onPress={() => setAba('pagar')} />
        <Chip rotulo="A receber" ativo={aba === 'receber'} onPress={() => setAba('receber')} />
      </View>

      {aba === 'resumo' && (
        <>
          <View style={styles.mes}>
            <BotaoPasso sinal="−" rotulo="Mês anterior" onPress={() => setMes(mesAnterior(mes))} />
            <Text style={styles.mesTexto}>{nomeDoMes(mes)}</Text>
            <BotaoPasso sinal="+" rotulo="Próximo mês" onPress={() => setMes(mesAnterior(mes, -1))} desativado={mes >= mesDe(hoje)} />
          </View>

          <Cartao style={{ gap: 2 }}>
            <Linha rotulo="Entradas" valor={formatarPreco(resumo.entradas)} />
            <Linha rotulo="Saídas" valor={`− ${formatarPreco(resumo.saidas)}`} />
            <View style={styles.divisor} />
            <View style={styles.linhaEntre}>
              <Text style={styles.forte}>Resultado do mês</Text>
              <Text style={[styles.forte, { color: resumo.resultado >= 0 ? Cores.sucesso : Cores.perigo }]}>
                {resumo.resultado < 0 ? '− ' : ''}
                {formatarPreco(Math.abs(resumo.resultado))}
              </Text>
            </View>
          </Cartao>

          {resumo.porForma.length > 0 && (
            <>
              <Titulo>Entradas por forma de pagamento</Titulo>
              <Cartao style={{ gap: Espaco.sm }}>
                {resumo.porForma.map((f) => (
                  <Barra key={f.nome} nome={f.nome} valor={f.valor} total={resumo.entradas} cor={Cores.sucesso} />
                ))}
              </Cartao>
            </>
          )}

          {resumo.porCategoria.length > 0 && (
            <>
              <Titulo>Despesas por categoria</Titulo>
              <Cartao style={{ gap: Espaco.sm }}>
                {resumo.porCategoria.map((c) => (
                  <Barra key={c.nome} nome={c.nome} valor={c.valor} total={resumo.saidas} cor={Cores.perigo} />
                ))}
              </Cartao>
            </>
          )}

          <Titulo>Movimentações ({resumo.movimentos.length})</Titulo>
          {resumo.movimentos.length === 0 ? (
            <Text style={styles.dica}>Nada entrou nem saiu neste mês.</Text>
          ) : (
            <Cartao style={{ gap: 0, paddingVertical: Espaco.xs }}>
              {resumo.movimentos.map((m, i) => (
                <LinhaMovimento key={m.id} m={m} primeira={i === 0} />
              ))}
            </Cartao>
          )}
        </>
      )}

      {aba === 'pagar' && (
        <>
          {pagar.lista.length === 0 ? (
            <Text style={styles.dica}>Nenhuma conta a pagar. Cadastre aluguel, manutenção e outras despesas com “+ Despesa”.</Text>
          ) : (
            <Cartao style={{ gap: 0, paddingVertical: Espaco.xs }}>
              {pagar.lista.map((x, i) => {
                const vencida = x.vencimento < hoje;
                return (
                  <View key={x.id} style={[styles.movimento, i > 0 && styles.separador]}>
                    <Pressable
                      style={{ flex: 1, gap: 2 }}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: x.id } })}>
                      <Text style={styles.movTitulo}>{x.descricao}</Text>
                      <Text style={[styles.dica, vencida && { color: Cores.perigo, fontWeight: '700' }]}>
                        {x.categoria} · {vencida ? 'venceu' : 'vence'} {formatarData(x.vencimento)}
                      </Text>
                    </Pressable>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.movValor}>{formatarPreco(x.valor)}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => salvarLancamento({ ...x, pagoEm: hoje, forma: x.forma ?? 'Pix' })}
                        style={styles.pagarBotao}>
                        <Text style={styles.pagarTexto}>Paguei</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </Cartao>
          )}
        </>
      )}

      {aba === 'receber' && (
        <>
          {receber.locacoes.length === 0 && receber.avulsas.length === 0 ? (
            <Text style={styles.dica}>Ninguém está devendo. 👏</Text>
          ) : (
            <Cartao style={{ gap: 0, paddingVertical: Espaco.xs }}>
              {receber.locacoes.map(({ l, saldo }, i) => {
                const boleto = l.cobrancas.find((c) => c.etapa === 'aguardando' || c.etapa === 'vencida' || c.etapa === 'negativada');
                return (
                  <Pressable
                    key={l.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/locacao/[id]', params: { id: l.id } })}
                    style={[styles.movimento, i > 0 && styles.separador]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.movTitulo}>{nomes.get(l.clienteId) ?? 'Cliente removido'}</Text>
                      <Text style={styles.dica}>
                        Locação nº {l.numero}
                        {boleto ? ` · boleto vence ${formatarData(boleto.vencimento)}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.movValor}>{formatarPreco(saldo)}</Text>
                      {boleto?.etapa === 'vencida' && <Selo texto="boleto vencido" cor={Cores.perigo} fundo={Cores.perigoClaro} />}
                      {boleto?.etapa === 'negativada' && <Selo texto="no Serasa" cor="#fff" fundo={Cores.perigo} />}
                    </View>
                  </Pressable>
                );
              })}
              {receber.avulsas.map((x) => (
                <Pressable
                  key={x.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: x.id } })}
                  style={[styles.movimento, styles.separador]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.movTitulo}>{x.descricao}</Text>
                    <Text style={styles.dica}>Receita avulsa · vence {formatarData(x.vencimento)}</Text>
                  </View>
                  <Text style={styles.movValor}>{formatarPreco(x.valor)}</Text>
                </Pressable>
              ))}
            </Cartao>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Indicador({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <Cartao style={styles.indicador}>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
      <Text style={[styles.indicadorValor, cor ? { color: cor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </Cartao>
  );
}

/** Linha com nome, valor e uma barra proporcional ao total. */
function Barra({ nome, valor, total, cor }: { nome: string; valor: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.linhaEntre}>
        <Text style={styles.barraNome}>{nome}</Text>
        <Text style={styles.barraValor}>
          {formatarPreco(valor)} · {pct}%
        </Text>
      </View>
      <View style={styles.trilho}>
        <View style={[styles.preenchido, { width: `${pct}%`, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

function LinhaMovimento({ m, primeira }: { m: Movimento; primeira: boolean }) {
  const abrir = () =>
    m.locacaoId
      ? router.push({ pathname: '/locacao/[id]', params: { id: m.locacaoId } })
      : m.lancamentoId && router.push({ pathname: '/lancamento/[id]', params: { id: m.lancamentoId } });
  return (
    <Pressable accessibilityRole="button" onPress={abrir} style={[styles.movimento, !primeira && styles.separador]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.movTitulo}>{m.descricao}</Text>
        <Text style={styles.dica}>
          {formatarData(m.data)} · {m.detalhe}
          {m.forma ? ` · ${m.forma}` : ''}
        </Text>
      </View>
      <Text style={[styles.movValor, { color: m.tipo === 'entrada' ? Cores.sucesso : Cores.perigo }]}>
        {m.tipo === 'entrada' ? '+' : '−'} {formatarPreco(m.valor)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  acoes: { flexDirection: 'row', gap: Espaco.sm },
  grade: { flexDirection: 'row', gap: Espaco.sm },
  indicador: { flex: 1, gap: 4, padding: Espaco.md },
  indicadorRotulo: { fontSize: 13, color: Cores.textoSecundario, fontWeight: '600' },
  indicadorValor: { fontSize: 20, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  mes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Espaco.lg },
  mesTexto: { fontSize: 18, fontWeight: '800', color: Cores.texto, minWidth: 110, textAlign: 'center' },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: Espaco.sm },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  forte: { fontSize: 17, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  barraNome: { fontSize: 14, color: Cores.texto, fontWeight: '600' },
  barraValor: { fontSize: 13, color: Cores.textoSecundario, fontVariant: ['tabular-nums'] },
  trilho: { height: 8, borderRadius: 4, backgroundColor: Cores.fundo, overflow: 'hidden' },
  preenchido: { height: 8, borderRadius: 4 },
  movimento: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, paddingVertical: Espaco.md },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  movTitulo: { fontSize: 15, fontWeight: '700', color: Cores.texto },
  movValor: { fontSize: 15, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  pagarBotao: { backgroundColor: Cores.sucessoClaro, borderRadius: Raio.pill, paddingHorizontal: Espaco.md, paddingVertical: 4 },
  pagarTexto: { color: Cores.sucesso, fontWeight: '800', fontSize: 13 },
});
