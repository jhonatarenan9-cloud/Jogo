import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BotaoPasso } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { estaAberta, previsaoDevolucao, unidadesLivres } from '@/lib/calculos';
import { deISO, formatarData, nomeDoMes, paraISO, somarDias } from '@/lib/format';
import type { Cliente, Item, Locacao } from '@/store/tipos';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Calendário do mês com quantas unidades do item estão livres em cada dia. */
export function CalendarioDisponibilidade({
  item,
  locacoes,
  clientes,
  hoje,
}: {
  item: Item;
  locacoes: Locacao[];
  clientes: Cliente[];
  hoje: string;
}) {
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [dia, setDia] = useState<string | null>(null);

  const dias = useMemo(() => {
    const primeiro = deISO(`${mes}-01`);
    const inicioGrade = somarDias(`${mes}-01`, -primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const iso = somarDias(inicioGrade, i);
      return { iso, doMes: iso.slice(0, 7) === mes, livres: unidadesLivres(item, iso, somarDias(iso, 1), locacoes, hoje) };
    });
  }, [mes, item, locacoes, hoje]);

  const semanas = [0, 1, 2, 3, 4, 5].map((s) => dias.slice(s * 7, s * 7 + 7)).filter((s) => s.some((d) => d.doMes));

  const doDia = useMemo(() => {
    if (!dia) return [];
    return locacoes.filter((l) => {
      if (!estaAberta(l) || !l.itens.some((i) => i.itemId === item.id)) return false;
      const fim = previsaoDevolucao(l);
      const ate = fim > hoje ? fim : somarDias(hoje, 1);
      return l.inicio <= dia && dia < ate;
    });
  }, [dia, locacoes, item.id, hoje]);

  function mudarMes(delta: number) {
    const d = deISO(`${mes}-01`);
    d.setMonth(d.getMonth() + delta);
    setMes(paraISO(d).slice(0, 7));
    setDia(null);
  }

  return (
    <View style={{ gap: Espaco.sm }}>
      <View style={styles.topo}>
        <BotaoPasso sinal="−" rotulo="Mês anterior" onPress={() => mudarMes(-1)} />
        <Text style={styles.mes}>{nomeDoMes(mes)}</Text>
        <BotaoPasso sinal="+" rotulo="Próximo mês" onPress={() => mudarMes(1)} />
      </View>
      <View style={styles.semana}>
        {SEMANA.map((s, i) => (
          <Text key={i} style={styles.diaSemana}>
            {s}
          </Text>
        ))}
      </View>
      {semanas.map((s, i) => (
        <View key={i} style={styles.semana}>
          {s.map((d) => {
            const cheio = d.livres === 0;
            const parcial = !cheio && d.livres < item.quantidade;
            const passado = d.iso < hoje;
            return (
              <Pressable
                key={d.iso}
                accessibilityRole="button"
                accessibilityLabel={`${formatarData(d.iso)}: ${d.livres} de ${item.quantidade} livres`}
                onPress={() => setDia(d.iso === dia ? null : d.iso)}
                style={[
                  styles.dia,
                  !d.doMes && { opacity: 0.3 },
                  passado && { opacity: d.doMes ? 0.5 : 0.25 },
                  cheio && { backgroundColor: Cores.perigoClaro },
                  parcial && { backgroundColor: Cores.avisoClaro },
                  !cheio && !parcial && { backgroundColor: Cores.sucessoClaro },
                  d.iso === hoje && styles.hoje,
                  d.iso === dia && styles.selecionado,
                ]}>
                <Text style={styles.numero}>{deISO(d.iso).getDate()}</Text>
                <Text style={[styles.livres, cheio && { color: Cores.perigo }]}>{d.livres}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={styles.legenda}>Número pequeno = unidades livres no dia. Verde: todas · amarelo: parte · vermelho: nenhuma.</Text>
      {dia && (
        <View style={{ gap: 4 }}>
          <Text style={styles.rotulo}>{formatarData(dia)}</Text>
          {doDia.length === 0 ? (
            <Text style={styles.legenda}>Nenhuma locação neste dia.</Text>
          ) : (
            doDia.map((l) => (
              <Pressable key={l.id} accessibilityRole="link" onPress={() => router.push({ pathname: '/locacao/[id]', params: { id: l.id } })}>
                <Text style={styles.link}>
                  Nº {l.numero} · {clientes.find((c) => c.id === l.clienteId)?.nome ?? 'Cliente'} ·{' '}
                  {l.itens.find((i) => i.itemId === item.id)?.qtd ?? 1} un. até {formatarData(previsaoDevolucao(l))}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { fontSize: 16, fontWeight: '800', color: Cores.texto },
  semana: { flexDirection: 'row', gap: 4 },
  diaSemana: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: Cores.textoSecundario },
  dia: { flex: 1, aspectRatio: 1, borderRadius: Raio.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  hoje: { borderColor: Cores.texto },
  selecionado: { borderColor: Cores.primaria },
  numero: { fontSize: 13, fontWeight: '700', color: Cores.texto },
  livres: { fontSize: 10, color: Cores.textoSecundario, fontVariant: ['tabular-nums'] },
  legenda: { fontSize: 12, color: Cores.textoSecundario, lineHeight: 16 },
  rotulo: { fontSize: 14, fontWeight: '700', color: Cores.texto },
  link: { fontSize: 14, color: Cores.primariaEscura, textDecorationLine: 'underline', lineHeight: 20 },
});
