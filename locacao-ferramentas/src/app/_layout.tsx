import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Cores } from '@/constants/theme';
import { useRotinas } from '@/lib/rotinas';
import { DadosProvider } from '@/store/dados';
import { NuvemProvider } from '@/store/nuvem';

function Rotinas() {
  useRotinas();
  return null;
}

export default function RootLayout() {
  return (
    <DadosProvider>
      <NuvemProvider>
      <Rotinas />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: Cores.primaria,
          headerTitleStyle: { color: Cores.texto, fontWeight: '700' },
          headerStyle: { backgroundColor: Cores.cartao },
          headerBackTitle: 'Voltar',
          contentStyle: { backgroundColor: Cores.fundo },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="locacao/nova" options={{ title: 'Nova locação' }} />
        <Stack.Screen name="locacao/[id]" options={{ title: 'Locação' }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
        <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
        <Stack.Screen name="plano" options={{ title: 'Plano Pro', presentation: 'modal' }} />
        <Stack.Screen name="relatorios" options={{ title: 'Relatórios' }} />
        <Stack.Screen name="locacao/documento" options={{ title: 'Documento' }} />
        <Stack.Screen name="lancamento/[id]" options={{ title: 'Lançamento' }} />
        <Stack.Screen name="mais" options={{ title: 'Configurações' }} />
        <Stack.Screen name="integracoes" options={{ title: 'Integrações' }} />
        <Stack.Screen name="entrar" options={{ title: 'Entrar na conta' }} />
      </Stack>
      </NuvemProvider>
    </DadosProvider>
  );
}
