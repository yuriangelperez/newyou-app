import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '../constants/theme';
import { MP_MODO_DEMO } from '../services/pagosService';

/** Link de descarga del APK demo (variable URL_APK_DEMO del repo, la pone deploy-web.yml). */
const URL_APK = process.env.EXPO_PUBLIC_URL_APK ?? '';

/**
 * Franja de la web demo (rama demo, /newyou-app/demo/): avisa que es la versión de la
 * presentación y ofrece bajar el APK. No aparece en la app nativa ni en main/testing.
 */
export function BannerDemo() {
  const [cerrado, setCerrado] = useState(false);

  if (Platform.OS !== 'web' || !MP_MODO_DEMO || cerrado) {
    return null;
  }

  return (
    <View style={styles.franja} testID="banner-demo">
      <Text style={styles.texto} numberOfLines={2}>
        Versión demo de New You: los pagos son simulados.
      </Text>
      {URL_APK ? (
        <Pressable
          testID="banner-demo-apk"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(URL_APK)}
          style={styles.boton}
        >
          <Text style={styles.botonTexto}>Descargar APK</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso de la demo"
        onPress={() => setCerrado(true)}
        hitSlop={8}
      >
        <Text style={styles.cerrar}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  franja: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    // Fijo (no cambia con el modo oscuro) para que el texto blanco siempre se lea.
    backgroundColor: '#2D1F16',
  },
  texto: { flex: 1, color: Colors.white, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  boton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  botonTexto: { color: Colors.white, fontSize: 13, fontFamily: 'Montserrat_700Bold' },
  cerrar: { color: Colors.white, fontSize: 16, paddingHorizontal: 4 },
});
