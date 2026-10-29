import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROUTES } from "../constants/routes";
import { Colors, Radius, Shadow, Spacing } from "../constants/theme";

const formatPrecio = (valor: number) => `$${valor.toLocaleString("es-AR")}`;

/** Confirmación de la compra (HU14): orden, forma de entrega con su dirección y total. */
export default function CompraConfirmadaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orden, entrega, direccion, metodoPago, estadoPago, envio, comision, cuotas, interes, total } =
    useLocalSearchParams<{
    orden?: string;
    entrega?: string;
    direccion?: string;
    metodoPago?: string;
    estadoPago?: string;
    envio?: string;
    comision?: string;
    cuotas?: string;
    interes?: string;
    total?: string;
  }>();
  const esDomicilio = entrega === "domicilio";
  const costoEnvio = Number(envio) || 0;
  const costoComision = Number(comision) || 0;
  const costoInteres = Number(interes) || 0;
  const cantidadCuotas = Number(cuotas) || 1;
  const pagoEnRevision = estadoPago === "pendiente";
  const detallePago =
    estadoPago === "aprobado"
      ? metodoPago === "Mercado Pago"
        ? "pagado con Mercado Pago"
        : "pagado con tarjeta"
      : pagoEnRevision
        ? "pago en revisión"
        : "se paga al recibir";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.card} testID="compra-confirmada">
        <Ionicons
          name={pagoEnRevision ? "time" : "checkmark-circle"}
          size={64}
          color={pagoEnRevision ? Colors.warning : Colors.success}
        />
        <Text style={styles.titulo}>{pagoEnRevision ? "Compra registrada" : "Compra confirmada"}</Text>
        <Text style={styles.orden} testID="compra-orden">Orden #{orden}</Text>

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>{esDomicilio ? "Envío a domicilio" : "Retiro en el local"}</Text>
          <Text style={styles.valor} testID="compra-entrega">
            {esDomicilio ? "Entregar en: " : "Retirar en: "}
            {direccion || "dirección a confirmar con el vendedor"}
          </Text>
        </View>

        {metodoPago ? (
          <View style={styles.bloque}>
            <Text style={styles.etiqueta}>Medio de pago</Text>
            <Text style={styles.valor} testID="compra-estado-pago">{`${metodoPago} (${detallePago})`}</Text>
          </View>
        ) : null}

        <View style={styles.fila}>
          <Text style={styles.valor}>Envío</Text>
          <Text style={styles.valor}>{costoEnvio === 0 ? "GRATIS" : formatPrecio(costoEnvio)}</Text>
        </View>
        {costoComision > 0 ? (
          <View style={styles.fila}>
            <Text style={styles.valor}>Comisión tarjeta de crédito</Text>
            <Text style={styles.valor}>{formatPrecio(costoComision)}</Text>
          </View>
        ) : null}
        {costoInteres > 0 ? (
          <View style={styles.fila}>
            <Text style={styles.valor}>{`Interés por ${cantidadCuotas} cuotas (total)`}</Text>
            <Text style={styles.valor}>{formatPrecio(costoInteres)}</Text>
          </View>
        ) : null}
        <View style={styles.fila}>
          <Text style={styles.total}>Total</Text>
          <Text style={styles.total}>{formatPrecio(Number(total) || 0)}</Text>
        </View>
        {cantidadCuotas > 1 ? (
          <Text style={styles.valor}>
            {`En ${cantidadCuotas} cuotas de ${formatPrecio(Math.round((Number(total) || 0) / cantidadCuotas))}`}
          </Text>
        ) : null}

        <Text style={styles.nota}>
          {pagoEnRevision
            ? "Te avisamos cuando se acredite el pago. Lo seguís en Perfil > Mis compras."
            : "Te mandamos el detalle a tu correo. También lo ves en Perfil > Mis compras."}
        </Text>

        <Pressable
          testID="compra-volver-inicio"
          accessibilityRole="button"
          onPress={() => router.replace(ROUTES.home)}
          style={styles.botonPrimario}>
          <Text style={styles.botonPrimarioTexto}>Volver al inicio</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace(ROUTES.myPurchases)} style={styles.botonSecundario}>
          <Text style={styles.botonSecundarioTexto}>Ver mis compras</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.md, alignItems: "center" },
  card: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  titulo: { color: Colors.primary, fontSize: 24, fontFamily: "Montserrat_700Bold" },
  orden: { color: Colors.secondary, fontSize: 18, fontFamily: "Montserrat_700Bold", marginBottom: Spacing.sm },
  bloque: { width: "100%", gap: 2, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  etiqueta: { color: Colors.primary, fontSize: 14, fontFamily: "Montserrat_700Bold" },
  valor: { color: Colors.text, fontSize: 14, fontFamily: "Montserrat_500Medium" },
  fila: { width: "100%", flexDirection: "row", justifyContent: "space-between" },
  total: { color: Colors.primary, fontSize: 18, fontFamily: "Montserrat_700Bold" },
  nota: { color: Colors.textMuted, fontSize: 12, textAlign: "center", marginTop: Spacing.sm, fontFamily: "Montserrat_500Medium" },
  botonPrimario: {
    width: "100%",
    minHeight: 46,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  botonPrimarioTexto: { color: Colors.white, fontSize: 16, fontFamily: "Montserrat_700Bold" },
  botonSecundario: { minHeight: 40, alignItems: "center", justifyContent: "center" },
  botonSecundarioTexto: { color: Colors.primary, fontSize: 14, textDecorationLine: "underline", fontFamily: "Montserrat_600SemiBold" },
});
