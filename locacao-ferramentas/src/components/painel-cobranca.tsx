import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao, Cartao, Linha, Selo, SeletorData } from '@/components/ui';
import { Cores, Espaco } from '@/constants/theme';
import { saldoDevedor } from '@/lib/calculos';
import { faltaParaCobranca } from '@/lib/documentos';
import { diasEntre, formatarData, formatarPreco, somarDias } from '@/lib/format';
import { gerarPdf, montarHtmlContrato } from '@/lib/pdf';
import { cancelarCobranca, enviarContrato, gerarCobranca, negativar } from '@/lib/servidor';
import { modoDemonstracao } from '@/lib/supabase';
import { abrirWhatsApp, temWhatsApp } from '@/lib/whatsapp';
import { useDados } from '@/store/dados';
import type { Cliente, Cobranca, EtapaCobranca, EtapaContrato, Locacao } from '@/store/tipos';

const ROTULO_CONTRATO: Record<EtapaContrato, { texto: string; cor: string; fundo: string }> = {
  rascunho: { texto: 'não enviado', cor: Cores.textoSecundario, fundo: Cores.borda },
  enviado: { texto: 'aguardando assinatura', cor: Cores.aviso, fundo: Cores.avisoClaro },
  assinado: { texto: 'assinado', cor: Cores.sucesso, fundo: Cores.sucessoClaro },
  recusado: { texto: 'recusado', cor: Cores.perigo, fundo: Cores.perigoClaro },
};

const ROTULO_COBRANCA: Record<EtapaCobranca, { texto: string; cor: string; fundo: string }> = {
  aguardando: { texto: 'aguardando pagamento', cor: Cores.aviso, fundo: Cores.avisoClaro },
  paga: { texto: 'paga', cor: Cores.sucesso, fundo: Cores.sucessoClaro },
  vencida: { texto: 'vencida', cor: Cores.perigo, fundo: Cores.perigoClaro },
  negativada: { texto: 'no Serasa', cor: '#fff', fundo: Cores.perigo },
  cancelada: { texto: 'cancelada', cor: Cores.textoSecundario, fundo: Cores.borda },
};

function primeiroNome(c: Cliente) {
  return c.nome.trim().split(' ')[0];
}

export function PainelCobranca({ l, cliente }: { l: Locacao; cliente: Cliente }) {
  const { loja, hoje, ehPro, atualizarContrato, adicionarCobranca, atualizarCobranca, quitarCobranca } = useDados();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [negativando, setNegativando] = useState<string | null>(null);
  const [novoVencimento, setNovoVencimento] = useState(() => somarDias(hoje, loja.prazoBoletoDias));
  const [criandoBoleto, setCriandoBoleto] = useState(false);

  const contrato = l.contrato;
  const saldo = saldoDevedor(l, loja, hoje);
  // boleto ainda em cobrança (inclui o que está no Serasa): não deixa gerar outro para a mesma dívida
  const pendente = l.cobrancas.find((c) => c.etapa === 'aguardando' || c.etapa === 'vencida' || c.etapa === 'negativada');
  const faltaCliente = faltaParaCobranca(cliente);
  const precisaBoleto = !!contrato && contrato.valorCobranca > 0;
  const bloqueioReal = !modoDemonstracao && precisaBoleto && faltaCliente.length > 0;

  async function executar(acao: () => Promise<void>) {
    setErro('');
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  function mensagemContrato(link: string) {
    const itens = l.itens.map((i) => i.nome).join(', ');
    let texto = `Olá, ${primeiroNome(cliente)}! Aqui é da ${loja.nome || 'locadora'}. Segue o contrato da locação nº ${l.numero} (${itens}) para você assinar pelo celular:\n${link}`;
    if (contrato && contrato.valorCobranca > 0) {
      texto += `\n\nAssim que assinar, você recebe o boleto de ${formatarPreco(contrato.valorCobranca)} com vencimento em ${formatarData(contrato.vencimento)}.`;
    }
    return texto;
  }

  function mensagemBoleto(c: Cobranca) {
    return `Olá, ${primeiroNome(cliente)}! Segue o boleto da locação nº ${l.numero} na ${loja.nome || 'locadora'}: ${formatarPreco(c.valor)}, vencimento em ${formatarData(c.vencimento)}.\n${c.link ?? ''}`;
  }

  const enviarParaAssinatura = () =>
    executar(async () => {
      if (!contrato) return;
      if (!temWhatsApp(cliente.telefone)) throw new Error('Cadastre o celular do cliente para enviar pelo WhatsApp.');
      if (bloqueioReal) throw new Error(`Complete o cadastro do cliente: falta ${faltaCliente.join(', ')}.`);
      let link = contrato.linkAssinatura;
      if (!link || contrato.etapa === 'rascunho') {
        const html = await montarHtmlContrato(loja, cliente, l, hoje);
        const pdf = await gerarPdf(html);
        const r = await enviarContrato({ locacao: l, cliente, pdfBase64: pdf?.base64 ?? null });
        link = r.link;
        atualizarContrato(
          l.id,
          { etapa: 'enviado', linkAssinatura: r.link, idExterno: r.idExterno, simulado: r.simulado, enviadoEm: new Date().toISOString() },
          'Contrato enviado para assinatura',
        );
      }
      abrirWhatsApp(cliente.telefone, mensagemContrato(link));
    });

  const simularAssinatura = () =>
    executar(async () => {
      if (!contrato) return;
      atualizarContrato(l.id, { etapa: 'assinado', assinadoEm: new Date().toISOString() }, 'Contrato assinado pelo cliente (simulação)');
      if (contrato.valorCobranca > 0 && !pendente) {
        const c = await gerarCobranca({ locacao: l, valor: contrato.valorCobranca, vencimento: contrato.vencimento });
        adicionarCobranca(l.id, c);
      }
    });

  const criarBoleto = () =>
    executar(async () => {
      if (!modoDemonstracao && faltaCliente.length) throw new Error(`Complete o cadastro do cliente: falta ${faltaCliente.join(', ')}.`);
      const c = await gerarCobranca({ locacao: l, valor: saldo, vencimento: novoVencimento });
      adicionarCobranca(l.id, c);
      setCriandoBoleto(false);
    });

  const confirmarNegativacao = (c: Cobranca) =>
    executar(async () => {
      if (!modoDemonstracao && faltaCliente.length) throw new Error(`Para negativar, complete o cadastro: falta ${faltaCliente.join(', ')}.`);
      await negativar({ locacao: l, cobranca: c });
      atualizarCobranca(
        l.id,
        c.id,
        { etapa: 'negativada', negativadaEm: new Date().toISOString() },
        c.simulada ? 'Negativação no Serasa solicitada (simulação)' : 'Negativação no Serasa solicitada ao Asaas',
      );
      setNegativando(null);
    });

  const cancelar = (c: Cobranca) =>
    executar(async () => {
      await cancelarCobranca({ locacao: l, cobranca: c });
      atualizarCobranca(l.id, c.id, { etapa: 'cancelada' }, 'Boleto cancelado');
    });

  if (!modoDemonstracao && !ehPro) {
    return (
      <Cartao style={{ gap: Espaco.md }}>
        <Text style={styles.texto}>
          Contrato com assinatura eletrônica, boleto automático e negativação no Serasa fazem parte do plano Pro.
        </Text>
        <Botao titulo="Conhecer o Pro" onPress={() => router.push({ pathname: '/plano', params: { motivo: 'assinatura' } })} />
        <Botao
          titulo="Ver contrato com fotos"
          variante="secundario"
          onPress={() => router.push({ pathname: '/locacao/documento', params: { id: l.id, tipo: 'contrato' } })}
        />
      </Cartao>
    );
  }

  return (
    <Cartao style={{ gap: Espaco.md }}>
      {modoDemonstracao && (
        <Text style={styles.demo}>
          Modo demonstração: assinatura, boleto e Serasa são simulados. Para usar de verdade, ligue o servidor em Configurações › Integrações.
        </Text>
      )}

      {/* Contrato */}
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Contrato</Text>
        {contrato ? <Selo {...ROTULO_CONTRATO[contrato.etapa]} /> : <Selo texto="sem contrato" cor={Cores.textoSecundario} fundo={Cores.borda} />}
      </View>

      {!contrato ? (
        <Botao
          titulo="Criar contrato"
          variante="secundario"
          onPress={() =>
            atualizarContrato(l.id, { etapa: 'rascunho', vencimento: somarDias(hoje, loja.prazoBoletoDias), valorCobranca: saldo }, 'Contrato criado')
          }
        />
      ) : (
        <>
          {contrato.valorCobranca > 0 && contrato.etapa !== 'assinado' && (
            <Linha rotulo="Boleto após assinar" valor={`${formatarPreco(contrato.valorCobranca)} · vence ${formatarData(contrato.vencimento)}`} />
          )}
          {contrato.etapa === 'rascunho' && contrato.valorCobranca > 0 && (
            <View style={styles.linhaEntre}>
              <Text style={styles.rotulo}>Vencimento</Text>
              <SeletorData
                valor={contrato.vencimento}
                onChange={(v) => atualizarContrato(l.id, { vencimento: v < hoje ? hoje : v })}
                rotulo="Vencimento do boleto"
              />
            </View>
          )}
          {contrato.enviadoEm && <Linha rotulo="Enviado" valor={formatarData(contrato.enviadoEm.slice(0, 10))} />}
          {contrato.assinadoEm && <Linha rotulo="Assinado" valor={formatarData(contrato.assinadoEm.slice(0, 10))} />}

          <Botao
            titulo="Ver contrato com fotos"
            variante="secundario"
            onPress={() => router.push({ pathname: '/locacao/documento', params: { id: l.id, tipo: 'contrato' } })}
          />
          {(contrato.etapa === 'rascunho' || contrato.etapa === 'enviado') && (
            <Botao
              titulo={contrato.etapa === 'rascunho' ? 'Enviar para assinar no WhatsApp' : 'Reenviar link no WhatsApp'}
              onPress={enviarParaAssinatura}
              desativado={ocupado}
            />
          )}
          {precisaBoleto && faltaCliente.length > 0 && contrato.etapa !== 'assinado' && (
            <Text style={[styles.dica, !modoDemonstracao && { color: Cores.perigo }]}>
              Para gerar o boleto, falta no cadastro do cliente: {faltaCliente.join(', ')}.
            </Text>
          )}
          {contrato.etapa === 'enviado' &&
            (contrato.simulado ? (
              <Botao titulo="Simular assinatura do cliente" variante="secundario" onPress={simularAssinatura} desativado={ocupado} />
            ) : (
              <Text style={styles.dica}>
                Quando o cliente assinar, o status muda sozinho e o boleto é gerado e enviado para ele.
              </Text>
            ))}
        </>
      )}

      {/* Cobranças */}
      {(l.cobrancas.length > 0 || saldo > 0) && (
        <>
          <View style={[styles.cabecalho, styles.separador]}>
            <Text style={styles.titulo}>Boletos</Text>
          </View>
          {l.cobrancas.map((c) => {
            const atraso = c.etapa === 'vencida' ? diasEntre(c.vencimento, hoje) : 0;
            return (
              <View key={c.id} style={styles.cobranca}>
                <View style={styles.linhaEntre}>
                  <Text style={styles.valor}>{formatarPreco(c.valor)}</Text>
                  <Selo {...ROTULO_COBRANCA[c.etapa]} />
                </View>
                <Text style={styles.dica}>
                  Vence {formatarData(c.vencimento)}
                  {c.pagaEm ? ` · pago em ${formatarData(c.pagaEm)}` : ''}
                  {atraso > 0 ? ` · ${atraso} ${atraso === 1 ? 'dia' : 'dias'} de atraso` : ''}
                  {c.simulada ? ' · simulação' : ''}
                </Text>
                {c.etapa === 'vencida' && loja.negativarAuto && (
                  <Text style={styles.dica}>
                    Negativação automática {atraso >= loja.diasParaNegativar ? 'em processamento' : `em ${loja.diasParaNegativar - atraso} dias`}.
                  </Text>
                )}

                {(c.etapa === 'aguardando' || c.etapa === 'vencida') && (
                  <View style={{ gap: Espaco.sm }}>
                    {temWhatsApp(cliente.telefone) && (
                      <Botao titulo="Enviar boleto no WhatsApp" variante="secundario" onPress={() => abrirWhatsApp(cliente.telefone, mensagemBoleto(c))} />
                    )}
                    {c.simulada && c.etapa === 'aguardando' && (
                      <View style={styles.acoes}>
                        <Botao titulo="Simular pagamento" variante="secundario" onPress={() => quitarCobranca(l.id, c.id)} style={{ flex: 1 }} />
                        <Botao
                          titulo="Simular vencimento"
                          variante="secundario"
                          onPress={() =>
                            atualizarCobranca(
                              l.id,
                              c.id,
                              { etapa: 'vencida', vencimento: somarDias(hoje, -loja.diasParaNegativar) },
                              'Boleto venceu sem pagamento (simulação)',
                            )
                          }
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}
                    {c.simulada && c.etapa === 'vencida' && (
                      <Botao titulo="Simular pagamento" variante="secundario" onPress={() => quitarCobranca(l.id, c.id)} />
                    )}
                    {c.etapa === 'vencida' &&
                      (negativando === c.id ? (
                        <View style={styles.confirmar}>
                          <Text style={styles.texto}>
                            O Asaas envia ao cliente a notificação exigida por lei. Se ele não pagar no prazo dessa notificação, o nome é
                            incluído no Serasa. O serviço pode ter tarifa no Asaas.
                          </Text>
                          <View style={styles.acoes}>
                            <Botao titulo="Voltar" variante="secundario" onPress={() => setNegativando(null)} style={{ flex: 1 }} />
                            <Botao titulo="Negativar" variante="perigo" onPress={() => confirmarNegativacao(c)} desativado={ocupado} style={{ flex: 1 }} />
                          </View>
                        </View>
                      ) : (
                        <Botao titulo="Negativar no Serasa" variante="perigo" onPress={() => setNegativando(c.id)} />
                      ))}
                    {c.etapa === 'aguardando' && <Botao titulo="Cancelar boleto" variante="perigo" onPress={() => cancelar(c)} desativado={ocupado} />}
                  </View>
                )}
              </View>
            );
          })}

          {saldo > 0 && !pendente && l.situacao !== 'cancelada' && (contrato?.etapa === 'assinado' || !contrato) &&
            (criandoBoleto ? (
              <View style={styles.confirmar}>
                <Text style={styles.texto}>Boleto de {formatarPreco(saldo)} (saldo da locação)</Text>
                <View style={styles.linhaEntre}>
                  <Text style={styles.rotulo}>Vencimento</Text>
                  <SeletorData valor={novoVencimento} onChange={(v) => setNovoVencimento(v < hoje ? hoje : v)} rotulo="Vencimento" />
                </View>
                <View style={styles.acoes}>
                  <Botao titulo="Voltar" variante="secundario" onPress={() => setCriandoBoleto(false)} style={{ flex: 1 }} />
                  <Botao titulo="Gerar boleto" onPress={criarBoleto} desativado={ocupado} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Botao titulo={`Gerar boleto de ${formatarPreco(saldo)}`} variante="secundario" onPress={() => setCriandoBoleto(true)} />
            ))}
        </>
      )}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  demo: { fontSize: 13, color: Cores.aviso, backgroundColor: Cores.avisoClaro, padding: Espaco.sm, borderRadius: 8, lineHeight: 18 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda, paddingTop: Espaco.md },
  titulo: { fontSize: 16, fontWeight: '800', color: Cores.texto },
  rotulo: { fontSize: 15, fontWeight: '600', color: Cores.texto },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  cobranca: { gap: Espaco.sm, borderWidth: 1, borderColor: Cores.borda, borderRadius: 12, padding: Espaco.md },
  valor: { fontSize: 17, fontWeight: '800', color: Cores.texto, fontVariant: ['tabular-nums'] },
  dica: { fontSize: 13, color: Cores.textoSecundario, lineHeight: 18 },
  texto: { fontSize: 14, color: Cores.texto, lineHeight: 20 },
  acoes: { flexDirection: 'row', gap: Espaco.sm },
  confirmar: { gap: Espaco.sm, backgroundColor: Cores.fundo, borderRadius: 12, padding: Espaco.md },
  erro: { fontSize: 13, color: Cores.perigo },
});
