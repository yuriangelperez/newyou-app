import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '../constants/theme';
import { PagoIniciado, RetornoPago } from '../services/pagosService';

interface PagoMercadoPagoProps {
  pago: PagoIniciado | null;
  verificando: boolean;
  onRetorno: (resultado: RetornoPago | null) => void;
  onCancelar: () => void;
}

// En el navegador no hay WebView y Mercado Pago no deja abrirse en un iframe:
// el pago va en otra pestaña y al volver el comprador toca "Ya pagué".
export function PagoMercadoPago({ pago, verificando, onRetorno, onCancelar }: PagoMercadoPagoProps) {
  return (
    <Modal visible={pago !== null} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Pagá con Mercado Pago</Text>
          <Text style={styles.texto}>
            Abrimos el pago en otra pestaña. Cuando termines, volvé acá y tocá &quot;Ya pagué&quot;.
          </Text>

          {verificando ? (
            <ActivityIndicator color={Colors.secondary} />
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => pago && window.open(pago.url, '_blank')}
                style={styles.botonPrimario}>
                <Text style={styles.botonPrimarioTexto}>Abrir Mercado Pago</Text>
              </Pressable>
              <Pressable testID="pago-ya-pague" accessibilityRole="button" onPress={() => onRetorno(null)} style={styles.botonSecundario}>
                <Text style={styles.botonSecundarioTexto}>Ya pagué</Text>
              </Pressable>
              <Pressable testID="pago-cancelar" accessibilityRole="button" onPress={onCancelar}>
                <Text style={styles.cancelar}>Cancelar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    rowGap: Spacing.md,
    alignItems: 'stretch',
  },
  titulo: { color: Colors.primary, fontSize: 20, fontFamily: 'Montserrat_700Bold' },
  texto: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_400Regular' },
  botonPrimario: { backgroundColor: Colors.secondary, borderRadius: 10, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  botonPrimarioTexto: { color: Colors.white, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  botonSecundario: {
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: 10,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonSecundarioTexto: { color: Colors.secondary, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  cancelar: { color: Colors.secondary, fontSize: 14, fontFamily: 'Montserrat_500Medium', textAlign: 'center' },
});
