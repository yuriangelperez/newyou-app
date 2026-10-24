// react-native-maps no tiene versión web: en el navegador no se muestra el mapa
// embebido y queda el enlace "Ver en el mapa" de cada pantalla.
interface MapaItemProps {
  latitud: number;
  longitud: number;
  titulo?: string;
}

export function MapaItem(_props: MapaItemProps) {
  return null;
}
