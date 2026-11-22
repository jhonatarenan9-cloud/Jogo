import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Campo, Cartao, Chip, Linha, SeloEtapa, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import {
  diasDeAtraso,
  estaAberta,
  etapaDaLocacao,
  multaPrevista,
  previsaoDevolucao,
  saldoDevedor,
  subtotal,
  totalLocacao,
  totalPago,
} from '@/lib/calculos';
import { formatarData, formatarDataLonga, formatarPreco, lerValor, valorParaCampo } from '@/lib/format';
import { abrirWhatsApp, temWhatsApp } from '@/lib/whatsapp';
import { useDados } from '@/store/dados';
import { FORMAS_PAGAMENTO, FormaPagamento, Locacao } from '@/store/tipos';

type Acao = null | 'pagar' | 'devolver' | 'cancelar';

export default function TelaLocacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { carregado, locacoes } = useDados();
  if (!carregado) return null;
  const l = locacoes.find((x) => x.id === id);
  if (!l) return <Vazio emoji="🔍" titulo="Locação não encontrada" />;
  return <Detalhe l={l} />;
}

function Detalhe({ l }: { l: Locacao }) {
  const { clientes, loja, hoje, ehPro, registrarPagamento, devolver, cancelar } = useDados();
  const cliente = clientes.find((c) => c.id === l.clienteId);
  const etapa = etapaDaLocacao(l, hoje);
  const aberta = estaAberta(l);
  const atraso = diasDeAtraso(l, hoje);
  const multa = multaPrevista(l, loja, hoje);
  const total = totalLocacao(l, loja, hoje);
  const pago = totalPago(l);
  const saldo = saldoDevedor(l, loja, hoje);

  const [acao, setAcao] = useState<Acao>(null);
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('Pix');

  function abrirPagamento() {
    setValor(valorParaCampo(saldo));
    setAcao('pagar');
  }

  function confirmarPagamento() {
    const v = lerValor(valor);
    if (v <= 0) return;
    registrarPagamento(l.id, v, forma);
    setAcao(null);
  }

  function recibo() {
    const linhas = [
      `*${loja.nome || 'Locadora'}* — Locação #${l.numero}`,
      '',
      ...l.itens.map((i) => `• ${i.qtd}× ${i.nome} (${formatarPreco(i.precoDia)}/dia)`),
      '',
      `Retirada: ${formatarData(l.inicio)}`,
      `Devolução: ${formatarData(previsaoDevolucao(l))}`,
      `Total: ${formatarPreco(total)}`,
      `Pago: ${formatarPreco(pago)}`,
      saldo > 0 ? `*Falta pagar: ${formatarPreco(saldo)}*` : 'Pagamento quitado ✅',
      l.caucao > 0 ? `Caução: ${formatarPreco(l.caucao)} (devolvida no fim)` : '',
    ];
    if (ehPro && loja.telefone) linhas.push('', `Dúvidas: ${loja.telefone}`);
    return linhas.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  }

  function lembreteAtraso() {
    const primeiro = cliente?.nome.split(' ')[0] ?? '';
    return (
      `Olá, ${primeiro}! Aqui é da ${loja.nome || 'locadora'}. ` +
      `A devolução da locação #${l.numero} (${l.itens.map((i) => i.nome).join(', ')}) ` +
      `estava prevista para ${formatarData(previsaoDevolucao(l))}. Consegue devolver hoje?`
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: `Locação #${l.numero}` }} />
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Cartao style={{ gap: Espaco.sm }}>
          <View style={styles.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cliente}>{cliente?.nome ?? 'Cliente removido'}</Text>
              {cliente?.telefone ? <Text style={styles.sub}>{cliente.telefone}</Text> : null}
            </View>
            <SeloEtapa etapa={etapa} />
          </View>
          {cliente && (
            <View style={styles.linha}>
              <Botao
                titulo="Ver cliente"
                variante="secundario"
                onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: cliente.id } })}
                style={{ flex: 1 }}
              />
              {temWhatsApp(cliente.telefone) && (
                <Botao
                  titulo={etapa === 'atrasada' ? 'Cobrar devolução' : 'Enviar recibo'}
                  variante="secundario"
                  onPress={() => abrirWhatsApp(cliente.telefone, etapa === 'atrasada' ? lembreteAtraso() : recibo())}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}
        </Cartao>

        <Titulo>Itens</Titulo>
        <Cartao style={{ gap: 2 }}>
          {l.itens.map((i) => (
            <Linha key={i.itemId} rotulo={`${i.qtd}× ${i.nome}`} valor={`${formatarPreco(i.precoDia * i.qtd)}/dia`} />
          ))}
        </Cartao>

        <Titulo>Período</Titulo>
        <Cartao style={{ gap: 2 }}>
          <Linha rotulo="Retirada" valor={formatarDataLonga(l.inicio)} />
          <Linha rotulo="Devolução prevista" valor={formatarDataLonga(previsaoDevolucao(l))} />
          <Linha rotulo="Dias contratados" valor={String(l.dias)} />
          {l.devolvidaEm && <Linha rotulo="Devolvida em" valor={formatarDataLonga(l.devolvidaEm)} />}
          {atraso > 0 && (
            <Text style={styles.alerta}>
              {atraso} {atraso === 1 ? 'dia' : 'dias'} de atraso
              {loja.cobrarAtraso ? ` · multa até agora: ${formatarPreco(multa)}` : ''}
            </Text>
          )}
        </Cartao>

        <Titulo>Valores</Titulo>
        <Cartao style={{ gap: 2 }}>
          <Linha rotulo="Diárias" valor={formatarPreco(subtotal(l))} />
          {l.desconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarPreco(l.desconto)}`} />}
          {l.taxaEntrega > 0 && <Linha rotulo="Frete" valor={formatarPreco(l.taxaEntrega)} />}
          {multa > 0 && <Linha rotulo={aberta ? 'Multa por atraso (até hoje)' : 'Multa por atraso'} valor={formatarPreco(multa)} />}
          <View style={styles.divisor} />
          <Linha rotulo="Total" valor={formatarPreco(total)} destaque />
          <Linha rotulo="Pago" valor={formatarPreco(pago)} />
          {l.situacao !== 'cancelada' && (
            <Linha rotulo={saldo > 0 ? 'Falta receber' : 'Situação'} valor={saldo > 0 ? formatarPreco(saldo) : 'Quitado ✓'} destaque={saldo > 0} />
          )}
          {l.caucao > 0 && <Text style={styles.sub}>Caução recebida: {formatarPreco(l.caucao)} (devolver ao cliente no fim)</Text>}
        </Cartao>

        {l.pagamentos.length > 0 && (
          <>
            <Titulo>Pagamentos</Titulo>
            <Cartao style={{ gap: 2 }}>
              {l.pagamentos.map((p) => (
                <Linha key={p.id} rotulo={`${formatarData(p.data)} · ${p.forma}`} valor={formatarPreco(p.valor)} />
              ))}
            </Cartao>
          </>
        )}

        {l.obs ? (
          <>
            <Titulo>Observações</Titulo>
            <Cartao>
              <Text style={styles.texto}>{l.obs}</Text>
            </Cartao>
          </>
        ) : null}

        {/* Ações */}
        {acao === 'pagar' && (
          <Cartao style={{ gap: Espaco.md, borderColor: Cores.primaria }}>
            <Text style={styles.acaoTitulo}>Registrar pagamento</Text>
            <Campo rotulo="Valor recebido" valor={valor} onChange={setValor} teclado="decimal-pad" prefixo="R$" />
            <View style={styles.chips}>
              {FORMAS_PAGAMENTO.map((f) => (
                <Chip key={f} rotulo={f} ativo={forma === f} onPress={() => setForma(f)} />
              ))}
            </View>
            <View style={styles.linha}>
              <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} style={{ flex: 1 }} />
              <Botao titulo="Confirmar" onPress={confirmarPagamento} desativado={lerValor(valor) <= 0} style={{ flex: 1 }} />
            </View>
          </Cartao>
        )}

        {acao === 'devolver' && (
          <Cartao style={{ gap: Espaco.md, borderColor: Cores.primaria }}>
            <Text style={styles.acaoTitulo}>Confirmar devolução</Text>
            <Text style={styles.texto}>
              Os itens voltam para o estoque.
              {multa > 0 ? ` Será cobrada multa de ${formatarPreco(multa)} pelo atraso.` : ''}
              {saldo > 0 ? ` Ainda falta receber ${formatarPreco(saldo)}.` : ''}
              {l.caucao > 0 ? ` Lembre de devolver a caução de ${formatarPreco(l.caucao)}.` : ''}
            </Text>
            <View style={styles.linha}>
              <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} style={{ flex: 1 }} />
              <Botao
                titulo="Devolvido"
                onPress={() => {
                  devolver(l.id);
                  setAcao(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Cartao>
        )}

        {acao === 'cancelar' && (
          <Cartao style={{ gap: Espaco.md, borderColor: Cores.perigo }}>
            <Text style={styles.acaoTitulo}>Cancelar locação?</Text>
            <Text style={styles.texto}>
              Os itens voltam para o estoque e a locação sai do faturamento.
              {pago > 0 ? ` Os ${formatarPreco(pago)} já recebidos continuam registrados; devolva ao cliente se for o caso.` : ''}
            </Text>
            <View style={styles.linha}>
              <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} style={{ flex: 1 }} />
              <Botao
                titulo="Cancelar locação"
                variante="perigo"
                onPress={() => {
                  cancelar(l.id);
                  setAcao(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Cartao>
        )}

        {acao === null && (
          <View style={{ gap: Espaco.sm }}>
            {aberta && <Botao titulo="Registrar devolução" onPress={() => setAcao('devolver')} />}
            {saldo > 0 && l.situacao !== 'cancelada' && (
              <Botao titulo={`Receber ${formatarPreco(saldo)}`} variante={aberta ? 'secundario' : 'primario'} onPress={abrirPagamento} />
            )}
            {aberta && <Botao titulo="Cancelar locação" variante="perigo" onPress={() => setAcao('cancelar')} />}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: Espaco.md },
  cliente: { fontSize: 18, fontWeight: '800', color: Cores.texto },
  sub: { fontSize: 13, color: Cores.textoSecundario, marginTop: 4 },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22 },
  alerta: { fontSize: 14, color: Cores.perigo, fontWeight: '700', marginTop: Espaco.xs },
  acaoTitulo: { fontSize: 17, fontWeight: '800', color: Cores.texto },
  linha: { flexDirection: 'row', gap: Espaco.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: Espaco.sm },
});
