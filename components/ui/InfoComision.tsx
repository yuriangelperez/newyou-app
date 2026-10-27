import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '../../constants/theme';
import { calcularComision, COMISION_PORCENTAJE, parsearPrecio } from '../../utils/precio';

const formato = (valor: number) =>
  `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Ícono ⓘ que explica la comisión, para poner junto al título "Precio". */
export function BotonInfoComision({ abierto, onPress }: { abierto: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID="comision-info"
      accessibilityRole="button"
      accessibilityLabel="Información sobre la comisión"
      hitSlop={8}
      onPress={onPress}>
      <Ionicons name={abierto ? 'information-circle' : 'information-circle-outline'} size={18} color={Colors.secondary} />
    </Pressable>
  );
}

interface InfoComisionProps {
  /** Texto del campo precio, tal como lo escribe el vendedor. */
  precio: string | number | undefined;
  descuentoPorcentaje?: unknown;
  mostrarInfo: boolean;
}

/**
 * Comisión de New You al publicar (RF5): la paga el vendedor, no el comprador.
 * "Ver detalle" despliega el precio de venta, la comisión y lo que recibe el vendedor.
 */
export function InfoComision({ precio, descuentoPorcentaje = 0, mostrarInfo }: InfoComisionProps) {
  const [detalle, setDetalle] = useState(false);
  const resultado = parsearPrecio(precio ?? '');
  const descuento = Math.min(Math.max(Number(descuentoPorcentaje) || 0, 0), 100);
  const precioVenta = resultado.ok ? Math.round(resultado.valor * (1 - descuento / 100)) : 0;
  const { comision, ganancia } = calcularComision(precioVenta);

  return (
    <View style={styles.contenedor}>
      {mostrarInfo ? (
        <Text style={styles.info} testID="comision-texto">
          New You cobra una comisión del {COMISION_PORCENTAJE}% (IVA incluido) sobre el precio de venta de cada
          prenda vendida. La paga el vendedor: al comprador no se le suma nada.
        </Text>
      ) : null}

      <Pressable
        testID="comision-detalle"
        accessibilityRole="button"
        accessibilityState={{ expanded: detalle }}
        onPress={() => setDetalle((valor) => !valor)}
        style={styles.botonDetalle}>
        <Text style={styles.botonDetalleTexto}>{detalle ? 'Ocultar detalle' : 'Ver detalle'}</Text>
        <Ionicons name={detalle ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
      </Pressable>

      {detalle ? (
        <View style={styles.tabla}>
          {precioVenta > 0 ? (
            <>
              <Fila etiqueta={descuento > 0 ? `Precio de venta (con ${descuento}% off)` : 'Precio de venta'} valor={formato(precioVenta)} />
              <Fila etiqueta={`Comisión New You (${COMISION_PORCENTAJE}%, IVA incl.)`} valor={`-${formato(comision)}`} />
              <Fila etiqueta="Recibís" valor={formato(ganancia)} destacado />
            </>
          ) : (
            <Text style={styles.info}>Escribí el precio para ver cuánto recibís.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Fila({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <View style={styles.fila}>
      <Text style={[styles.etiqueta, destacado && styles.destacado]}>{etiqueta}</Text>
      <Text style={[styles.valor, destacado && styles.destacado]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginTop: -6, marginBottom: 14, gap: 6 },
  info: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: 'Montserrat_500Medium' },
  botonDetalle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 2 },
  botonDetalleTexto: { color: Colors.primary, fontSize: 13, textDecorationLine: 'underline', fontFamily: 'Montserrat_600SemiBold' },
  tabla: {
    gap: 6,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  etiqueta: { flex: 1, color: Colors.text, fontSize: 13, fontFamily: 'Montserrat_500Medium' },
  valor: { color: Colors.text, fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  destacado: { color: Colors.primary, fontFamily: 'Montserrat_700Bold' },
});
