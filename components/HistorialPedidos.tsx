import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { Colors, FontSize, Radius, Spacing } from "../constants/theme";
import { confirmar } from "../services/confirmar";
import {
  cambiarEstadoPedido,
  EstadoPedido,
  marcarPedidoEnviado,
  Pedido,
  pedidoActivo,
  sePuedeCancelar,
  siguienteEstado,
  TEXTO_ESTADO,
} from "../services/pedidosService";

type Filtro = "activos" | "entregado" | "cancelado" | "todos";

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "activos", texto: "En curso" },
  { valor: "entregado", texto: "Entregados" },
  { valor: "cancelado", texto: "Cancelados" },
  { valor: "todos", texto: "Todos" },
];

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  pendiente: Colors.warning,
  confirmado: Colors.secondary,
  preparando: Colors.secondary,
  listo_para_retirar: Colors.primary,
  enviado: Colors.primary,
  entregado: Colors.success,
  cancelado: Colors.danger,
};

// Texto del botón que lleva al siguiente estado.
const ACCION_ESTADO: Partial<Record<EstadoPedido, string>> = {
  confirmado: "Confirmar pedido",
  preparando: "Empezar a preparar",
  listo_para_retirar: "Listo para retirar",
  enviado: "Marcar como enviado",
  entregado: "Marcar como entregado",
};

interface HistorialPedidosProps {
  titulo: string;
  textoVacio: string;
  cargar: () => Promise<Pedido[]>;
  /** "compra": el comprador sólo puede cancelar mientras está pendiente. "venta": avanza estados. */
  modo: "compra" | "venta";
  /** En ventas: si el usuario puede cambiar el estado de este pedido (la base lo vuelve a validar). */
  puedeCambiar?: (pedido: Pedido) => boolean;
  /** Pedidos locales aún no sincronizados (sólo compras). */
  pendientes?: number;
}

const formatPrecio = (valor: number) => `$${valor.toLocaleString("es-AR")}`;

export function HistorialPedidos({
  titulo,
  textoVacio,
  cargar,
  modo,
  puedeCambiar = () => false,
  pendientes = 0,
}: HistorialPedidosProps) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);
  // Datos del envío que se piden antes de marcar "enviado".
  const [enviando, setEnviando] = useState<number | null>(null);
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");

  const recargar = useCallback(async () => {
    try {
      const data = await cargar();
      setPedidos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar.");
    } finally {
      setCargando(false);
    }
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      void recargar();
    }, [recargar]),
  );

  const onEnviar = async (pedido: Pedido) => {
    if (!correo.trim()) {
      Toast.show({ type: "error", text1: "Indicá el correo o la mensajería" });
      return;
    }

    try {
      setProcesando(pedido.id);
      await marcarPedidoEnviado(pedido.id, correo, codigo);
      setEnviando(null);
      setCorreo("");
      setCodigo("");
      Toast.show({ type: "success", text1: "Pedido enviado" });
      await recargar();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "No se pudo marcar como enviado",
        text2: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setProcesando(null);
    }
  };

  const cambiar = async (pedido: Pedido, estado: EstadoPedido) => {
    if (estado === "cancelado") {
      const ok = await confirmar(
        "Cancelar pedido",
        `¿Cancelar el pedido de la orden #${pedido.numeroOrden}? El stock vuelve a quedar disponible.`,
        "Cancelar pedido",
      );
      if (!ok) return;
    }

    try {
      setProcesando(pedido.id);
      await cambiarEstadoPedido(pedido.id, estado);
      Toast.show({ type: "success", text1: `Pedido ${TEXTO_ESTADO[estado].toLowerCase()}` });
      await recargar();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "No se pudo cambiar el estado",
        text2: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setProcesando(null);
    }
  };

  const visibles = pedidos.filter((pedido) =>
    filtro === "todos" ? true : filtro === "activos" ? pedidoActivo(pedido.estado) : pedido.estado === filtro,
  );

  const renderPedido = ({ item }: { item: Pedido }) => {
    const siguiente = siguienteEstado(item);
    const gestiona = modo === "venta" && puedeCambiar(item);
    const puedeCancelar =
      modo === "venta" ? gestiona && sePuedeCancelar(item.estado) : item.estado === "pendiente";
    const ocupado = procesando === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.orden}>{`Orden #${item.numeroOrden}`}</Text>
          <Text style={[styles.estado, { color: COLOR_ESTADO[item.estado], borderColor: COLOR_ESTADO[item.estado] }]}>
            {TEXTO_ESTADO[item.estado]}
          </Text>
        </View>
        <Text style={styles.meta}>
          {`${new Date(item.createdAt).toLocaleDateString("es-AR")} · ${
            item.entrega === "domicilio" ? "Envío a domicilio" : "Retiro en local"
          } · ${item.metodoPago}`}
        </Text>
        <Text style={styles.meta}>
          {modo === "compra" ? `Vendedor: ${item.vendedor ?? "—"}` : `Comprador: ${item.comprador ?? "—"}`}
        </Text>
        {item.direccionEntrega ? (
          <Text style={styles.meta}>
            {`${item.entrega === "domicilio" ? "Entregar en" : "Retirar en"}: ${item.direccionEntrega}`}
          </Text>
        ) : null}

        {item.empresaEnvio ? (
          <Text style={styles.meta}>
            {`Envío por ${item.empresaEnvio}${item.codigoSeguimiento ? ` · seguimiento ${item.codigoSeguimiento}` : ""}`}
          </Text>
        ) : null}

        {item.items.map((it, index) => (
          <Text key={`${it.productoId}-${index}`} style={styles.item}>
            {`${it.cantidad} x ${it.nombre}${it.talle ? ` (${it.talle}${it.color ? `, ${it.color}` : ""})` : ""}`}
          </Text>
        ))}

        <View style={styles.row}>
          <Text style={styles.meta}>{item.envio > 0 ? `Envío ${formatPrecio(item.envio)}` : "Envío gratis"}</Text>
          <Text style={styles.total}>{formatPrecio(item.total)}</Text>
        </View>

        {gestiona && siguiente === "enviado" && enviando === item.id ? (
          <View style={styles.envioForm}>
            <TextInput
              value={correo}
              onChangeText={setCorreo}
              placeholder="Correo o mensajería (Andreani, OCA, moto...)"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              placeholder="Código de seguimiento (opcional)"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setEnviando(null)}>
                <Text style={styles.link}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={ocupado}
                onPress={() => void onEnviar(item)}
                style={[styles.primaryButton, ocupado && styles.disabled]}
              >
                <Text style={styles.primaryText}>Confirmar envío</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {(gestiona || puedeCancelar) && enviando !== item.id ? (
          <View style={styles.actions}>
            {gestiona && siguiente ? (
              <Pressable
                disabled={ocupado}
                onPress={() => (siguiente === "enviado" ? setEnviando(item.id) : void cambiar(item, siguiente))}
                style={[styles.primaryButton, ocupado && styles.disabled]}
              >
                {ocupado ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.primaryText}>{ACCION_ESTADO[siguiente]}</Text>
                )}
              </Pressable>
            ) : null}
            {puedeCancelar ? (
              <Pressable disabled={ocupado} onPress={() => void cambiar(item, "cancelado")}>
                <Text style={styles.cancelText}>Cancelar pedido</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Pressable onPress={() => setAbierto(abierto === item.id ? null : item.id)}>
          <Text style={styles.link}>{abierto === item.id ? "Ocultar historial" : "Ver historial"}</Text>
        </Pressable>
        {abierto === item.id
          ? item.eventos.map((evento, index) => (
              <Text key={`${evento.fecha}-${index}`} style={styles.evento}>
                {`${new Date(evento.fecha).toLocaleString("es-AR")} · ${TEXTO_ESTADO[evento.estado]}${
                  evento.actor ? ` · ${evento.actor}` : ""
                }${evento.nota ? ` · ${evento.nota}` : ""}`}
              </Text>
            ))
          : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>{titulo}</Text>
      </View>

      {pendientes > 0 ? (
        <Text style={styles.pendientes}>
          {`${pendientes} compra(s) pendiente(s) de sincronizar`}
        </Text>
      ) : null}

      <View style={styles.chips}>
        {FILTROS.map((opcion) => {
          const activo = filtro === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setFiltro(opcion.valor)}
              style={[styles.chip, activo && styles.chipActive]}
            >
              <Text style={[styles.chipText, activo && styles.chipTextActive]}>{opcion.texto}</Text>
            </Pressable>
          );
        })}
      </View>

      {cargando ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null}

      {!cargando && error ? <Text style={styles.error}>{error}</Text> : null}

      {!cargando && !error ? (
        <FlatList
          data={visibles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{pedidos.length === 0 ? textoVacio : "No hay pedidos en este estado."}</Text>}
          renderItem={renderPedido}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: Spacing.md,
    padding: Spacing.md,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: {
    color: Colors.secondary,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_600SemiBold",
  },
  title: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontFamily: "Montserrat_700Bold",
  },
  pendientes: {
    marginHorizontal: Spacing.md,
    color: Colors.warning,
    fontSize: FontSize.sm,
    fontFamily: "Montserrat_600SemiBold",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, paddingHorizontal: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  chipActive: { backgroundColor: Colors.secondary },
  chipText: { color: Colors.secondary, fontSize: FontSize.sm, fontFamily: "Montserrat_600SemiBold" },
  chipTextActive: { color: Colors.white },
  loader: { marginTop: Spacing.xl },
  error: {
    margin: Spacing.md,
    color: Colors.danger,
    fontFamily: "Montserrat_500Medium",
  },
  list: { padding: Spacing.md, rowGap: Spacing.md },
  empty: {
    textAlign: "center",
    marginTop: Spacing.xl,
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_500Medium",
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    rowGap: Spacing.xs,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orden: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontFamily: "Montserrat_700Bold",
  },
  estado: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: Radius.full,
    fontSize: FontSize.sm,
    fontFamily: "Montserrat_700Bold",
  },
  total: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontFamily: "Montserrat_700Bold",
  },
  meta: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontFamily: "Montserrat_500Medium",
  },
  item: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_500Medium",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: Colors.white, fontSize: FontSize.md, fontFamily: "Montserrat_700Bold" },
  cancelText: { color: Colors.danger, fontSize: FontSize.md, fontFamily: "Montserrat_700Bold" },
  disabled: { opacity: 0.55 },
  link: { color: Colors.secondary, fontSize: FontSize.sm, fontFamily: "Montserrat_700Bold", marginTop: Spacing.xs },
  envioForm: { rowGap: Spacing.sm, marginTop: Spacing.xs },
  input: {
    minHeight: 42,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: "Montserrat_400Regular",
  },
  evento: { color: Colors.textMuted, fontSize: FontSize.sm, fontFamily: "Montserrat_500Medium" },
});
