import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabBar } from "../components/BottomTabBar";
import { BRANDING_LOGO, PRODUCT_DETAIL_ICONS } from "../constants/assets";
import { ROUTES } from "../constants/routes";
import { Colors, Radius } from "../constants/theme";
import { crearCompra } from "../services/comprasService";
import { selectTotalItems, useCarritoStore } from "../stores/useCarritoStore";
import { useUsuarioStore } from "../stores/useUsuarioStore";

const CANVAS_WIDTH = 412;
const COSTO_DOMICILIO = 2500;
const TASA_IMPUESTOS = 0.21;

const DELIVERY_OPTIONS = [
  { id: "domicilio", label: "Domicilio", detail: "Recibí tu compra en tu dirección." },
  { id: "local", label: "Retiro en el local", detail: "Retirá tu compra sin costo de envío." },
] as const;

const PAYMENT_OPTIONS = [
  "Efectivo",
  "Tarjeta débito/crédito",
  "Mercado Pago",
  "Transferencia bancaria",
] as const;

type DeliveryOption = (typeof DELIVERY_OPTIONS)[number]["id"];
type PaymentOption = (typeof PAYMENT_OPTIONS)[number];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const items = useCarritoStore((state) => state.items);
  const vaciarCarrito = useCarritoStore((state) => state.vaciarCarrito);
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = useUsuarioStore((state) => state.usuario?.role === "vendedor");
  const [delivery, setDelivery] = useState<DeliveryOption>("domicilio");
  const [payment, setPayment] = useState<PaymentOption>(PAYMENT_OPTIONS[0]);
  const [guardando, setGuardando] = useState(false);

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom),
    [canvasWidth, insets.bottom, insets.top, scale],
  );

  const subtotalOriginal = items.reduce(
    (total, item) => total + (item.precioOriginal ?? item.precio) * item.cantidad,
    0,
  );
  const subtotal = items.reduce(
    (total, item) => total + item.precio * item.cantidad,
    0,
  );
  const totalDescuentos = items.reduce((total, item) => {
    const precioOriginal = item.precioOriginal ?? item.precio;
    return total + Math.max(0, precioOriginal - item.precio) * item.cantidad;
  }, 0);
  const envio = delivery === "domicilio" && items.length > 0 ? COSTO_DOMICILIO : 0;
  const impuestos = Math.round(subtotal * TASA_IMPUESTOS);
  const total = subtotal + envio + impuestos;

  const finalizarCompra = async () => {
    if (items.length === 0) {
      return;
    }

    try {
      setGuardando(true);
      await crearCompra({
        entrega: delivery,
        metodoPago: payment,
        subtotalOriginal,
        descuentos: totalDescuentos,
        envio,
        impuestos,
        total,
        items,
      });

      Alert.alert(
        "Compra finalizada",
        `Tu pedido por $${total.toLocaleString("es-AR")} fue registrado.`,
        [
          {
            text: "Continuar",
            onPress: () => {
              vaciarCarrito();
              router.replace(ROUTES.home);
            },
          },
        ],
      );
    } catch (reason) {
      Alert.alert(
        "No se pudo finalizar",
        reason instanceof Error ? reason.message : "Intenta nuevamente.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>FINALIZA TU COMPRA</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>FORMA DE ENTREGA</Text>
        <View style={styles.optionsGroup}>
          {DELIVERY_OPTIONS.map((option) => {
            const selected = delivery === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setDelivery(option.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  <Text style={styles.optionDetail}>{option.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>MÉTODOS DE PAGO</Text>
        <View style={styles.optionsGroup}>
          {PAYMENT_OPTIONS.map((option) => {
            const selected = payment === option;
            return (
              <Pressable
                key={option}
                onPress={() => setPayment(option)}
                style={[styles.paymentOption, selected && styles.optionSelected]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={styles.optionTitle}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>RESUMEN DE LA COMPRA</Text>
        <View style={styles.summaryCard}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos en el carrito.</Text>
          ) : (
            items.map((item) => {
              const precioOriginal = item.precioOriginal ?? item.precio;
              const tieneDescuento = (item.descuentoPorcentaje ?? 0) > 0;
              return (
                <View key={item.key} style={styles.summaryProduct}>
                  <View style={styles.summaryProductCopy}>
                    <Text style={styles.productName}>{item.nombre}</Text>
                    <Text style={styles.productMeta}>
                      Cantidad: {item.cantidad} · Talle: {item.talle} · Color: {item.color}
                    </Text>
                    {tieneDescuento ? (
                      <Text style={styles.discountText}>
                        Descuento: -{item.descuentoPorcentaje}%
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.priceCopy}>
                    {tieneDescuento ? (
                      <Text style={styles.originalPrice}>
                        ${(precioOriginal * item.cantidad).toLocaleString("es-AR")}
                      </Text>
                    ) : null}
                    <Text style={styles.productPrice}>
                      ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.divider} />
          <SummaryLine label="Subtotal" value={subtotalOriginal} />
          <SummaryLine label="Descuentos" value={-totalDescuentos} negative />
          <SummaryLine label="Subtotal con descuento" value={subtotal} />
          <SummaryLine label="Costo de envío" value={envio} />
          <SummaryLine label="Impuestos (21%)" value={impuestos} />
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>${total.toLocaleString("es-AR")}</Text>
          </View>
        </View>

        <Pressable
          disabled={items.length === 0 || guardando}
          onPress={() => void finalizarCompra()}
          style={[styles.payButton, (items.length === 0 || guardando) && styles.disabledButton]}
        >
          <Text style={styles.payButtonText}>
            {guardando ? "GUARDANDO..." : "PAGAR Y FINALIZAR"}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomTabBar
        activeTab="cart"
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

const summaryStyles = StyleSheet.create({
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  value: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  negative: {
    color: Colors.success,
  },
});

function createStyles(scale: number, canvasWidth: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      height: topInset + s(76),
      paddingTop: topInset,
      paddingHorizontal: s(16),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: s(2),
      borderBottomColor: Colors.secondary,
    },
    backButton: { width: s(40), height: s(40), justifyContent: "center" },
    backIcon: { width: s(38), height: s(38), resizeMode: "contain" },
    headerTitle: {
      flex: 1,
      marginHorizontal: s(10),
      color: Colors.primary,
      fontSize: s(20),
      fontWeight: "700",
      textAlign: "center",
    },
    headerSpacer: { width: s(40) },
    content: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      padding: s(20),
      paddingBottom: s(120) + bottomInset,
    },
    sectionTitle: {
      marginTop: s(8),
      marginBottom: s(10),
      color: Colors.primary,
      fontSize: s(16),
      fontWeight: "700",
    },
    optionsGroup: { gap: s(8), marginBottom: s(18) },
    option: {
      minHeight: s(64),
      padding: s(12),
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: s(12),
    },
    paymentOption: {
      minHeight: s(50),
      padding: s(12),
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: s(12),
    },
    optionSelected: { borderColor: Colors.secondary, backgroundColor: "#F0E7E2" },
    radio: {
      width: s(20),
      height: s(20),
      borderRadius: s(10),
      borderWidth: s(2),
      borderColor: Colors.secondary,
    },
    radioSelected: { borderWidth: s(6), backgroundColor: Colors.surface },
    optionCopy: { flex: 1 },
    optionTitle: { color: Colors.primary, fontSize: s(14), fontWeight: "700" },
    optionDetail: { marginTop: s(3), color: Colors.textMuted, fontSize: s(12) },
    summaryCard: {
      padding: s(14),
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      backgroundColor: Colors.surface,
    },
    summaryProduct: {
      minHeight: s(58),
      flexDirection: "row",
      justifyContent: "space-between",
      gap: s(12),
    },
    summaryProductCopy: { flex: 1 },
    productName: { color: Colors.primary, fontSize: s(14), fontWeight: "700" },
    productMeta: { marginTop: s(4), color: Colors.textMuted, fontSize: s(11), lineHeight: s(15) },
    discountText: { marginTop: s(4), color: Colors.success, fontSize: s(11), fontWeight: "600" },
    priceCopy: { alignItems: "flex-end" },
    originalPrice: { color: Colors.textMuted, fontSize: s(11), textDecorationLine: "line-through" },
    productPrice: { marginTop: s(2), color: Colors.primary, fontSize: s(15), fontWeight: "700" },
    divider: { height: 1, marginVertical: s(12), backgroundColor: Colors.border },
    totalLine: {
      marginTop: s(14),
      paddingTop: s(12),
      borderTopWidth: 1,
      borderTopColor: Colors.secondary,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: { color: Colors.primary, fontSize: s(18), fontWeight: "800" },
    totalValue: { color: Colors.primary, fontSize: s(22), fontWeight: "800" },
    emptyText: { paddingVertical: s(20), color: Colors.textMuted, textAlign: "center" },
    payButton: {
      minHeight: s(56),
      marginTop: s(20),
      borderRadius: Radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.secondary,
    },
    disabledButton: { opacity: 0.45 },
    payButtonText: { color: Colors.primary, fontSize: s(17), fontWeight: "800" },
  });
}
