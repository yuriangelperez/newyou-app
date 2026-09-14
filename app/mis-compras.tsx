import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabBar } from "../components/BottomTabBar";
import { ROUTES } from "../constants/routes";
import { Colors, Radius } from "../constants/theme";
import { getMisCompras } from "../services/comprasService";
import { selectTotalItems, useCarritoStore } from "../stores/useCarritoStore";
import { useUsuarioStore } from "../stores/useUsuarioStore";
import { Compra } from "../services/comprasService";

export default function MisComprasScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = useUsuarioStore((state) => state.usuario?.role === "vendedor");
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasWidth = Math.min(width, 412);
  const scale = canvasWidth / 412;
  const styles = useMemo(
    () => createStyles(scale, insets.top, insets.bottom),
    [insets.bottom, insets.top, scale],
  );

  useEffect(() => {
    let activo = true;

    getMisCompras()
      .then((data) => {
        if (activo) setCompras(data);
      })
      .catch((reason) => {
        if (activo) {
          setError(reason instanceof Error ? reason.message : "No se pudieron cargar tus compras.");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Volver">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Mis compras</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {cargando ? (
          <ActivityIndicator color={Colors.secondary} size="large" />
        ) : error ? (
          <Text style={styles.message}>{error}</Text>
        ) : compras.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todavía no tenés compras</Text>
            <Text style={styles.message}>Tus órdenes finalizadas aparecerán acá.</Text>
          </View>
        ) : (
          compras.map((compra) => (
            <View key={compra.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderTitle}>Orden #{compra.numeroOrden}</Text>
                  <Text style={styles.orderDate}>{formatDate(compra.creadaEn)}</Text>
                </View>
                <Text style={styles.orderTotal}>${compra.total.toLocaleString("es-AR")}</Text>
              </View>

              <View style={styles.orderMeta}>
                <Text style={styles.metaText}>Entrega: {compra.entrega === "domicilio" ? "Domicilio" : "Retiro en el local"}</Text>
                <Text style={styles.metaText}>Pago: {compra.metodoPago}</Text>
              </View>

              <View style={styles.divider} />
              {compra.items.map((item) => (
                <View key={item.key} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.nombre}</Text>
                    <Text style={styles.metaText}>Cantidad: {item.cantidad} · {item.talle} · {item.color}</Text>
                    {(item.descuentoPorcentaje ?? 0) > 0 ? (
                      <Text style={styles.discountText}>Descuento: -{item.descuentoPorcentaje}%</Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemPrice}>${(item.precio * item.cantidad).toLocaleString("es-AR")}</Text>
                </View>
              ))}

              <View style={styles.divider} />
              <SummaryLine label="Subtotal" value={compra.subtotalOriginal} />
              <SummaryLine label="Descuentos" value={-compra.descuentos} negative />
              <SummaryLine label="Envío e impuestos" value={compra.envio + compra.impuestos} />
            </View>
          ))
        )}
      </ScrollView>

      <BottomTabBar
        activeTab="menu"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={esVendedor}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

function SummaryLine({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <View style={summaryStyles.line}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, negative && summaryStyles.negative]}>
        {value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("es-AR")}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const summaryStyles = StyleSheet.create({
  line: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  label: { color: Colors.textMuted, fontSize: 12 },
  value: { color: Colors.primary, fontSize: 12, fontWeight: "600" },
  negative: { color: Colors.success },
});

function createStyles(scale: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      height: topInset + s(76), paddingTop: topInset, paddingHorizontal: s(16),
      borderBottomWidth: 2, borderBottomColor: Colors.secondary,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    backButton: { width: s(40), height: s(40), justifyContent: "center" },
    backText: { color: Colors.primary, fontSize: s(38), lineHeight: s(38) },
    headerSpacer: { width: s(40) },
    title: { flex: 1, color: Colors.primary, fontSize: s(22), fontWeight: "700", textAlign: "center" },
    content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: s(20), paddingBottom: s(120) + bottomInset },
    orderCard: { marginBottom: s(16), padding: s(14), borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface },
    orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    orderTitle: { color: Colors.primary, fontSize: s(16), fontWeight: "800" },
    orderDate: { marginTop: s(4), color: Colors.textMuted, fontSize: s(12) },
    orderTotal: { color: Colors.primary, fontSize: s(18), fontWeight: "800" },
    orderMeta: { marginTop: s(12), rowGap: s(4) },
    metaText: { color: Colors.textMuted, fontSize: s(11), lineHeight: s(15) },
    divider: { height: 1, marginVertical: s(12), backgroundColor: Colors.border },
    itemRow: { flexDirection: "row", justifyContent: "space-between", gap: s(12), marginTop: s(8) },
    itemCopy: { flex: 1 },
    itemName: { color: Colors.primary, fontSize: s(14), fontWeight: "700" },
    itemPrice: { color: Colors.primary, fontSize: s(14), fontWeight: "700" },
    discountText: { marginTop: s(3), color: Colors.success, fontSize: s(11), fontWeight: "600" },
    emptyState: { alignItems: "center", marginTop: s(90) },
    emptyTitle: { color: Colors.primary, fontSize: s(20), fontWeight: "700" },
    message: { marginTop: s(8), color: Colors.textMuted, fontSize: s(14), textAlign: "center" },
  });
}