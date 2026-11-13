import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { EncabezadoPantalla } from '../components/ui/EncabezadoPantalla';
import { ROUTES } from '../constants/routes';
import { SECCIONES_TERMINOS, TipoTerminos, VERSION_TERMINOS } from '../constants/terminos';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { aceptarTerminos } from '../services/terminosService';

/**
 * Términos y condiciones. Con ?aceptar=comprador|vendedor muestra la casilla y el botón
 * para aceptarlos (se guarda la versión aceptada); sin parámetro es sólo lectura.
 */
export default function TerminosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aceptar } = useLocalSearchParams<{ aceptar?: string }>();
  const tipo: TipoTerminos | null = aceptar === 'comprador' || aceptar === 'vendedor' ? aceptar : null;
  const [marcado, setMarcado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const onAceptar = async () => {
    if (!tipo || !marcado || guardando) {
      return;
    }
    try {
      setGuardando(true);
      await aceptarTerminos(tipo);
      Toast.show({ type: 'success', text1: 'Términos aceptados' });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(ROUTES.home);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'No se pudieron guardar',
        text2: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <EncabezadoPantalla titulo="Términos y condiciones" />
      <ScrollView contentContainerStyle={styles.contenido} testID="terminos-scroll">
        <Text style={styles.version}>{`Versión del ${VERSION_TERMINOS.split('-').reverse().join('/')}`}</Text>
        {tipo === 'vendedor' ? (
          <Text style={styles.aviso}>
            Para publicar prendas tenés que aceptar estos términos. Prestá atención a los puntos marcados: el
            envío, los reclamos y los cargos son responsabilidad del vendedor.
          </Text>
        ) : null}
        {SECCIONES_TERMINOS.map((seccion) => (
          <View
            key={seccion.titulo}
            style={[styles.seccion, tipo === 'vendedor' && seccion.vendedor && styles.seccionResaltada]}
          >
            <Text style={styles.titulo}>{seccion.titulo}</Text>
            <Text style={styles.texto}>{seccion.texto}</Text>
          </View>
        ))}
      </ScrollView>

      {tipo ? (
        <View style={[styles.pie, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {/* Mismo ancho que el texto: en la web de escritorio queda centrado debajo. */}
          <View style={styles.pieContenido}>
          <Pressable
            testID="terminos-casilla"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado }}
            onPress={() => setMarcado((valor) => !valor)}
            style={styles.casillaFila}
          >
            <View style={[styles.casilla, marcado && styles.casillaMarcada]}>
              {marcado ? <Text style={styles.tilde}>✓</Text> : null}
            </View>
            <Text style={styles.casillaTexto}>
              {tipo === 'vendedor'
                ? 'Leí y acepto los términos y condiciones para vender en New You'
                : 'Leí y acepto los términos y condiciones de New You'}
            </Text>
          </Pressable>
          <Pressable
            testID="terminos-aceptar"
            accessibilityRole="button"
            accessibilityState={{ disabled: !marcado || guardando }}
            disabled={!marcado || guardando}
            onPress={() => void onAceptar()}
            style={[styles.boton, (!marcado || guardando) && styles.botonDeshabilitado]}
          >
            {guardando ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.botonTexto}>ACEPTAR</Text>
            )}
          </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  contenido: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  version: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  aviso: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: 'Montserrat_500Medium',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  seccion: { marginBottom: Spacing.md },
  seccionResaltada: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    paddingLeft: Spacing.sm,
  },
  titulo: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: Spacing.xs,
  },
  texto: { color: Colors.text, fontSize: FontSize.md, fontFamily: 'Montserrat_400Regular', lineHeight: 21 },
  pie: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  pieContenido: { width: '100%', maxWidth: 800 - 2 * Spacing.md, alignSelf: 'center' },
  casillaFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  casilla: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: { backgroundColor: Colors.secondary },
  tilde: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  casillaTexto: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  boton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: Colors.background, fontSize: FontSize.md, fontFamily: 'Montserrat_700Bold' },
});
