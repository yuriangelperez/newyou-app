import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Colors, Radius, Spacing } from '../constants/theme';
import { esLinkExterno, PagoIniciado, resultadoDeRetorno, RetornoPago } from '../services/pagosService';

interface PagoMercadoPagoProps {
  pago: PagoIniciado | null;
  /** Se está consultando el resultado: tapa el WebView con un indicador. */
  verificando: boolean;
  /** Mercado Pago terminó y redirigió a la página de regreso (null = "Ya pagué", sólo web). */
  onRetorno: (resultado: RetornoPago | null) => void;
  onCancelar: () => void;
}

/**
 * Checkout Pro de Mercado Pago dentro de la app (WebView). Cuando Mercado Pago
 * redirige a la página de regreso, se corta la navegación y se avisa el resultado.
 */
export function PagoMercadoPago({ pago, verificando, onRetorno, onCancelar }: PagoMercadoPagoProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={pago !== null} animationType="slide" onRequestClose={onCancelar}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Pagá con Mercado Pago</Text>
          <Pressable testID="pago-cancelar" accessibilityRole="button" onPress={onCancelar} disabled={verificando}>
            <Text style={styles.cancelar}>Cancelar</Text>
          </Pressable>
        </View>

        {/* Mercado Pago no deja iniciar sesión dentro de un WebView: para entrar con una
            cuenta se abre el navegador interno (Custom Tabs) y al cerrarlo se verifica el pago. */}
        <View style={styles.afuera}>
          <Text style={styles.afueraTexto}>¿Querés entrar con tu cuenta de Mercado Pago?</Text>
          <View style={styles.afueraBotones}>
            <Pressable
              testID="pago-abrir-navegador"
              accessibilityRole="button"
              disabled={!pago || verificando}
              onPress={async () => {
                if (!pago) return;
                // Navegador interno (Chrome Custom Tabs): queda dentro de la app y Mercado
                // Pago sí permite iniciar sesión. Al cerrarlo se verifica el pago solo.
                await WebBrowser.openBrowserAsync(pago.url, { showTitle: true, enableBarCollapsing: true });
                onRetorno(null);
              }}
              style={styles.botonPrimario}
            >
              <Text style={styles.botonPrimarioTexto}>Pagar con mi cuenta</Text>
            </Pressable>
            <Pressable
              testID="pago-ya-pague"
              accessibilityRole="button"
              disabled={verificando}
              onPress={() => onRetorno(null)}
              style={styles.botonSecundario}
            >
              <Text style={styles.botonSecundarioTexto}>Ya pagué</Text>
            </Pressable>
          </View>
        </View>

        {pago ? (
          <WebView
            testID="pago-webview"
            source={{ uri: pago.url }}
            style={styles.web}
            startInLoadingState
            setSupportMultipleWindows={false}
            // Con la lista por defecto el WebView abre con Linking los links que no son http(s)
            // (intent://, mercadopago://) y salta a la app de Mercado Pago, que usa la cuenta real
            // del celular: con credenciales de prueba el pago siempre falla. Se filtran abajo.
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(pedido) => {
              if (esLinkExterno(pedido.url)) {
                return false;
              }
              const resultado = resultadoDeRetorno(pedido.url, pago.retorno);
              if (resultado) {
                onRetorno(resultado);
                return false;
              }
              return true;
            }}
          />
        ) : null}

        {verificando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color={Colors.secondary} />
            <Text style={styles.cargandoTexto}>Confirmando el pago...</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titulo: { color: Colors.primary, fontSize: 18, fontFamily: 'Montserrat_500Medium' },
  cancelar: { color: Colors.secondary, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  web: { flex: 1 },
  afuera: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    rowGap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  afueraTexto: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  afueraBotones: { flexDirection: 'row', columnGap: Spacing.sm },
  botonPrimario: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrimarioTexto: { color: Colors.white, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  botonSecundario: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundarioTexto: { color: Colors.secondary, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  cargando: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: Spacing.sm,
  },
  cargandoTexto: { color: Colors.primary, fontSize: 15, fontFamily: 'Montserrat_500Medium' },
});
