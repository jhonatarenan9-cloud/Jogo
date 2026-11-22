import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Botao, Cartao } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useLocacoes } from '@/store/locacoes';

function mascararTelefone(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Formulário com nome, celular e endereço. Só deve ser montado depois que os
 * dados salvos carregarem (`carregado`), porque começa preenchido com eles.
 */
export function FormularioPerfil({ exigirEndereco = false, dica }: { exigirEndereco?: boolean; dica?: string }) {
  const { perfil, salvarPerfil } = useLocacoes();
  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(perfil.telefone);
  const [endereco, setEndereco] = useState(perfil.endereco);
  const [salvo, setSalvo] = useState(false);

  const valido =
    nome.trim().length >= 2 &&
    telefone.replace(/\D/g, '').length >= 10 &&
    (!exigirEndereco || endereco.trim().length >= 5);

  function mudou<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setSalvo(false);
    };
  }

  return (
    <Cartao style={{ gap: Espaco.md }}>
      <Text style={styles.titulo}>Seus dados</Text>
      <Text style={styles.dica}>{dica ?? 'Usamos para confirmar a locação e combinar a entrega.'}</Text>
      <Campo rotulo="Nome completo" valor={nome} onChange={mudou(setNome)} placeholder="Maria Souza" />
      <Campo
        rotulo="Celular (WhatsApp)"
        valor={telefone}
        onChange={mudou((v: string) => setTelefone(mascararTelefone(v)))}
        placeholder="(11) 91234-5678"
        teclado="phone-pad"
      />
      <Campo
        rotulo={exigirEndereco ? 'Endereço para entrega' : 'Endereço para entrega (opcional)'}
        valor={endereco}
        onChange={mudou(setEndereco)}
        placeholder="Rua, número, bairro"
      />
      <Botao
        titulo={salvo ? 'Dados salvos ✓' : 'Salvar dados'}
        onPress={() => {
          salvarPerfil({ nome: nome.trim(), telefone, endereco: endereco.trim() });
          setSalvo(true);
        }}
        desativado={!valido}
      />
    </Cartao>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  teclado,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  teclado?: 'phone-pad';
}) {
  return (
    <View style={{ gap: Espaco.xs }}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Cores.textoSecundario}
        keyboardType={teclado}
        style={styles.input}
        accessibilityLabel={rotulo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: '800', color: Cores.texto },
  dica: { fontSize: 13, color: Cores.textoSecundario },
  rotulo: { fontSize: 14, fontWeight: '600', color: Cores.texto },
  input: {
    backgroundColor: Cores.fundo,
    borderWidth: 1,
    borderColor: Cores.borda,
    borderRadius: Raio.md,
    paddingHorizontal: Espaco.md,
    minHeight: 48,
    fontSize: 16,
    color: Cores.texto,
  },
});
