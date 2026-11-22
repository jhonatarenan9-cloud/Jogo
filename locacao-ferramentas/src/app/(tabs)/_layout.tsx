import { router, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { Cores } from '@/constants/theme';
import { etapaDaLocacao } from '@/lib/calculos';
import { useDados } from '@/store/dados';

function Icone({ emoji, focado }: { emoji: string; focado: boolean }) {
  return <Text style={{ fontSize: 21, opacity: focado ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { locacoes, loja, hoje } = useDados();
  const atrasadas = locacoes.filter((l) => etapaDaLocacao(l, hoje) === 'atrasada').length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Cores.primaria,
        tabBarInactiveTintColor: Cores.textoSecundario,
        tabBarStyle: { backgroundColor: Cores.cartao, borderTopColor: Cores.borda },
        headerStyle: { backgroundColor: Cores.cartao },
        headerTitleStyle: { color: Cores.texto, fontWeight: '800' },
        sceneStyle: { backgroundColor: Cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: loja.nome || 'Minha locadora',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              onPress={() => router.push('/mais')}
              hitSlop={10}
              style={{ paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </Pressable>
          ),
          tabBarIcon: ({ focused }) => <Icone emoji="🏠" focado={focused} />,
        }}
      />
      <Tabs.Screen
        name="locacoes"
        options={{
          title: 'Locações',
          tabBarBadge: atrasadas > 0 ? atrasadas : undefined,
          tabBarBadgeStyle: { backgroundColor: Cores.perigo },
          tabBarIcon: ({ focused }) => <Icone emoji="📋" focado={focused} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: ({ focused }) => <Icone emoji="👥" focado={focused} /> }}
      />
      <Tabs.Screen
        name="estoque"
        options={{ title: 'Estoque', tabBarIcon: ({ focused }) => <Icone emoji="🧰" focado={focused} /> }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{ title: 'Financeiro', tabBarIcon: ({ focused }) => <Icone emoji="💰" focado={focused} /> }}
      />
    </Tabs>
  );
}
