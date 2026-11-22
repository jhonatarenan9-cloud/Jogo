import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Cores } from '@/constants/theme';
import { etapaDaLocacao, useLocacoes } from '@/store/locacoes';

function Icone({ emoji, focado }: { emoji: string; focado: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focado ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { locacoes } = useLocacoes();
  const abertas = locacoes.filter((l) => {
    const e = etapaDaLocacao(l);
    return e === 'agendada' || e === 'em andamento' || e === 'atrasada';
  }).length;

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
          title: 'Catálogo',
          headerTitle: 'Aluga Ferramentas',
          tabBarIcon: ({ focused }) => <Icone emoji="🧰" focado={focused} />,
        }}
      />
      <Tabs.Screen
        name="locacoes"
        options={{
          title: 'Locações',
          headerTitle: 'Minhas locações',
          tabBarBadge: abertas > 0 ? abertas : undefined,
          tabBarBadgeStyle: { backgroundColor: Cores.primaria },
          tabBarIcon: ({ focused }) => <Icone emoji="📋" focado={focused} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          headerTitle: 'Minha conta',
          tabBarIcon: ({ focused }) => <Icone emoji="👤" focado={focused} />,
        }}
      />
    </Tabs>
  );
}
