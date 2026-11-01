import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '../constants/theme';

interface MapaPinProps {
  latitud: number;
  longitud: number;
  onMover: (latitud: number, longitud: number) => void;
}

// En el navegador no hay WebView: el mismo mapa con Leaflet va en un iframe y avisa con postMessage.
function htmlMapa(latitud: number, longitud: number) {
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#mapa{margin:0;height:100%;}</style></head><body><div id="mapa"></div>
<script>
  var mapa = L.map('mapa').setView([${latitud}, ${longitud}], 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
  var pin = L.marker([${latitud}, ${longitud}], { draggable: true }).addTo(mapa);
  function avisar(p) { parent.postMessage({ tipo: 'newyou-pin', lat: p.lat, lng: p.lng }, '*'); }
  pin.on('dragend', function () { avisar(pin.getLatLng()); });
  mapa.on('click', function (e) { pin.setLatLng(e.latlng); avisar(e.latlng); });
</script></body></html>`;
}

export function MapaPin({ latitud, longitud, onMover }: MapaPinProps) {
  const html = useMemo(() => htmlMapa(latitud, longitud), [latitud, longitud]);
  const iframe = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const escuchar = (evento: MessageEvent) => {
      const data = evento.data as { tipo?: string; lat?: number; lng?: number };
      if (evento.source === iframe.current?.contentWindow && data?.tipo === 'newyou-pin') {
        onMover(Number(data.lat), Number(data.lng));
      }
    };
    window.addEventListener('message', escuchar);
    return () => window.removeEventListener('message', escuchar);
  }, [onMover]);

  return (
    <View style={styles.contenedor} testID="mapa-pin">
      <iframe ref={iframe} title="Mapa para marcar tu ubicación" srcDoc={html} style={{ border: 0, width: '100%', height: '100%' }} />
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
});
