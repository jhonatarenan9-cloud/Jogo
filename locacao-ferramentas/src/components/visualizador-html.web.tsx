import { createElement } from 'react';
import { View } from 'react-native';

/** Na web, o documento aparece num iframe isolado (sem scripts). */
export function VisualizadorHtml({ html }: { html: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {createElement('iframe', {
        srcDoc: html,
        title: 'Documento',
        sandbox: 'allow-modals',
        style: { border: 0, width: '100%', height: '100%', flex: 1 },
      })}
    </View>
  );
}
