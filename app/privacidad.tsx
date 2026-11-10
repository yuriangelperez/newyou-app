import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoPantalla } from '../components/ui/EncabezadoPantalla';
import { SECCIONES_PRIVACIDAD, VERSION_PRIVACIDAD } from '../constants/privacidad';
import { Colors, FontSize, Spacing } from '../constants/theme';

/** Política de privacidad (sólo lectura, desde Ajustes). */
export default function PrivacidadScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="Política de privacidad" />
      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + Spacing.xl }]}
        testID="privacidad-scroll"
      >
        <Text style={styles.version}>{`Versión del ${VERSION_PRIVACIDAD.split('-').reverse().join('/')}`}</Text>
        {SECCIONES_PRIVACIDAD.map((seccion) => (
          <View key={seccion.titulo} style={styles.seccion}>
            <Text style={styles.titulo}>{seccion.titulo}</Text>
            <Text style={styles.texto}>{seccion.texto}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  contenido: { width: '100%', maxWidth: 800, alignSelf: 'center', padding: Spacing.md },
  version: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  seccion: { marginBottom: Spacing.md },
  titulo: { color: Colors.text, fontSize: FontSize.lg, fontFamily: 'Montserrat_700Bold', marginBottom: Spacing.xs },
  texto: { color: Colors.text, fontSize: FontSize.md, fontFamily: 'Montserrat_400Regular', lineHeight: 21 },
});
