import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/** Mostra um documento HTML (contrato, recibo) dentro do app. */
export function VisualizadorHtml({ html }: { html: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />
    </View>
  );
}
