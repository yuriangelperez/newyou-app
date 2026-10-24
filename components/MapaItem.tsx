import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Colors, Radius } from '../constants/theme';

interface MapaItemProps {
  latitud: number;
  longitud: number;
  titulo?: string;
}

/**
 * Mapa fijo con un marcador (Clase 7, 7.5). Sin scroll para no pelear con el
 * scroll de la pantalla; en Android usa Google Maps.
 */
export function MapaItem({ latitud, longitud, titulo }: MapaItemProps) {
  return (
    <View style={styles.contenedor} testID="mapa-item">
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        zoomEnabled={false}
        initialRegion={{
          latitude: latitud,
          longitude: longitud,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        <Marker coordinate={{ latitude: latitud, longitude: longitud }} title={titulo} />
      </MapView>
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
});
