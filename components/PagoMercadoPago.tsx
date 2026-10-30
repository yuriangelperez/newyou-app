import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Colors, Spacing } from '../constants/theme';
import { PagoIniciado, resultadoDeRetorno, RetornoPago } from '../services/pagosService';

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

        {pago ? (
          <WebView
            testID="pago-webview"
            source={{ uri: pago.url }}
            style={styles.web}
            startInLoadingState
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(pedido) => {
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
