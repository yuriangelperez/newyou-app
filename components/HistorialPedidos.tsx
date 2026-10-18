import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, FontSize, Radius, Spacing } from "../constants/theme";
import { PedidoHistorial } from "../services/comprasService";

interface HistorialPedidosProps {
  titulo: string;
  textoVacio: string;
  cargar: () => Promise<PedidoHistorial[]>;
  /** Pedidos locales aún no sincronizados (sólo compras). */
  pendientes?: number;
  mostrarComprador?: boolean;
}

export function HistorialPedidos({
  titulo,
  textoVacio,
  cargar,
  pendientes = 0,
  mostrarComprador = false,
}: HistorialPedidosProps) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setCargando(true);
      cargar()
        .then((data) => {
          if (activo) {
            setPedidos(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (activo) {
            setError(err instanceof Error ? err.message : "No se pudo cargar.");
          }
        })
        .finally(() => {
          if (activo) {
            setCargando(false);
          }
        });

      return () => {
        activo = false;
      };
    }, [cargar]),
  );

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

      {cargando ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null}

      {!cargando && error ? <Text style={styles.error}>{error}</Text> : null}

      {!cargando && !error ? (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => String(item.compraid)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{textoVacio}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orden}>{`Orden #${item.numero_orden}`}</Text>
                <Text style={styles.total}>
                  {`$${item.total.toLocaleString("es-AR")}`}
                </Text>
              </View>
              <Text style={styles.meta}>
                {`${new Date(item.created_at).toLocaleDateString("es-AR")} · ${
                  item.entrega === "domicilio" ? "Envío a domicilio" : "Retiro en local"
                } · ${item.metodo_pago}`}
              </Text>
              {mostrarComprador && item.comprador ? (
                <Text style={styles.meta}>{`Comprador: ${item.comprador}`}</Text>
              ) : null}
              {item.items.map((it, index) => (
                <Text key={`${it.productoId}-${index}`} style={styles.item}>
                  {`${it.cantidad} x ${it.nombre}${it.talle ? ` (${it.talle}, ${it.color})` : ""}`}
                </Text>
              ))}
            </View>
          )}
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
  row: { flexDirection: "row", justifyContent: "space-between" },
  orden: {
    color: Colors.primary,
    fontSize: FontSize.lg,
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
});
