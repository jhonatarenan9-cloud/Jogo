import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { escolherFotos, OrigemFoto } from '@/lib/fotos';
import { useUrlDaFoto } from '@/lib/fotos-nuvem';

/** Miniatura de uma foto, com um marcador quando não há imagem. */
export function Miniatura({ foto, tamanho = 56, vazio = '📷' }: { foto?: string; tamanho?: number; vazio?: string }) {
  const url = useUrlDaFoto(foto);
  return (
    <View style={[styles.miniatura, { width: tamanho, height: tamanho }]}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: tamanho, height: tamanho }} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: tamanho * 0.42 }}>{vazio}</Text>
      )}
    </View>
  );
}

function useEscolher(aoEscolher: (fotos: string[]) => void, varias: boolean) {
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function escolher(origem: OrigemFoto) {
    setErro('');
    setOcupado(true);
    try {
      const fotos = await escolherFotos(origem, varias);
      if (fotos.length) aoEscolher(fotos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir as fotos.');
    } finally {
      setOcupado(false);
    }
  }
  return { erro, ocupado, escolher };
}

/** Uma foto só (ex.: foto do produto), com trocar e remover. */
export function SeletorFoto({ foto, onChange, rotulo }: { foto?: string; onChange: (f?: string) => void; rotulo: string }) {
  const { erro, ocupado, escolher } = useEscolher((f) => onChange(f[0]), false);
  return (
    <View style={{ gap: Espaco.sm }}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.seletor}>
        <Miniatura foto={foto} tamanho={96} />
        <View style={{ flex: 1, gap: Espaco.sm }}>
          <Botao titulo="Tirar foto" variante="secundario" onPress={() => escolher('camera')} desativado={ocupado} />
          <Botao titulo={foto ? 'Trocar pela galeria' : 'Escolher da galeria'} variante="secundario" onPress={() => escolher('galeria')} desativado={ocupado} />
          {foto ? <Botao titulo="Remover foto" variante="perigo" onPress={() => onChange(undefined)} /> : null}
        </View>
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

/** Várias fotos (vistoria, documentos), com ampliar e remover. */
export function GaleriaFotos({
  fotos,
  onAdicionar,
  onRemover,
  titulo,
  dica,
  somenteLeitura,
}: {
  fotos: string[];
  onAdicionar?: (novas: string[]) => void;
  onRemover?: (foto: string) => void;
  titulo: string;
  dica?: string;
  somenteLeitura?: boolean;
}) {
  const { erro, ocupado, escolher } = useEscolher((f) => onAdicionar?.(f), true);
  const [aberta, setAberta] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ gap: Espaco.sm }}>
      <Text style={styles.rotulo}>
        {titulo} {fotos.length ? `(${fotos.length})` : ''}
      </Text>
      {dica ? <Text style={styles.dica}>{dica}</Text> : null}
      {fotos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
          {fotos.map((f, i) => (
            <Pressable key={f.slice(-40) + i} accessibilityRole="imagebutton" accessibilityLabel={`Ver foto ${i + 1}`} onPress={() => setAberta(f)}>
              <Miniatura foto={f} tamanho={76} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!somenteLeitura && (
        <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
          <Botao titulo="📷 Tirar foto" variante="secundario" onPress={() => escolher('camera')} desativado={ocupado} style={{ flex: 1 }} />
          <Botao titulo="🖼️ Galeria" variante="secundario" onPress={() => escolher('galeria')} desativado={ocupado} style={{ flex: 1 }} />
        </View>
      )}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <Modal visible={!!aberta} transparent animationType="fade" onRequestClose={() => setAberta(null)}>
        <View style={[styles.visor, { paddingTop: insets.top + Espaco.lg, paddingBottom: insets.bottom + Espaco.lg }]}>
          {aberta ? <FotoGrande foto={aberta} /> : null}
          <View style={styles.acoesVisor}>
            {!somenteLeitura && onRemover && (
              <Botao
                titulo="Remover"
                variante="perigo"
                onPress={() => {
                  if (aberta) onRemover(aberta);
                  setAberta(null);
                }}
                style={{ flex: 1 }}
              />
            )}
            <Botao titulo="Fechar" variante="secundario" onPress={() => setAberta(null)} style={{ flex: 1 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FotoGrande({ foto }: { foto: string }) {
  const url = useUrlDaFoto(foto);
  return url ? <Image source={{ uri: url }} style={styles.grande} contentFit="contain" /> : null;
}

const styles = StyleSheet.create({
  miniatura: {
    borderRadius: Raio.md,
    overflow: 'hidden',
    backgroundColor: Cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  dica: { fontSize: 13, color: Cores.textoSecundario },
  erro: { fontSize: 13, color: Cores.perigo },
  seletor: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  visor: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', paddingHorizontal: Espaco.lg, gap: Espaco.lg },
  grande: { flex: 1, width: '100%' },
  acoesVisor: { flexDirection: 'row', gap: Espaco.sm },
});
