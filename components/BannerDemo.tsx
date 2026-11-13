import { Ionicons } from '@expo/vector-icons';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { MP_MODO_DEMO } from '../constants/demo';

/**
 * Link de descarga del APK demo. Por defecto, el archivo newyou-demo.apk del último Release
 * de GitHub (link fijo: subir un APK nuevo no cambia el QR ni este botón). Se puede
 * reemplazar con la variable URL_APK_DEMO del repo (la pone deploy-web.yml).
 */
export const URL_APK =
  process.env.EXPO_PUBLIC_URL_APK ||
  'https://github.com/yuriangelperez/newyou-app/releases/latest/download/newyou-demo.apk';

/** La placa "Descargá la app" va primera en el carrusel del inicio, sólo en la web demo. */
export const MOSTRAR_PLACA_APP = Platform.OS === 'web' && MP_MODO_DEMO;

const ICONO_APP = require('../assets/app-icons/icon.png');

// Colores fijos de la placa (no cambian con el modo oscuro): marrón del logo y tonos tierra.
const FONDO = '#2D1F16';
const ACENTO = '#AB876D';
const TEXTO_SUAVE = '#D5BFB3';

interface PlacaDescargarAppProps {
  ancho: number;
  alto: number;
  escritorio: boolean;
}

/**
 * Placa del hero de la web demo (presentación): invita a bajar la app de Android.
 * En el celular (150 px de alto) muestra sólo el título y el botón.
 */
export function PlacaDescargarApp({ ancho, alto, escritorio }: PlacaDescargarAppProps) {
  return (
    <View style={[styles.placa, { width: ancho, height: alto }]} testID="placa-descargar-app">
      <View style={[styles.textos, escritorio ? styles.textosEscritorio : styles.textosCelular]}>
        <Text style={[styles.etiqueta, !escritorio && styles.etiquetaCelular]}>NUEVO · APP PARA ANDROID</Text>
        <Text style={[styles.titulo, escritorio ? styles.tituloEscritorio : styles.tituloCelular]}>
          Llevá New You en tu celular
        </Text>
        {escritorio ? (
          <Text style={styles.bajada}>
            Comprá, vendé y seguí tus pedidos desde cualquier lugar. Versión demo: los pagos son simulados.
          </Text>
        ) : null}
        <Pressable
          testID="placa-descargar-apk"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(URL_APK)}
          style={({ pressed }) => [styles.boton, !escritorio && styles.botonCelular, pressed && styles.botonHover]}
        >
          <Ionicons name="logo-android" size={escritorio ? 18 : 15} color={FONDO} />
          <Text style={[styles.botonTexto, !escritorio && styles.botonTextoCelular]}>Descargar APK</Text>
        </Pressable>
      </View>
      <Image
        source={ICONO_APP}
        style={[styles.icono, escritorio ? { width: alto * 0.62, height: alto * 0.62 } : { width: alto * 0.56, height: alto * 0.56 }]}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

/** Web demo: la franja de arriba avisa que es la versión de prueba de la presentación. */
export const MOSTRAR_AVISO_DEMO = Platform.OS === 'web' && MP_MODO_DEMO;

/**
 * Franja fina "Versión demo" arriba de todo en la web demo, en todas las pantallas.
 * La descarga de la APK va aparte, como primera placa del carrusel del inicio.
 */
export function AvisoVersionDemo() {
  const { width } = useWindowDimensions();
  if (!MOSTRAR_AVISO_DEMO) return null;
  const angosta = width < 600;
  return (
    <View style={styles.aviso} testID="aviso-version-demo" accessibilityRole="text">
      <View style={styles.avisoChip}>
        <Text style={styles.avisoChipTexto}>VERSIÓN DEMO</Text>
      </View>
      <Text style={styles.avisoTexto} numberOfLines={1}>
        {angosta ? 'Los pagos son simulados.' : 'Estás probando New You: los pagos son simulados y no se cobra dinero real.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    backgroundColor: FONDO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  avisoChip: { backgroundColor: ACENTO, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  avisoChipTexto: { color: '#FFFFFF', fontSize: 10, letterSpacing: 1, fontFamily: 'Montserrat_700Bold' },
  avisoTexto: { color: TEXTO_SUAVE, fontSize: 12, flexShrink: 1, fontFamily: 'Montserrat_500Medium' },
  placa: {
    backgroundColor: FONDO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  textos: { flex: 1, justifyContent: 'center' },
  textosEscritorio: { paddingLeft: 72, paddingRight: 24, rowGap: 12 },
  textosCelular: { paddingLeft: 20, paddingRight: 8, rowGap: 6 },
  etiqueta: { color: ACENTO, fontSize: 12, letterSpacing: 1.5, fontFamily: 'Montserrat_700Bold' },
  etiquetaCelular: { fontSize: 10, letterSpacing: 1 },
  titulo: { color: '#FFFFFF', fontFamily: 'Montserrat_700Bold' },
  tituloEscritorio: { fontSize: 34, lineHeight: 40 },
  tituloCelular: { fontSize: 18, lineHeight: 22 },
  bajada: { color: TEXTO_SUAVE, fontSize: 15, lineHeight: 22, maxWidth: 460, fontFamily: 'Montserrat_400Regular' },
  boton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 4,
  },
  botonCelular: { paddingHorizontal: 14, paddingVertical: 7, columnGap: 6, marginTop: 2 },
  botonHover: { backgroundColor: TEXTO_SUAVE },
  botonTexto: { color: FONDO, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  botonTextoCelular: { fontSize: 13 },
  icono: { marginRight: '6%', borderRadius: 24 },
});
