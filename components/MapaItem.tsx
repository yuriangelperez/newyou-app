import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors, Radius } from '../constants/theme';
import { urlMapaOsm } from './mapaOsm';

interface MapaItemProps {
  latitud: number;
  longitud: number;
  titulo?: string;
}

const URL_EMBED = 'https://www.openstreetmap.org/export/embed.html';

/**
 * Mapa fijo con un marcador (Clase 7, 7.5), con OpenStreetMap dentro de un
 * WebView: funciona en Expo Go y en el .apk sin clave de Google Maps.
 */
export function MapaItem({ latitud, longitud, titulo }: MapaItemProps) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    // Sin conexión o el servidor de mapas no respondió: se avisa en vez de dejar un recuadro vacío.
    return (
      <View style={[styles.contenedor, styles.aviso]} testID="mapa-item-error">
        <Text style={styles.avisoTexto}>No se pudo cargar el mapa. Revisá tu conexión.</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.contenedor}
      testID="mapa-item"
      accessible
      accessibilityLabel={titulo ? `Mapa: ${titulo}` : 'Mapa'}
    >
      <WebView
        source={{ uri: urlMapaOsm(latitud, longitud) }}
        style={styles.mapa}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.cargando}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        )}
        onError={() => setFallo(true)}
        onHttpError={(evento) => {
          if (evento.nativeEvent.statusCode >= 400) setFallo(true);
        }}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        // Los enlaces del mapa ("Ver mapa más grande") no navegan dentro de la tarjeta.
        onShouldStartLoadWithRequest={(pedido) => pedido.url.startsWith(URL_EMBED)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 180,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapa: { flex: 1 },
  cargando: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  aviso: { alignItems: 'center', justifyContent: 'center', padding: 12 },
  avisoTexto: { color: Colors.textMuted, textAlign: 'center' },
});
