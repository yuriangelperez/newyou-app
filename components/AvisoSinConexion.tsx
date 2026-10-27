import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../constants/theme';

/** Aviso fijo arriba de todo mientras no hay Internet (HU16). */
export function AvisoSinConexion() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const insets = useSafeAreaInsets();
  // `null` = todavía no se sabe: no se muestra nada.
  const sinConexion = isConnected === false || isInternetReachable === false;

  if (!sinConexion) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      testID="aviso-sin-conexion"
      style={[styles.aviso, { paddingTop: insets.top + 4 }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.primary} />
      <Text style={styles.texto}>Sin conexión. Lo que guardes se sube al volver la red.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.warning,
  },
  texto: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
