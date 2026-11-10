import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROUTES } from '../constants/routes';
import { Colors } from '../constants/theme';
import { useAvisosSinLeer } from '../hooks/useAvisosSinLeer';

/** Campanita con la cantidad de notificaciones sin leer; abre el panel de notificaciones. */
export function CampanaAvisos({ color = Colors.textStrong }: { color?: string }) {
  const router = useRouter();
  const sinLeer = useAvisosSinLeer();
  return (
    <Pressable
      testID="campana-avisos"
      accessibilityRole="button"
      accessibilityLabel={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
      hitSlop={10}
      onPress={() => router.push(ROUTES.notifications)}
    >
      <Ionicons name={sinLeer > 0 ? 'notifications' : 'notifications-outline'} size={26} color={color} />
      {sinLeer > 0 ? (
        <View style={styles.globo} testID="campana-avisos-cantidad">
          <Text style={styles.cantidad}>{sinLeer > 99 ? '99+' : sinLeer}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  globo: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});
