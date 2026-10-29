import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomTabBar } from "../../components/BottomTabBar";
import { FormularioTarjeta } from "../../components/FormularioTarjeta";
import { PagoMercadoPago } from "../../components/PagoMercadoPago";
import { SelectorDireccion } from "../../components/ui/SelectorDireccion";
import { PRODUCT_DETAIL_ICONS } from "../../constants/assets";

import { ROUTES } from "../../constants/routes";
import { Colors, Radius, Shadow } from "../../constants/theme";
import {
  calcularEnvio,
  CompraConfirmada,
  confirmarCompra,
  enviarCorreoCompra,
  EntregaCompra,
  generarOperationKey,
  MedioPago,
  obtenerTiendasDeRetiro,
  TiendaRetiro,
} from "../../services/comprasService";
import { useDirecciones } from "../../hooks/useDirecciones";
import { guardarSiEsNueva } from "../../services/direccionesService";
import { traducirError } from "../../services/erroresSupabase";
import { encolarBorrador, hayConexion } from "../../services/offlineService";
import {
  calcularComision,
  cancelarPagoMp,
  cancelarPagoTarjeta,
  COMISION_CREDITO,
  crearPagoMp,
  esPagoOnline,
  EstadoPago,
  PagoIniciado,
  pagarConTarjeta,
  RetornoPago,
  tipoTarjeta,
  verificarPagoMp,
} from "../../services/pagosService";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { DatosTarjeta } from "../../utils/tarjeta";
import { usePuedeVender } from "../../hooks/usePuedeVender";

const CANVAS_WIDTH = 412;

const ENTREGAS: { value: EntregaCompra; detalle: string }[] = [
  { value: "domicilio", detalle: "Domicilio" },
  { value: "local", detalle: "Retiro en el local" },
];

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "Efectivo", label: "EFECTIVO" },
  { value: "Tarjeta de crédito", label: `TARJETA DE CRÉDITO (+${COMISION_CREDITO * 100}% DE COMISIÓN)` },
  { value: "Tarjeta de débito", label: "TARJETA DE DÉBITO" },
  { value: "Mercado Pago", label: "MERCADO PAGO" },
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
  // `precio` ya trae el descuento aplicado; `precioOriginal` es el de lista.
  const subtotalOriginal = items.reduce(
    (acc, item) => acc + (item.precioOriginal ?? item.precio) * item.cantidad,
    0,
  );
  const descuentos = subtotalOriginal - subtotal;
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  // Al salir de la pantalla se descarta la compra directa pendiente.
  useFocusEffect(
    useCallback(() => limpiarCompraDirecta, [limpiarCompraDirecta]),
  );
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
  // Pago con tarjeta / Mercado Pago en curso: la compra ya está registrada (stock reservado).
  // Con tarjeta se abre el formulario propio; con Mercado Pago, el Checkout Pro.
  const [pago, setPago] = useState<{
    compra: CompraConfirmada;
    direccionEntrega: string;
    checkoutPro?: PagoIniciado;
  } | null>(null);
  const [verificandoPago, setVerificandoPago] = useState(false);

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
  const comision = calcularComision(medioPago, subtotal + envio);
  const total = subtotal + envio + comision;

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

      const conConexion = await hayConexion();
      if (!conConexion && esPagoOnline(medioPago)) {
        Toast.show({
          type: "error",
          text1: "Sin conexión",
          text2: `Para pagar con ${medioPago} necesitás Internet. También podés elegir efectivo.`,
        });
        return;
      }

      if (!conConexion) {
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

      if (esPagoOnline(medioPago)) {
        // La compra queda "pendiente de pago" hasta que el pago se apruebe.
        try {
          // Tarjetas: formulario propio. Mercado Pago: Checkout Pro.
          if (tipoTarjeta(medioPago)) {
            setPago({ compra, direccionEntrega });
          } else {
            const checkoutPro = await crearPagoMp(compra.compraid);
            setPago({ compra, direccionEntrega, checkoutPro });
          }
        } catch (error) {
          await cancelarPagoMp(compra.compraid).catch(() => undefined);
          operationKey.current = generarOperationKey();
          throw error;
        }
        return;
      }

      finalizarCompra(compra, direccionEntrega, "no_aplica");
    } catch (error) {
      const message = traducirError(error);
      Toast.show({ type: "error", text1: "Error en la compra", text2: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalizarCompra = (
    compra: CompraConfirmada,
    direccionEntrega: string,
    estadoPago: EstadoPago,
    cuotas?: { cuotas: number; interes: number },
  ) => {
    // Si usó una dirección nueva de entrega, queda guardada (no bloquea la compra).
    if (entrega === "domicilio") {
      guardarSiEsNueva(direccionEntrega, direcciones).catch(() => {});
    }

    if (!esCompraDirecta) {
      vaciarCarrito();
    }
    // Pantalla de confirmación con la orden y los datos de entrega (HU14).
    router.replace({
      pathname: ROUTES.purchaseConfirmed,
      params: {
        orden: String(compra.numero_orden),
        entrega,
        direccion: direccionEntrega,
        metodoPago: medioPago,
        estadoPago,
        envio: String(compra.envio ?? envio),
        comision: String(compra.comision ?? comision),
        cuotas: String(cuotas?.cuotas ?? 1),
        interes: String(cuotas?.interes ?? 0),
        total: String(compra.total ?? total),
      },
    });
  };

  /**
   * Termina el pago con Mercado Pago. `abandonar` = el comprador lo cerró o el pago
   * fue rechazado: se anula la compra salvo que Mercado Pago diga que ya se pagó.
   */
  const resolverPago = async (abandonar: boolean, retorno: RetornoPago | null = null) => {
    if (!pago || verificandoPago) {
      return;
    }

    try {
      setVerificandoPago(true);
      let estado = await verificarPagoMp(pago.compra.compraid);
      // Si Mercado Pago volvió con "aprobado" o "pendiente", el pago existe aunque todavía no figure.
      const enRevision = estado === "pendiente" && (retorno === "aprobado" || retorno === "pendiente");

      if (estado === "aprobado" || enRevision) {
        if (estado === "aprobado") {
          enviarCorreoCompra(pago.compra.compraid);
        }
        setPago(null);
        finalizarCompra(pago.compra, pago.direccionEntrega, estado);
        return;
      }

      // En la web "Ya pagué" sin pago registrado: se deja abierto para reintentar.
      if (!abandonar) {
        Toast.show({
          type: "info",
          text1: "Todavía no vemos el pago",
          text2: "Terminá el pago en la pestaña de Mercado Pago y volvé a intentar.",
        });
        return;
      }

      estado = await cancelarPagoMp(pago.compra.compraid);
      if (estado === "aprobado" || estado === "pendiente") {
        // Se acreditó (o quedó en revisión) justo antes de cancelar.
        setPago(null);
        finalizarCompra(pago.compra, pago.direccionEntrega, estado);
        return;
      }

      setPago(null);
      operationKey.current = generarOperationKey();
      Toast.show({
        type: "error",
        text1: retorno === "rechazado" ? "El pago fue rechazado" : "Pago cancelado",
        text2: "No se cobró nada. Podés intentar de nuevo o elegir otro medio de pago.",
      });
    } catch (error) {
      Toast.show({ type: "error", text1: "No pudimos confirmar el pago", text2: traducirError(error) });
    } finally {
      setVerificandoPago(false);
    }
  };

  /** Cobra con la tarjeta del formulario. Devuelve el motivo si no se pudo (null = pagado). */
  const pagarTarjeta = async (datos: DatosTarjeta) => {
    if (!pago) {
      return null;
    }

    try {
      setVerificandoPago(true);
      const resultado = await pagarConTarjeta(pago.compra.compraid, datos);
      const { estado, detalle } = resultado;

      if (estado === "aprobado" || estado === "pendiente") {
        if (estado === "aprobado") {
          enviarCorreoCompra(pago.compra.compraid);
        }
        setPago(null);
        // El total cobrado incluye el interés de las cuotas.
        finalizarCompra(
          { ...pago.compra, total: resultado.total ?? pago.compra.total },
          pago.direccionEntrega,
          estado,
          { cuotas: resultado.cuotas ?? datos.cuotas, interes: resultado.interes ?? 0 },
        );
        return null;
      }

      // El formulario muestra el motivo (un Toast quedaría tapado por el Modal).
      return detalle ?? "La tarjeta rechazó el pago. Probá con otra o elegí otro medio de pago.";
    } catch (error) {
      return traducirError(error);
    } finally {
      setVerificandoPago(false);
    }
  };

  /** El comprador cerró el formulario de tarjeta sin pagar: se anula la compra. */
  const cancelarTarjeta = async () => {
    if (!pago || verificandoPago) {
      return;
    }

    try {
      setVerificandoPago(true);
      const estado = await cancelarPagoTarjeta(pago.compra.compraid);
      if (estado === "aprobado" || estado === "pendiente") {
        setPago(null);
        finalizarCompra(pago.compra, pago.direccionEntrega, estado);
        return;
      }
      setPago(null);
      operationKey.current = generarOperationKey();
      Toast.show({
        type: "error",
        text1: "Pago cancelado",
        text2: "No se cobró nada. Podés intentar de nuevo o elegir otro medio de pago.",
      });
    } catch (error) {
      Toast.show({ type: "error", text1: "No pudimos cancelar el pago", text2: traducirError(error) });
    } finally {
      setVerificandoPago(false);
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

      <KeyboardAwareScrollView bottomOffset={24}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Forma de entrega</Text>
        {ENTREGAS.map((opcion) => (
          <Pressable
            key={opcion.value}
            testID={`checkout-entrega-${opcion.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: entrega === opcion.value }}
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
            testID={`checkout-pago-${medio.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: medioPago === medio.value }}
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
            <Text style={styles.summaryText}>{formatPrecio(subtotalOriginal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Descuentos</Text>
            <Text style={styles.summaryText}>{`-${formatPrecio(descuentos)}`}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Envío</Text>
            <Text style={styles.summaryText}>{envioTexto}</Text>
          </View>
          {comision > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>{`Comisión crédito (${COMISION_CREDITO * 100}%)`}</Text>
              <Text style={styles.summaryText} testID="checkout-comision">{formatPrecio(comision)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Impuestos</Text>
            <Text style={styles.summaryText}>$0</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalText}>TOTAL:</Text>
            <Text style={styles.totalText} testID="checkout-total">{formatPrecio(total)}</Text>
          </View>

          <Pressable
            testID="checkout-confirmar"
            accessibilityRole="button"
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
      </KeyboardAwareScrollView>

      {pago && !pago.checkoutPro ? (
        <FormularioTarjeta
          visible
          monto={Number(pago.compra.total)}
          tipo={medioPago === "Tarjeta de crédito" ? "credito" : "debito"}
          procesando={verificandoPago}
          onPagar={pagarTarjeta}
          onCancelar={() => void cancelarTarjeta()}
        />
      ) : null}

      <PagoMercadoPago
        pago={pago?.checkoutPro ?? null}
        verificando={verificandoPago}
        onRetorno={(retorno) => void resolverPago(retorno === "rechazado", retorno)}
        onCancelar={() => void resolverPago(true)}
      />

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
    // Elegido: fondo más oscuro y borde marcado (la sombra sola no se ve en Android).
    selected: {
      ...Shadow.selected,
      backgroundColor: Colors.tertiary,
      borderColor: Colors.primary,
      borderWidth: 2,
    },
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
