import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GaleriaFotos, Miniatura } from '@/components/fotos';
import { PainelCobranca } from '@/components/painel-cobranca';
import { Botao, Campo, Cartao, Chip, Contador, Linha, SeloEtapa, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima } from '@/constants/theme';
import {
  diariaTotal,
  diasDeAtraso,
  estaAberta,
  etapaDaLocacao,
  multaPrevista,
  previsaoDevolucao,
  saldoDevedor,
  subtotal,
  totalLocacao,
  totalPago,
  unidadesLivres,
} from '@/lib/calculos';
import { formatarData, formatarDataLonga, formatarPreco, lerValor, somarDias, valorParaCampo } from '@/lib/format';
import { abrirWhatsApp, temWhatsApp } from '@/lib/whatsapp';
import { useDados } from '@/store/dados';
import { FORMAS_PAGAMENTO, FormaPagamento, Locacao } from '@/store/tipos';

type Acao = null | 'pagar' | 'devolver' | 'cancelar' | 'estender';

export default function TelaLocacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { carregado, locacoes } = useDados();
  if (!carregado) return null;
  const l = locacoes.find((x) => x.id === id);
  if (!l) return <Vazio emoji="🔍" titulo="Locação não encontrada" />;
  return <Detalhe l={l} />;
}

function Detalhe({ l }: { l: Locacao }) {
  const {
    clientes,
    itens: estoque,
    locacoes,
    loja,
    hoje,
    ehPro,
    registrarPagamento,
    devolver,
    cancelar,
    estender,
    adicionarFotos,
    removerFoto,
  } = useDados();
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
  // devolução
  const [avaria, setAvaria] = useState('');
  const [avariaDescricao, setAvariaDescricao] = useState('');
  const [fotosDevolucao, setFotosDevolucao] = useState<string[]>([]);
  const [usarCaucao, setUsarCaucao] = useState(true);
  // renovação
  const [diasExtras, setDiasExtras] = useState(1);

  const valorAvaria = lerValor(avaria);
  const devidoNaDevolucao = Math.round((saldo + valorAvaria) * 100) / 100;
  const retidoDaCaucao = l.caucao > 0 && usarCaucao ? Math.min(l.caucao, devidoNaDevolucao) : 0;
  const caucaoDevolvida = l.caucao - retidoDaCaucao;

  const fimAtual = previsaoDevolucao(l);
  const inicioExtensao = fimAtual > hoje ? fimAtual : hoje;
  const fimExtensao = somarDias(fimAtual, diasExtras);
  const conflitos = l.itens.filter((i) => {
    const item = estoque.find((x) => x.id === i.itemId);
    return item && unidadesLivres(item, inicioExtensao, fimExtensao, locacoes, hoje, l.id) < i.qtd;
  });

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

  function confirmarDevolucao() {
    devolver(l.id, { avaria: valorAvaria, avariaDescricao: avariaDescricao.trim(), caucaoDevolvida, fotos: fotosDevolucao });
    if (retidoDaCaucao > 0) registrarPagamento(l.id, retidoDaCaucao, 'Caução');
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
    ];
    if (ehPro && loja.telefone) linhas.push('', `Dúvidas: ${loja.telefone}`);
    return linhas.join('\n');
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
                  titulo={etapa === 'atrasada' ? 'Cobrar devolução' : 'Enviar resumo'}
                  variante="secundario"
                  onPress={() => abrirWhatsApp(cliente.telefone, etapa === 'atrasada' ? lembreteAtraso() : recibo())}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          )}
        </Cartao>

        <Titulo>Itens</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          {l.itens.map((i) => (
            <View key={i.itemId} style={styles.item}>
              <Miniatura foto={i.foto ?? estoque.find((x) => x.id === i.itemId)?.foto} tamanho={48} vazio="🧰" />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNome}>
                  {i.qtd}× {i.nome}
                </Text>
                <Text style={styles.sub}>
                  {formatarPreco(i.precoDia)}/dia · {l.dias} {l.dias === 1 ? 'dia' : 'dias'}
                </Text>
              </View>
              <Text style={styles.itemValor}>{formatarPreco(i.precoDia * i.qtd * l.dias)}</Text>
            </View>
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
          {l.avaria > 0 && <Linha rotulo={`Avaria${l.avariaDescricao ? `: ${l.avariaDescricao}` : ''}`} valor={formatarPreco(l.avaria)} />}
          <View style={styles.divisor} />
          <Linha rotulo="Total" valor={formatarPreco(total)} destaque />
          <Linha rotulo="Pago" valor={formatarPreco(pago)} />
          {l.situacao !== 'cancelada' && (
            <Linha rotulo={saldo > 0 ? 'Falta receber' : 'Situação'} valor={saldo > 0 ? formatarPreco(saldo) : 'Quitado ✓'} destaque={saldo > 0} />
          )}
          {l.caucao > 0 && (
            <Text style={styles.sub}>
              Caução: {formatarPreco(l.caucao)}
              {l.caucaoDevolvida !== undefined
                ? ` · devolvido ao cliente ${formatarPreco(l.caucaoDevolvida)}`
                : ' (devolver ao cliente no fim)'}
            </Text>
          )}
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

        {cliente && l.situacao !== 'cancelada' && (
          <>
            <Titulo>Contrato e cobrança</Titulo>
            <PainelCobranca l={l} cliente={cliente} />
          </>
        )}

        <Titulo>Vistoria</Titulo>
        <Cartao style={{ gap: Espaco.lg }}>
          <GaleriaFotos
            titulo="Fotos da retirada"
            fotos={l.fotosRetirada}
            onAdicionar={(f) => adicionarFotos(l.id, 'retirada', f)}
            onRemover={(f) => removerFoto(l.id, 'retirada', f)}
            somenteLeitura={!aberta}
          />
          {(l.fotosDevolucao.length > 0 || !aberta) && (
            <GaleriaFotos
              titulo="Fotos da devolução"
              fotos={l.fotosDevolucao}
              onAdicionar={(f) => adicionarFotos(l.id, 'devolucao', f)}
              onRemover={(f) => removerFoto(l.id, 'devolucao', f)}
              somenteLeitura={l.situacao === 'cancelada'}
            />
          )}
        </Cartao>

        <Titulo>Documentos</Titulo>
        <View style={styles.linha}>
          <Botao
            titulo="Contrato (PDF)"
            variante="secundario"
            onPress={() => router.push({ pathname: '/locacao/documento', params: { id: l.id, tipo: 'contrato' } })}
            style={{ flex: 1 }}
          />
          <Botao
            titulo="Recibo (PDF)"
            variante="secundario"
            onPress={() => router.push({ pathname: '/locacao/documento', params: { id: l.id, tipo: 'recibo' } })}
            style={{ flex: 1 }}
          />
        </View>

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
            <Text style={styles.acaoTitulo}>Registrar devolução</Text>
            <GaleriaFotos
              titulo="Fotos da devolução"
              dica="Compare com as fotos da retirada antes de confirmar."
              fotos={fotosDevolucao}
              onAdicionar={(f) => setFotosDevolucao((x) => [...x, ...f])}
              onRemover={(f) => setFotosDevolucao((x) => x.filter((y) => y !== f))}
            />
            <Campo rotulo="Avaria ou peça faltando (valor)" valor={avaria} onChange={setAvaria} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
            {valorAvaria > 0 && (
              <Campo rotulo="O que aconteceu" valor={avariaDescricao} onChange={setAvariaDescricao} placeholder="Ex.: disco da serra quebrado" />
            )}
            <View style={{ gap: 2 }}>
              {multa > 0 && <Linha rotulo={`Multa de ${atraso} ${atraso === 1 ? 'dia' : 'dias'} de atraso`} valor={formatarPreco(multa)} />}
              {valorAvaria > 0 && <Linha rotulo="Avaria" valor={formatarPreco(valorAvaria)} />}
              <Linha rotulo="Cliente ainda deve" valor={formatarPreco(devidoNaDevolucao)} destaque />
            </View>
            {l.caucao > 0 && (
              <>
                <View style={styles.chips}>
                  <Chip rotulo="Descontar da caução" ativo={usarCaucao} onPress={() => setUsarCaucao(true)} />
                  <Chip rotulo="Devolver caução inteira" ativo={!usarCaucao} onPress={() => setUsarCaucao(false)} />
                </View>
                <Text style={styles.sub}>
                  {retidoDaCaucao > 0
                    ? `Fica com ${formatarPreco(retidoDaCaucao)} da caução e devolve ${formatarPreco(caucaoDevolvida)} ao cliente.`
                    : `Devolva ${formatarPreco(l.caucao)} de caução ao cliente.`}
                </Text>
              </>
            )}
            <View style={styles.linha}>
              <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} style={{ flex: 1 }} />
              <Botao titulo="Confirmar devolução" onPress={confirmarDevolucao} style={{ flex: 1 }} />
            </View>
          </Cartao>
        )}

        {acao === 'estender' && (
          <Cartao style={{ gap: Espaco.md, borderColor: Cores.primaria }}>
            <Text style={styles.acaoTitulo}>Estender prazo</Text>
            <View style={styles.linhaEntre}>
              <Text style={styles.texto}>Dias a mais</Text>
              <Contador valor={diasExtras} onChange={setDiasExtras} min={1} max={90} rotulo="dias a mais" />
            </View>
            <Linha rotulo="Nova devolução" valor={formatarDataLonga(fimExtensao)} />
            <Linha rotulo="Valor a mais" valor={formatarPreco(diariaTotal(l) * diasExtras)} destaque />
            {atraso > 0 && (
              <Text style={styles.sub}>Os dias de atraso passam a fazer parte da locação e deixam de contar como multa.</Text>
            )}
            {conflitos.length > 0 ? (
              <Text style={styles.alerta}>
                Sem estoque livre para estender: {conflitos.map((c) => c.nome).join(', ')} já está reservado nesse período.
              </Text>
            ) : null}
            <View style={styles.linha}>
              <Botao titulo="Voltar" variante="secundario" onPress={() => setAcao(null)} style={{ flex: 1 }} />
              <Botao
                titulo="Estender"
                onPress={() => {
                  estender(l.id, diasExtras);
                  setAcao(null);
                }}
                desativado={conflitos.length > 0}
                style={{ flex: 1 }}
              />
            </View>
          </Cartao>
        )}

        {acao === 'cancelar' && (
          <Cartao style={{ gap: Espaco.md, borderColor: Cores.perigo }}>
            <Text style={styles.acaoTitulo}>Cancelar locação?</Text>
            <Text style={styles.texto}>
              Os itens voltam para o estoque, boletos em aberto são cancelados e a locação sai do faturamento.
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
            {aberta && <Botao titulo="Estender prazo" variante="secundario" onPress={() => setAcao('estender')} />}
            {saldo > 0 && l.situacao !== 'cancelada' && (
              <Botao titulo={`Receber ${formatarPreco(saldo)} agora`} variante={aberta ? 'secundario' : 'primario'} onPress={abrirPagamento} />
            )}
            {aberta && <Botao titulo="Cancelar locação" variante="perigo" onPress={() => setAcao('cancelar')} />}
          </View>
        )}

        {l.historico.length > 0 && (
          <>
            <Titulo>Histórico</Titulo>
            <Cartao style={{ gap: Espaco.sm }}>
              {[...l.historico].reverse().map((h, i) => (
                <View key={i} style={styles.historico}>
                  <Text style={styles.historicoData}>{formatarData(h.data.slice(0, 10))}</Text>
                  <Text style={[styles.texto, { flex: 1 }]}>{h.texto}</Text>
                </View>
              ))}
            </Cartao>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 48 },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: Espaco.md },
  cliente: { fontSize: 18, fontWeight: '800', color: Cores.texto },
  sub: { fontSize: 13, color: Cores.textoSecundario, marginTop: 2, lineHeight: 18 },
  texto: { fontSize: 15, color: Cores.texto, lineHeight: 22 },
  alerta: { fontSize: 14, color: Cores.perigo, fontWeight: '700', marginTop: Espaco.xs },
  acaoTitulo: { fontSize: 17, fontWeight: '800', color: Cores.texto },
  linha: { flexDirection: 'row', gap: Espaco.sm },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: Espaco.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  itemNome: { fontSize: 15, fontWeight: '700', color: Cores.texto },
  itemValor: { fontSize: 15, fontWeight: '700', color: Cores.texto, fontVariant: ['tabular-nums'] },
  historico: { flexDirection: 'row', gap: Espaco.md },
  historicoData: { width: 56, fontSize: 13, color: Cores.textoSecundario, fontVariant: ['tabular-nums'] },
});
