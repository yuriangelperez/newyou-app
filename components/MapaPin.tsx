import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors, Radius } from '../constants/theme';

interface MapaPinProps {
  latitud: number;
  longitud: number;
  /** Se llama cuando el usuario arrastra el pin o toca otro punto del mapa. */
  onMover: (latitud: number, longitud: number) => void;
}

// Los mosaicos de OpenStreetMap piden saber desde qué sitio se usan (Referer):
// la página del mapa se carga "desde" la web de la app.
const BASE_URL = 'https://yuriangelperez.github.io/newyou-app/';

/** Página con Leaflet + OpenStreetMap y un pin que se puede mover. */
function htmlMapa(latitud: number, longitud: number) {
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#mapa{margin:0;height:100%;}</style>
</head><body><div id="mapa"></div>
<script>
  var mapa = L.map('mapa', { zoomControl: true }).setView([${latitud}, ${longitud}], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);
  var pin = L.marker([${latitud}, ${longitud}], { draggable: true }).addTo(mapa);
  function avisar(p) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: p.lat, lng: p.lng }));
  }
  pin.on('dragend', function () { avisar(pin.getLatLng()); });
  mapa.on('click', function (e) { pin.setLatLng(e.latlng); avisar(e.latlng); });
</script></body></html>`;
}

/**
 * Mapa donde el usuario marca su ubicación con un pin (arrastrándolo o tocando
 * el mapa). Sirve cuando la dirección escrita no aparece exacta en OpenStreetMap.
 */
export function MapaPin({ latitud, longitud, onMover }: MapaPinProps) {
  const [fallo, setFallo] = useState(false);
  // Sólo se arma la página con el punto inicial: después el pin lo mueve el usuario.
  const html = useMemo(() => htmlMapa(latitud, longitud), [latitud, longitud]);

  if (fallo) {
    return (
      <View style={[styles.contenedor, styles.aviso]} testID="mapa-pin-error">
        <Text style={styles.avisoTexto}>No se pudo cargar el mapa. Revisá tu conexión.</Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor} testID="mapa-pin" accessible accessibilityLabel="Mapa para marcar tu ubicación">
      <WebView
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.cargando}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        )}
        // El mapa se mueve con el dedo; la pantalla no tiene que desplazarse a la vez.
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        onError={() => setFallo(true)}
        onMessage={(evento) => {
          try {
            const { lat, lng } = JSON.parse(evento.nativeEvent.data) as { lat: number; lng: number };
            onMover(lat, lng);
          } catch {
            // Mensaje que no es del pin: se ignora.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 240,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cargando: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  aviso: { alignItems: 'center', justifyContent: 'center', padding: 12 },
  avisoTexto: { color: Colors.textMuted, textAlign: 'center' },
});
