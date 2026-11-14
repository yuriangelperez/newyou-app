import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRANDING_LOGO } from '../../constants/assets';
import { CuentaInvitado, CUENTAS_INVITADO, INVITADO_DISPONIBLE, TipoInvitado } from '../../constants/demo';
import { ROUTES } from '../../constants/routes';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { signInWithPassword } from '../../services/auth';

const ICONOS: Record<TipoInvitado, ComponentProps<typeof Ionicons>['name']> = {
  comprador: 'bag-handle-outline',
  particular: 'pricetag-outline',
  empresa: 'storefront-outline',
};

/**
 * Versión demo: pantalla para elegir con qué cuenta de prueba entrar (comprador, vendedor
 * particular o empresa). Se abre desde "Entrar como invitado" del login.
 */
export default function InvitadoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const esEscritorio = useEsEscritorio();
  const [entrando, setEntrando] = useState<TipoInvitado | null>(null);
  const [error, setError] = useState('');

  if (!INVITADO_DISPONIBLE) {
    return <Redirect href={ROUTES.login} />;
  }

  const entrar = async (cuenta: CuentaInvitado) => {
    setError('');
    setEntrando(cuenta.tipo);
    try {
      const { error: authError } = await signInWithPassword(cuenta.correo, cuenta.contrasena);
      if (authError) {
        setError('No se pudo entrar como invitado. Probá de nuevo o registrate.');
        return;
      }
      router.replace(ROUTES.home);
    } finally {
      setEntrando(null);
    }
  };

  const volver = () => (router.canGoBack() ? router.back() : router.replace(ROUTES.login));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contenido, esEscritorio && styles.contenidoEscritorio]}>
          <Pressable
            testID="invitado-volver"
            accessibilityRole="button"
            accessibilityLabel="Volver al login"
            onPress={volver}
            disabled={entrando !== null}
            style={styles.volver}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
            <Text style={styles.volverTexto}>Volver</Text>
          </Pressable>

          <Image source={BRANDING_LOGO} tintColor={Colors.textStrong} style={styles.logo} />

          <View style={styles.encabezado}>
            <Text style={styles.etiqueta}>VERSIÓN DEMO</Text>
            <Text style={styles.titulo}>¿Cómo querés probar New You?</Text>
            <Text style={styles.bajada}>
              Elegí una cuenta de prueba. No hace falta registrarse y los pagos son simulados.
            </Text>
          </View>

          <View style={styles.opciones}>
            {CUENTAS_INVITADO.map((cuenta) => {
              const cargando = entrando === cuenta.tipo;
              return (
                <Pressable
                  key={cuenta.tipo}
                  testID={`invitado-${cuenta.tipo}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Entrar como ${cuenta.etiqueta}`}
                  onPress={() => void entrar(cuenta)}
                  disabled={entrando !== null}
                  style={({ pressed }) => [
                    styles.opcion,
                    pressed && styles.opcionPresionada,
                    entrando !== null && !cargando && styles.opcionApagada,
                  ]}
                >
                  <View style={styles.icono}>
                    <Ionicons name={ICONOS[cuenta.tipo]} size={24} color={Colors.secondary} />
                  </View>
                  <View style={styles.opcionTextos}>
                    <Text style={styles.opcionTitulo}>{cuenta.etiqueta}</Text>
                    <Text style={styles.opcionDetalle}>{cuenta.detalle}</Text>
                  </View>
                  {cargando ? (
                    <ActivityIndicator color={Colors.secondary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text style={styles.error} testID="invitado-error">
              {error}
            </Text>
          ) : null}

          <Text style={styles.pie}>
            Son cuentas compartidas: lo que hagas lo pueden ver otras personas que estén probando la demo.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  contenido: { width: '100%', maxWidth: 440, alignItems: 'center', rowGap: 20 },
  contenidoEscritorio: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 36,
    paddingVertical: 32,
    ...Shadow.card,
  },
  volver: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', columnGap: 2 },
  volverTexto: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_500Medium' },
  logo: { width: 120, height: 60, resizeMode: 'contain' },
  encabezado: { alignItems: 'center', rowGap: 8 },
  etiqueta: { color: Colors.secondary, fontSize: 11, letterSpacing: 1.5, fontFamily: 'Montserrat_700Bold' },
  titulo: { color: Colors.textStrong, fontSize: 22, textAlign: 'center', fontFamily: 'Montserrat_700Bold' },
  bajada: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  opciones: { width: '100%', rowGap: 12 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  opcionPresionada: { borderColor: Colors.secondary },
  opcionApagada: { opacity: 0.5 },
  icono: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionTextos: { flex: 1, rowGap: 2 },
  opcionTitulo: { color: Colors.textStrong, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  opcionDetalle: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Montserrat_400Regular' },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center', fontFamily: 'Montserrat_500Medium' },
  pie: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', fontFamily: 'Montserrat_400Regular' },
});
