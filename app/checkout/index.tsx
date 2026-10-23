import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomTabBar } from "../../components/BottomTabBar";
import { SelectorDireccion } from "../../components/ui/SelectorDireccion";
import { PRODUCT_DETAIL_ICONS } from "../../constants/assets";

import { ROUTES } from "../../constants/routes";
import { Colors, Radius, Shadow } from "../../constants/theme";
import {
  calcularEnvio,
  confirmarCompra,
  EntregaCompra,
  generarOperationKey,
  MedioPago,
  obtenerTiendasDeRetiro,
  TiendaRetiro,
} from "../../services/comprasService";
import { useDirecciones } from "../../hooks/useDirecciones";
import { guardarSiEsNueva } from "../../services/direccionesService";
import { encolarBorrador, hayConexion } from "../../services/offlineService";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeVender } from "../../hooks/usePuedeVender";

const CANVAS_WIDTH = 412;

const ENTREGAS: { value: EntregaCompra; detalle: string }[] = [
  { value: "domicilio", detalle: "Domicilio" },
  { value: "local", detalle: "Retiro en el local" },
];

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "Efectivo", label: "EFECTIVO" },
  { value: "Tarjeta", label: "TARJETA DÉBITO / CRÉDITO" },
  { value: "Mercado Pago", label: "MERCADO PAGO" },
  { value: "Transferencia", label: "TRANSFERENCIA BANCARIA" },
];

const formatPrecio = (valor: number) => `$${valor.toLocaleString("es-AR")}`;

export default function CheckoutScreen() {
  const router = useRouter();
  const itemsCarrito = useCarritoStore((state) => state.items);
  const compraDirecta = useCarritoStore((state) => state.compraDirecta);
  const limpiarCompraDirecta = useCarritoStore((state) => state.limpiarCompraDirecta);
  const vaciarCarrito = useCarritoStore((state) => state.vaciarCarrito);
  const cantidadCarrito = useCarritoStore(selectTotalItems);

  // "Comprar ahora" paga sólo la prenda elegida y deja el carrito intacto.
  const esCompraDirecta = compraDirecta !== null;
  const items = compraDirecta ?? itemsCarrito;
  const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  // Al salir de la pantalla se descarta la compra directa pendiente.
  useFocusEffect(
    useCallback(() => limpiarCompraDirecta, [limpiarCompraDirecta]),
  );
  const usuario = useUsuarioStore((state) => state.usuario);
  const esVendedor = usePuedeVender();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = Math.min(width, CANVAS_WIDTH) / CANVAS_WIDTH;
  const styles = useMemo(() => createStyles(scale, insets.bottom), [scale, insets.bottom]);

  const [entrega, setEntrega] = useState<EntregaCompra>("domicilio");
  const [medioPago, setMedioPago] = useState<MedioPago>("Efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // La clave se mantiene entre reintentos: si el primer intento llegó al
  // servidor pero falló la respuesta, el reintento no duplica la orden.
  const operationKey = useRef(generarOperationKey());

  const { direcciones } = useDirecciones();
  const [direccion, setDireccion] = useState("");
  const [tiendas, setTiendas] = useState<TiendaRetiro[] | null>(null);

  // Dirección de la tienda de cada vendedor cuyos productos están en el carrito.
  const idsCarrito = items.map((item) => item.productoId).join(",");
  useEffect(() => {
    if (!idsCarrito) {
      return;
    }

    obtenerTiendasDeRetiro(idsCarrito.split(","))
      .then(setTiendas)
      .catch(() => setTiendas([]));
  }, [idsCarrito]);

  // Dirección de retiro de cada prenda (sin repetir) y vendedores que no la cargaron.
  const direccionesTienda = Array.from(
    new Set(
      (tiendas ?? [])
        .map((tienda) => tienda.direccion)
        .filter((valor): valor is string => Boolean(valor)),
    ),
  );
  const vendedoresSinDireccion = Array.from(
    new Set((tiendas ?? []).filter((tienda) => !tienda.direccion).map((tienda) => tienda.vendedor)),
  );
  const direccionRetiro = direccionesTienda.join(" | ");

  const envio = calcularEnvio(entrega, tiendas ?? []);
  // Tiendas que no ofrecen la forma de entrega elegida (el servidor rechaza la compra).
  const sinEntregaElegida = Array.from(
    new Set(
      (tiendas ?? [])
        .filter((tienda) => (entrega === "domicilio" ? !tienda.haceEnvio : !tienda.haceRetiro))
        .map((tienda) => tienda.vendedor),
    ),
  );
  const total = subtotal + envio;

  const onConfirmar = async () => {
    if (items.length === 0 || isSubmitting) {
      return;
    }

    const direccionEntrega =
      entrega === "domicilio" ? direccion.trim() : direccionRetiro;

    if (!direccionEntrega) {
      Toast.show({
        type: "error",
        text1: entrega === "domicilio"
          ? "Ingresa tu dirección de entrega"
          : "La tienda no tiene dirección cargada",
        text2: entrega === "domicilio"
          ? "Necesitamos saber dónde enviar tu pedido."
          : "Elige envío a domicilio o consulta con el vendedor.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const parametros = {
        operationKey: operationKey.current,
        entrega,
        metodoPago: medioPago,
        items,
        direccionEntrega,
      };

      if (!(await hayConexion())) {
        await encolarBorrador({ tipo: "compra", payload: parametros });
        if (!esCompraDirecta) {
          vaciarCarrito();
        }
        Toast.show({
          type: "offline",
          text1: "Sin conexión. Guardado en borradores locales.",
          text2: "La compra se enviará al recuperar la red.",
        });
        router.replace(ROUTES.home);
        return;
      }

      const compra = await confirmarCompra(parametros);

      // Si usó una dirección nueva de entrega, queda guardada (no bloquea la compra).
      if (entrega === "domicilio") {
        guardarSiEsNueva(direccionEntrega, direcciones).catch(() => {});
      }

      if (!esCompraDirecta) {
        vaciarCarrito();
      }
      Toast.show({
        type: "success",
        text1: "Compra confirmada",
        text2: `Orden #${compra.numero_orden}`,
      });
      router.replace(ROUTES.home);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo confirmar la compra.";
      Toast.show({ type: "error", text1: "Error en la compra", text2: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const envioTexto = envio === 0 ? "GRATIS" : `${formatPrecio(envio)} (estimado)`;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Pressable
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
          </Pressable>
          <Text style={styles.title}>FINALIZA TU COMPRA</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Forma de entrega</Text>
        {ENTREGAS.map((opcion) => (
          <Pressable
            key={opcion.value}
            onPress={() => setEntrega(opcion.value)}
            style={[styles.entregaCard, entrega === opcion.value && styles.selected]}
          >
            <View style={styles.entregaTextos}>
              {opcion.value === "domicilio" ? (
                <Text style={styles.entregaDireccion}>
                  {direccion.trim() || "Elegí o escribí tu dirección abajo"}
                </Text>
              ) : (
                <Text style={styles.entregaDireccion}>
                  {tiendas === null
                    ? "Buscando la dirección de la tienda..."
                    : direccionRetiro || "La tienda aún no cargó su dirección"}
                </Text>
              )}
              <Text style={styles.entregaDetalle}>{opcion.detalle}</Text>
            </View>
            <Text style={styles.gratis}>
              {calcularEnvio(opcion.value, tiendas ?? []) === 0
                ? "GRATIS"
                : formatPrecio(calcularEnvio(opcion.value, tiendas ?? []))}
            </Text>
          </Pressable>
        ))}

        {entrega === "domicilio" ? (
          <SelectorDireccion
            direcciones={direcciones}
            value={direccion}
            onChange={setDireccion}
          />
        ) : null}

        {sinEntregaElegida.length > 0 ? (
          <Text style={styles.aviso}>
            {`${sinEntregaElegida.join(", ")} no ofrece ${
              entrega === "domicilio" ? "envío a domicilio" : "retiro en el local"
            }. Elegí la otra opción o quitá esas prendas.`}
          </Text>
        ) : null}

        {entrega === "local" && vendedoresSinDireccion.length > 0 ? (
          <Text style={styles.aviso}>
            {`Sin dirección cargada: ${vendedoresSinDireccion.join(", ")}`}
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Método de pago</Text>
        {MEDIOS_PAGO.map((medio) => (
          <Pressable
            key={medio.value}
            onPress={() => setMedioPago(medio.value)}
            style={[styles.pagoCard, medioPago === medio.value && styles.selected]}
          >
            <Text style={styles.pagoText}>{medio.label}</Text>
          </Pressable>
        ))}
        <View style={styles.summary}>
          <View style={styles.summaryInner}>
          <Text style={styles.summaryTitle}>Resumen de compra</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{`Productos (${totalItems})`}</Text>
            <Text style={styles.summaryText}>{formatPrecio(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Descuentos</Text>
            <Text style={styles.summaryText}>-$0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Envío</Text>
            <Text style={styles.summaryText}>{envioTexto}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Impuestos</Text>
            <Text style={styles.summaryText}>$0</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalText}>TOTAL:</Text>
            <Text style={styles.totalText}>{formatPrecio(total)}</Text>
          </View>

          <Pressable
            disabled={items.length === 0 || isSubmitting}
            onPress={() => void onConfirmar()}
            style={[
              styles.payButton,
              (items.length === 0 || isSubmitting) && styles.payDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.payText}>PAGAR Y FINALIZAR</Text>
            )}
          </Pressable>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar
        activeTab="cart"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={cantidadCarrito}
        esVendedor={esVendedor}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.back()}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

function createStyles(scale: number, bottomInset: number) {
  const s = (value: number) => value * scale;
  const font = (size: number, family: string) => ({
    color: Colors.primary,
    fontSize: s(size),
    fontFamily: family,
  });
  const optionBase = {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
  };

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    header: {
      width: "100%",
      paddingBottom: s(8),
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
      alignItems: "center",
    },
    headerInner: {
      width: "100%",
      maxWidth: 800,
      minHeight: s(60),
      paddingHorizontal: s(16),
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(12),
    },
    backButton: { width: s(39), height: s(39), alignItems: "center", justifyContent: "center" },
    backIcon: { width: s(39), height: s(39), resizeMode: "contain" },
    title: { ...font(22, "Montserrat_500Medium"), flex: 1 },
    content: {
      width: "100%",
      maxWidth: 800,
      alignSelf: "center",
      paddingHorizontal: s(16),
      paddingTop: s(20),
      paddingBottom: s(78) + bottomInset + s(24),
    },
    sectionTitle: { ...font(18, "Montserrat_500Medium"), marginBottom: s(12) },
    sectionSpaced: { marginTop: s(20) },
    entregaCard: {
      ...optionBase,
      minHeight: s(45),
      paddingHorizontal: s(14),
      paddingVertical: s(6),
      marginBottom: s(10),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    selected: Shadow.selected,
    entregaTextos: { flex: 1 },
    entregaDireccion: font(12, "Montserrat_500Medium"),
    entregaDetalle: { ...font(10, "Montserrat_500Medium"), color: Colors.secondary },
    gratis: { ...font(15, "Montserrat_700Bold"), color: Colors.secondary },
    pagoCard: {
      ...optionBase,
      minHeight: s(44),
      marginBottom: s(9),
      paddingHorizontal: s(20),
      justifyContent: "center",
    },
    pagoText: font(12, "Montserrat_500Medium"),
    summary: {
      marginTop: s(24),
      backgroundColor: Colors.surface,
      borderRadius: Radius.lg,
      paddingHorizontal: s(16),
      paddingTop: s(14),
      paddingBottom: s(14),
      ...Shadow.panel,
    },
    summaryInner: { width: "100%" },
    aviso: { ...font(11, "Montserrat_500Medium"), color: Colors.warning, marginBottom: s(6) },
    summaryTitle: { ...font(20, "Montserrat_700Bold"), color: Colors.secondary, marginBottom: s(6) },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryText: font(15, "Montserrat_400Regular"),
    totalRow: { marginTop: s(8) },
    totalText: font(20, "Montserrat_700Bold"),
    payButton: {
      marginTop: s(12),
      minHeight: s(49),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    payDisabled: { opacity: 0.55 },
    payText: { ...font(20, "Montserrat_700Bold"), color: Colors.white },
  });
}
