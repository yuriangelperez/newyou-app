import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '../constants/theme';
import { ResultadoSimulado } from '../services/pagosService';

const formatPrecio = (valor: number) => `$${valor.toLocaleString('es-AR')}`;

interface PagoMercadoPagoDemoProps {
  visible: boolean;
  /** Total de la compra (lo calculó confirmar_compra). */
  total: number;
  orden: number;
  /** Se está registrando el resultado en el servidor. */
  procesando: boolean;
  onResultado: (resultado: ResultadoSimulado) => void;
}

type MedioDemo = 'saldo' | 'debito';

const MEDIOS: { value: MedioDemo; titulo: string; detalle: string }[] = [
  { value: 'saldo', titulo: 'Dinero en cuenta', detalle: 'Saldo de prueba disponible' },
  { value: 'debito', titulo: 'Tarjeta de débito guardada', detalle: 'Visa •••• 5619 (de prueba)' },
];

/** Tiempo de "procesando" antes de registrar el pago, para que se vea como un pago real. */
const DEMORA_MS = 1200;

/**
 * Pago con Mercado Pago simulado para la versión demo (EXPO_PUBLIC_MP_MODO=demo).
 * Anda igual en el APK y en la web, sin cuenta de Mercado Pago ni salir de la app.
 * El resultado lo registra el servidor (pago-mercadopago, acción "simular"): no se mueve plata.
 * La pantalla de compra la monta sólo mientras dura el pago, así cada pago arranca de cero.
 */
export function PagoMercadoPagoDemo({ visible, total, orden, procesando, onResultado }: PagoMercadoPagoDemoProps) {
  const insets = useSafeAreaInsets();
  const [medio, setMedio] = useState<MedioDemo>('saldo');
  const [esperando, setEsperando] = useState(false);

  const ocupado = esperando || procesando;

  const elegir = (resultado: ResultadoSimulado) => {
    if (ocupado) return;
    if (resultado === 'cancelado') {
      onResultado(resultado);
      return;
    }
    setEsperando(true);
    setTimeout(() => {
      setEsperando(false);
      onResultado(resultado);
    }, DEMORA_MS);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => elegir('cancelado')}>
      <View style={styles.fondo}>
        <View style={[styles.hoja, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Pagá con Mercado Pago</Text>
            <Pressable
              testID="pago-demo-cancelar"
              accessibilityRole="button"
              onPress={() => elegir('cancelado')}
              disabled={ocupado}
            >
              <Text style={[styles.cancelar, ocupado && styles.deshabilitado]}>Cancelar</Text>
            </Pressable>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>PAGO SIMULADO · versión demo, no se cobra dinero real</Text>
          </View>

          <View style={styles.resumen}>
            <Text style={styles.resumenEtiqueta}>Orden #{orden}</Text>
            <Text style={styles.total} testID="pago-demo-total">
              {formatPrecio(total)}
            </Text>
          </View>

          <Text style={styles.subtitulo}>¿Con qué querés pagar?</Text>
          {MEDIOS.map((opcion) => {
            const activo = medio === opcion.value;
            return (
              <Pressable
                key={opcion.value}
                testID={`pago-demo-medio-${opcion.value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: activo, disabled: ocupado }}
                onPress={() => setMedio(opcion.value)}
                disabled={ocupado}
                style={[styles.medio, activo && styles.medioActivo]}
              >
                <View style={[styles.radio, activo && styles.radioActivo]}>
                  {activo ? <View style={styles.radioPunto} /> : null}
                </View>
                <View style={styles.medioTextos}>
                  <Text style={styles.medioTitulo}>{opcion.titulo}</Text>
                  <Text style={styles.medioDetalle}>{opcion.detalle}</Text>
                </View>
              </Pressable>
            );
          })}

          <Pressable
            testID="pago-demo-pagar"
            accessibilityRole="button"
            onPress={() => elegir('aprobado')}
            disabled={ocupado}
            style={[styles.pagar, ocupado && styles.pagarOcupado]}
          >
            {ocupado ? (
              <View style={styles.fila}>
                <ActivityIndicator color={Colors.white} />
                <Text style={styles.pagarTexto}>Procesando el pago...</Text>
              </View>
            ) : (
              <Text style={styles.pagarTexto}>Pagar {formatPrecio(total)}</Text>
            )}
          </Pressable>

          <Pressable
            testID="pago-demo-rechazar"
            accessibilityRole="button"
            onPress={() => elegir('rechazado')}
            disabled={ocupado}
          >
            <Text style={[styles.rechazar, ocupado && styles.deshabilitado]}>Simular pago rechazado</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  hoja: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    rowGap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: Colors.primary, fontSize: 20, fontFamily: 'Montserrat_700Bold' },
  cancelar: { color: Colors.secondary, fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  deshabilitado: { opacity: 0.4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeTexto: { color: Colors.textStrong, fontSize: 11, fontFamily: 'Montserrat_700Bold' },
  resumen: { alignItems: 'center', rowGap: 2, paddingVertical: Spacing.sm },
  resumenEtiqueta: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  total: { color: Colors.textStrong, fontSize: 32, fontFamily: 'Montserrat_700Bold' },
  subtitulo: { color: Colors.primary, fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  medio: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  medioActivo: { borderColor: Colors.secondary, backgroundColor: Colors.background },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.switchOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActivo: { borderColor: Colors.secondary },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.secondary },
  medioTextos: { flex: 1, rowGap: 2 },
  medioTitulo: { color: Colors.text, fontSize: 15, fontFamily: 'Montserrat_500Medium' },
  medioDetalle: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Montserrat_400Regular' },
  pagar: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  pagarOcupado: { opacity: 0.85 },
  pagarTexto: { color: Colors.white, fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  fila: { flexDirection: 'row', alignItems: 'center', columnGap: Spacing.sm },
  rechazar: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Montserrat_500Medium', textAlign: 'center' },
});
