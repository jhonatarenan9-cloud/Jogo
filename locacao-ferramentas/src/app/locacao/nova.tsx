import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, Busca, Campo, Cartao, Chip, Contador, Linha, SeletorData, Titulo, Vazio } from '@/components/ui';
import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';
import { unidadesLivres } from '@/lib/calculos';
import { formatarData, formatarPreco, lerValor, mascararTelefone, normalizar, somarDias, valorParaCampo } from '@/lib/format';
import { useDados } from '@/store/dados';
import { FORMAS_PAGAMENTO, FormaPagamento, ItemLocado } from '@/store/tipos';

const DIAS_RAPIDOS = [1, 2, 3, 7, 15, 30];
type Pagar = 'depois' | 'tudo' | 'parte';

export default function NovaLocacao() {
  const { itens, clientes, locacoes, hoje, podeCriar, salvarCliente, criarLocacao } = useDados();
  const insets = useSafeAreaInsets();

  const [clienteId, setClienteId] = useState<string | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');

  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [buscaItem, setBuscaItem] = useState('');
  const [inicio, setInicio] = useState(hoje);
  const [dias, setDias] = useState(1);
  const [desconto, setDesconto] = useState('');
  const [entrega, setEntrega] = useState('');
  const [caucaoTexto, setCaucaoTexto] = useState<string | null>(null);
  const [pagar, setPagar] = useState<Pagar>('tudo');
  const [valorParte, setValorParte] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [obs, setObs] = useState('');

  const fim = somarDias(inicio, dias);
  const cliente = clientes.find((c) => c.id === clienteId);

  const livres = useMemo(
    () => Object.fromEntries(itens.map((i) => [i.id, unidadesLivres(i, inicio, fim, locacoes, hoje)])),
    [itens, inicio, fim, locacoes, hoje],
  );

  const escolhidos: ItemLocado[] = itens
    .filter((i) => (qtds[i.id] ?? 0) > 0)
    .map((i) => ({ itemId: i.id, nome: i.nome, precoDia: i.precoDia, qtd: qtds[i.id] }));
  const faltaEstoque = escolhidos.filter((e) => e.qtd > (livres[e.itemId] ?? 0));

  const diaria = escolhidos.reduce((s, e) => s + e.precoDia * e.qtd, 0);
  const caucaoSugerida = escolhidos.reduce((s, e) => s + (itens.find((i) => i.id === e.itemId)?.caucao ?? 0) * e.qtd, 0);
  const caucao = caucaoTexto === null ? caucaoSugerida : lerValor(caucaoTexto);
  const valorDesconto = lerValor(desconto);
  const valorEntrega = lerValor(entrega);
  const total = Math.max(0, diaria * dias - valorDesconto + valorEntrega);
  const valorPago = pagar === 'tudo' ? total : pagar === 'parte' ? Math.min(total, lerValor(valorParte)) : 0;

  const clientesFiltrados = useMemo(() => {
    const termo = normalizar(buscaCliente.trim());
    const digitos = buscaCliente.replace(/\D/g, '');
    return clientes
      .filter(
        (c) =>
          !termo ||
          normalizar(c.nome).includes(termo) ||
          (digitos.length >= 3 && c.telefone.replace(/\D/g, '').includes(digitos)),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 6);
  }, [clientes, buscaCliente]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizar(buscaItem.trim());
    return itens
      .filter((i) => !termo || normalizar(`${i.nome} ${i.categoria}`).includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [itens, buscaItem]);

  const novoClienteValido = novoNome.trim().length >= 2;
  const temCliente = !!cliente || (novoCliente && novoClienteValido);
  const pendencias = [
    !temCliente && 'escolha o cliente',
    escolhidos.length === 0 && 'escolha pelo menos um item',
    faltaEstoque.length > 0 && 'ajuste os itens sem estoque',
  ].filter(Boolean) as string[];

  function registrar() {
    if (pendencias.length) return;
    let idCliente = clienteId;
    if (!cliente) {
      idCliente = salvarCliente({
        nome: novoNome.trim(),
        telefone: novoTelefone,
        documento: '',
        endereco: '',
        obs: '',
      });
    }
    const id = criarLocacao({
      clienteId: idCliente!,
      itens: escolhidos,
      inicio,
      dias,
      desconto: valorDesconto,
      taxaEntrega: valorEntrega,
      caucao,
      obs: obs.trim(),
      pagamentoInicial: valorPago > 0 ? { valor: valorPago, forma } : undefined,
    });
    router.replace({ pathname: '/locacao/[id]', params: { id } });
  }

  if (itens.length === 0) {
    return (
      <Vazio emoji="🧰" titulo="Cadastre seus itens primeiro" texto="Para registrar uma locação, o estoque precisa ter pelo menos um item.">
        <Botao titulo="Ir para o estoque" onPress={() => router.replace('/estoque')} />
      </Vazio>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {/* Cliente */}
        <Titulo>1. Cliente</Titulo>
        {cliente ? (
          <Cartao style={styles.escolhido}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{cliente.nome}</Text>
              {cliente.telefone ? <Text style={styles.sub}>{cliente.telefone}</Text> : null}
            </View>
            <Botao titulo="Trocar" variante="secundario" onPress={() => setClienteId(null)} />
          </Cartao>
        ) : novoCliente ? (
          <Cartao style={{ gap: Espaco.md }}>
            <Campo rotulo="Nome do cliente" valor={novoNome} onChange={setNovoNome} placeholder="Nome completo ou empresa" />
            <Campo
              rotulo="Telefone / WhatsApp"
              valor={novoTelefone}
              onChange={(v) => setNovoTelefone(mascararTelefone(v))}
              placeholder="(11) 91234-5678"
              teclado="phone-pad"
            />
            <Text style={styles.sub}>O cliente será salvo junto com a locação.</Text>
            {clientes.length > 0 && <Botao titulo="Escolher cliente já cadastrado" variante="secundario" onPress={() => setNovoCliente(false)} />}
          </Cartao>
        ) : (
          <View style={{ gap: Espaco.sm }}>
            {clientes.length > 0 && <Busca valor={buscaCliente} onChange={setBuscaCliente} placeholder="Buscar cliente pelo nome ou telefone" />}
            {clientesFiltrados.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => setClienteId(c.id)}
                style={({ pressed }) => [styles.opcao, pressed && { opacity: 0.8 }]}>
                <Text style={styles.nome}>{c.nome}</Text>
                {c.telefone ? <Text style={styles.sub}>{c.telefone}</Text> : null}
              </Pressable>
            ))}
            {podeCriar('clientes') ? (
              <Botao
                titulo="+ Cadastrar cliente novo"
                variante="secundario"
                onPress={() => {
                  setNovoCliente(true);
                  if (buscaCliente.replace(/\D/g, '').length < 3) setNovoNome(buscaCliente);
                }}
              />
            ) : (
              <Text style={styles.sub}>Limite de clientes do plano Grátis atingido. Assine o Pro para cadastrar mais.</Text>
            )}
          </View>
        )}

        {/* Período */}
        <Titulo>2. Período</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <View style={styles.linhaEntre}>
            <Text style={styles.rotulo}>Retirada</Text>
            <SeletorData valor={inicio} onChange={setInicio} rotulo="Retirada" />
          </View>
          <View style={styles.linhaEntre}>
            <Text style={styles.rotulo}>Dias</Text>
            <Contador valor={dias} onChange={setDias} min={1} max={365} rotulo="dias" />
          </View>
          <View style={styles.chips}>
            {DIAS_RAPIDOS.map((n) => (
              <Chip key={n} rotulo={n === 1 ? '1 dia' : `${n} dias`} ativo={dias === n} onPress={() => setDias(n)} />
            ))}
          </View>
          <Text style={styles.sub}>Devolução prevista: {formatarData(fim)}</Text>
        </Cartao>

        {/* Itens */}
        <Titulo>3. Itens</Titulo>
        {itens.length > 6 && <Busca valor={buscaItem} onChange={setBuscaItem} placeholder="Buscar item" />}
        <Cartao style={{ gap: Espaco.md, paddingVertical: Espaco.md }}>
          {itensFiltrados.map((i, idx) => {
            const qtd = qtds[i.id] ?? 0;
            const livre = livres[i.id] ?? 0;
            const semEstoque = qtd > livre;
            return (
              <View key={i.id} style={[styles.linhaItem, idx > 0 && styles.separador]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.nome}>{i.nome}</Text>
                  <Text style={[styles.sub, (livre === 0 || semEstoque) && { color: Cores.perigo }]}>
                    {formatarPreco(i.precoDia)}/dia · {livre === 0 ? 'nenhum livre no período' : `${livre} livre${livre > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <Contador
                  valor={qtd}
                  onChange={(v) => setQtds((q) => ({ ...q, [i.id]: v }))}
                  min={0}
                  max={Math.max(livre, qtd)}
                  rotulo={i.nome}
                />
              </View>
            );
          })}
        </Cartao>

        {/* Valores */}
        <Titulo>4. Valores</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <View style={styles.linha}>
            <Campo rotulo="Desconto" valor={desconto} onChange={setDesconto} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
            <Campo rotulo="Frete / entrega" valor={entrega} onChange={setEntrega} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
          </View>
          <Campo
            rotulo="Caução (fica com você até a devolução)"
            valor={caucaoTexto ?? valorParaCampo(caucaoSugerida)}
            onChange={setCaucaoTexto}
            placeholder="0,00"
            teclado="decimal-pad"
            prefixo="R$"
          />
          <View style={{ gap: 2 }}>
            <Linha rotulo={`Diárias (${formatarPreco(diaria)} × ${dias})`} valor={formatarPreco(diaria * dias)} />
            {valorDesconto > 0 && <Linha rotulo="Desconto" valor={`− ${formatarPreco(valorDesconto)}`} />}
            {valorEntrega > 0 && <Linha rotulo="Frete" valor={formatarPreco(valorEntrega)} />}
            <View style={styles.divisor} />
            <Linha rotulo="Total da locação" valor={formatarPreco(total)} destaque />
          </View>
        </Cartao>

        {/* Pagamento */}
        <Titulo>5. Pagamento agora</Titulo>
        <Cartao style={{ gap: Espaco.md }}>
          <View style={styles.chips}>
            <Chip rotulo="Pagou tudo" ativo={pagar === 'tudo'} onPress={() => setPagar('tudo')} />
            <Chip rotulo="Pagou uma parte" ativo={pagar === 'parte'} onPress={() => setPagar('parte')} />
            <Chip rotulo="Paga na devolução" ativo={pagar === 'depois'} onPress={() => setPagar('depois')} />
          </View>
          {pagar === 'parte' && (
            <Campo rotulo="Valor recebido" valor={valorParte} onChange={setValorParte} placeholder="0,00" teclado="decimal-pad" prefixo="R$" />
          )}
          {pagar !== 'depois' && (
            <View style={styles.chips}>
              {FORMAS_PAGAMENTO.map((f) => (
                <Chip key={f} rotulo={f} ativo={forma === f} onPress={() => setForma(f)} />
              ))}
            </View>
          )}
          <Campo rotulo="Observações (opcional)" valor={obs} onChange={setObs} placeholder="Ex.: entregar às 8h" multilinha />
        </Cartao>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: Espaco.md + insets.bottom }]}>
        <Text style={styles.sub}>
          {pendencias.length
            ? `Falta: ${pendencias.join(', ')}.`
            : `${formatarPreco(total)} · recebido agora ${formatarPreco(valorPago)}`}
        </Text>
        <Botao titulo="Registrar locação" onPress={registrar} desativado={pendencias.length > 0} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: Espaco.lg, gap: Espaco.md, width: '100%', maxWidth: LarguraMaxima, alignSelf: 'center', paddingBottom: 32 },
  escolhido: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, borderColor: Cores.primaria },
  opcao: {
    backgroundColor: Cores.cartao,
    borderRadius: Raio.md,
    borderWidth: 1,
    borderColor: Cores.borda,
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.md,
    gap: 2,
  },
  nome: { fontSize: 16, fontWeight: '700', color: Cores.texto },
  sub: { fontSize: 13, color: Cores.textoSecundario },
  rotulo: { fontSize: 15, fontWeight: '600', color: Cores.texto },
  linhaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Espaco.md },
  linha: { flexDirection: 'row', gap: Espaco.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  linhaItem: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda, paddingTop: Espaco.md },
  divisor: { height: 1, backgroundColor: Cores.borda, marginVertical: Espaco.sm },
  rodape: {
    backgroundColor: Cores.cartao,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingHorizontal: Espaco.lg,
    paddingTop: Espaco.md,
    gap: Espaco.sm,
  },
});
