import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Cores } from '@/constants/theme';
import { LocacoesProvider } from '@/store/locacoes';

export default function RootLayout() {
  return (
    <LocacoesProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: Cores.primaria,
          headerTitleStyle: { color: Cores.texto, fontWeight: '700' },
          headerStyle: { backgroundColor: Cores.cartao },
          contentStyle: { backgroundColor: Cores.fundo },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ferramenta/[id]" options={{ title: 'Detalhes', headerBackTitle: 'Voltar' }} />
      </Stack>
    </LocacoesProvider>
  );
}
