import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { FilaDeslizable } from "../components/FilaDeslizable";
import { Colors, Radius, Spacing } from "../constants/theme";
import { ROUTES } from "../constants/routes";
import { selectEmpresaActiva, useEmpresaStore } from "../stores/useEmpresaStore";
import { usePuedeVender } from "../hooks/usePuedeVender";
import { useMisProductos } from "../hooks/useMisProductos";
import { deleteProducto, DIAS_BORRADOR } from "../services/productosService";
import { traducirError } from "../services/erroresSupabase";
import {
  Borrador,
  descartarBorrador,
  leerBorradoresDePublicaciones,
} from "../services/offlineService";
import { confirmar } from "../services/confirmar";
import { calcularPrecioFinal, Producto } from "../types";

const backIcon = require("../assets/images/product-detail/back.png");

// FlashList no admite `gap` en el contenedor: el espacio va como separador.
const Separador = () => <View style={styles.separador} />;

type BorradorLocal = Exclude<Borrador, { tipo: "compra" }>;
type Fila =
  | { clave: string; tipo: "producto"; producto: Producto }
  | { clave: string; tipo: "local"; borrador: BorradorLocal };

/** "Vence en 3 días" para un borrador guardado en la base. */
function textoVencimiento(vence?: string | null) {
  if (!vence) return `Se guarda ${DIAS_BORRADOR} días`;
  const dias = Math.ceil((new Date(vence).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "Vence hoy";
  return dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
}

export default function MisPublicacionesScreen() {
  const router = useRouter();

  const puedeVender = usePuedeVender();
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);

  const {
    productos,
    cargando,
    refreshing,
    error,
    refrescar,
  } = useMisProductos(empresaActiva?.empresaId ?? null);
  const { vista: vistaInicial } = useLocalSearchParams<{ vista?: string }>();
  const [vista, setVista] = useState<"publicadas" | "borradores">(
    vistaInicial === "borradores" ? "borradores" : "publicadas",
  );
  // Altas y ediciones guardadas sin conexión (todavía no llegaron a la base).
  const [borradoresLocales, setBorradoresLocales] = useState<BorradorLocal[]>([]);

  const cargarBorradoresLocales = useCallback(async () => {
    const lista = await leerBorradoresDePublicaciones();
    const empresaId = empresaActiva?.empresaId ?? null;
    setBorradoresLocales(lista.filter((item) => (item.payload.empresa?.empresaId ?? null) === empresaId));
  }, [empresaActiva?.empresaId]);

  useFocusEffect(
    useCallback(() => {
      void refrescar();
      void cargarBorradoresLocales();
    }, [refrescar, cargarBorradoresLocales]),
  );

  const publicadas = useMemo(() => productos.filter((item) => item.estado !== "borrador"), [productos]);
  const filas: Fila[] = useMemo(
    () =>
      vista === "publicadas"
        ? publicadas.map((producto) => ({ clave: producto.id, tipo: "producto", producto }))
        : [
            ...borradoresLocales.map((borrador) => ({ clave: borrador.id, tipo: "local" as const, borrador })),
            ...productos
              .filter((item) => item.estado === "borrador")
              .map((producto) => ({ clave: producto.id, tipo: "producto" as const, producto })),
          ],
    [borradoresLocales, productos, publicadas, vista],
  );
  const cantidadBorradores = productos.length - publicadas.length + borradoresLocales.length;

  const handleDescartarLocal = async (borrador: BorradorLocal) => {
    const ok = await confirmar(
      "Descartar borrador",
      `¿Querés descartar "${borrador.payload.nombre}"? Todavía no se subió.`,
      "Descartar",
    );
    if (!ok) return;
    await descartarBorrador(borrador.id);
    await cargarBorradoresLocales();
  };

  const handleEliminar = async (producto: Producto) => {
    const ok = await confirmar(
      "Eliminar publicación",
      `¿Querés eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      "Eliminar",
    );
    if (!ok) {
      return;
    }
    try {
      await deleteProducto(producto.id);
      await refrescar();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "No se pudo eliminar la publicación",
        text2: traducirError(err),
      });
    }
  };

  const handleVer = (producto: Producto) => {
    router.push({ pathname: ROUTES.productDetail, params: { id: producto.id } });
  };

  const handleEditar = (producto: Producto) => {
    router.push({
      pathname: ROUTES.editProduct,
      params: {
        id: producto.id,
      },
    });
  };

  if (!puedeVender) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.center}>
          <Text style={styles.title}>
            Acceso no disponible
          </Text>

          <Text style={styles.message}>
            Esta sección es solamente para vendedores.
          </Text>

          <Pressable
            accessibilityLabel="Volver"
            style={styles.backIconButton}
            onPress={() => router.replace(ROUTES.home)}
          >
            <Image
              source={backIcon}
              style={styles.backIconImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (cargando && productos.length === 0) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={Colors.secondary}
          />

          <Text style={styles.message}>
            Cargando tus publicaciones...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && productos.length === 0) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.center}>
          <Text style={styles.title}>
            No se pudieron cargar
          </Text>

          <Text style={styles.message}>
            {error}
          </Text>

          <Pressable
            style={styles.backButton}
            onPress={() => void refrescar()}
          >
            <Text style={styles.backButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderFila = ({ item }: { item: Fila }) =>
    item.tipo === "local" ? renderBorradorLocal(item.borrador) : renderItem({ item: item.producto });

  const renderBorradorLocal = (borrador: BorradorLocal) => (
    <View style={styles.card} testID={`borrador-${borrador.id}`}>
      <View style={styles.productImagePlaceholder}>
        <Text style={styles.placeholderText}>Sin subir</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.productName} numberOfLines={2}>
          {borrador.payload.nombre}
        </Text>
        <Text style={styles.price}>${borrador.payload.precio.toLocaleString("es-AR")}</Text>
        <Text style={styles.stock}>
          {borrador.tipo === "edicion" ? "Edición pendiente" : "Alta pendiente"}: se sube al volver la conexión.
        </Text>
        {borrador.error ? <Text style={[styles.status, styles.statusUnavailable]}>{borrador.error}</Text> : null}
        <Text style={styles.status}>{textoVencimiento(new Date(borrador.creadoEn + DIAS_BORRADOR * 86_400_000).toISOString())}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.deleteButton} onPress={() => void handleDescartarLocal(borrador)}>
          <Text style={styles.deleteButtonText}>Descartar</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({
    item,
  }: {
    item: Producto;
  }) => (
    <FilaDeslizable onEliminar={() => handleEliminar(item)}>
    <View style={styles.card} testID={`publicacion-${item.id}`}>
      <Pressable accessibilityLabel={`Ver ${item.nombre}`} onPress={() => handleVer(item)}>
        {item.imagen ? (
          <Image
            source={{ uri: item.imagen }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.placeholderText}>
              Sin imagen
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.info}>
        <Pressable onPress={() => handleVer(item)}>
          <Text
            style={styles.productName}
            numberOfLines={2}
          >
            {item.nombre}
          </Text>
        </Pressable>

        {item.descuentoPorcentaje > 0 ? (
          <Text style={styles.discountLabel}>
            -{item.descuentoPorcentaje}% de descuento
          </Text>
        ) : null}
        {item.descuentoPorcentaje > 0 ? (
          <Text style={styles.originalPrice}>
            ${item.precio.toLocaleString("es-AR")}
          </Text>
        ) : null}
        <Text style={styles.price}>
          ${calcularPrecioFinal(item).toLocaleString("es-AR")}
        </Text>

        <Text style={styles.stock}>
          Stock: {item.stock}
        </Text>

        {item.estado === "borrador" ? (
          <Text style={[styles.status, styles.statusUnavailable]}>
            Borrador sin foto · {textoVencimiento(item.borradorVence)}
          </Text>
        ) : (
          <Text
            style={[
              styles.status,
              item.disponible
                ? styles.statusAvailable
                : styles.statusUnavailable,
            ]}
          >
            {item.disponible
              ? "Disponible"
              : "Agotado"}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.editButton}
          onPress={() => handleEditar(item)}
        >
          <Text style={styles.editButtonText}>
            {item.estado === "borrador" ? "Completar" : "Editar"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={() => handleEliminar(item)}
        >
          <Text style={styles.deleteButtonText}>
            Eliminar
          </Text>
        </Pressable>
      </View>
    </View>
    </FilaDeslizable>
  );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backIconButton}
            onPress={() => router.back()}
            accessibilityLabel="Volver"
          >
            <Image
              source={backIcon}
              style={styles.backIconImage}
              resizeMode="contain"
            />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>
              {empresaActiva ? `Publicaciones de ${empresaActiva.nombre}` : "Mis publicaciones"}
            </Text>

            <Text style={styles.counter}>
              {publicadas.length}{" "}
              {publicadas.length === 1
                ? "publicación"
                : "publicaciones"}
            </Text>
          </View>

          <Pressable
            style={styles.newButton}
            onPress={() =>
              router.push(ROUTES.newProduct)
            }
          >
            <Text style={styles.newButtonText}>
              + Nueva
            </Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(["publicadas", "borradores"] as const).map((opcion) => (
            <Pressable
              key={opcion}
              testID={`tab-${opcion}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === opcion }}
              onPress={() => setVista(opcion)}
              style={[styles.tab, vista === opcion && styles.tabActiva]}>
              <Text style={[styles.tabTexto, vista === opcion && styles.tabTextoActiva]}>
                {opcion === "publicadas" ? `Publicadas (${publicadas.length})` : `Borradores (${cantidadBorradores})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {vista === "borradores" && filas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tenés borradores</Text>
            <Text style={styles.message}>
              Acá aparecen las prendas sin foto y las que guardaste sin conexión. Se guardan {DIAS_BORRADOR} días.
            </Text>
          </View>
        ) : filas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Todavía no tenés publicaciones
            </Text>

            <Text style={styles.message}>
              Creá tu primera publicación para comenzar
              a vender.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push(ROUTES.newProduct)
              }
            >
              <Text style={styles.primaryButtonText}>
                Publicar prenda
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={filas}
            keyExtractor={(item) => item.clave}
            renderItem={renderFila}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={Separador}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void refrescar()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  container: {
    flex: 1,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: 14,
    paddingBottom: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  backIconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  backIconImage: {
    width: 25,
    height: 25,
  },

  headerTitleContainer: {
    flex: 1,
  },

  title: {
    color: Colors.textStrong,
    fontSize: 23,
    fontWeight: "700",
  },

  counter: {
    marginTop: 3,
    color: Colors.textEarth,
    fontSize: 13,
  },

  list: {
    paddingTop: 2,
    paddingBottom: 24,
  },
  separador: { height: Spacing.sm },

  tabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActiva: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabTexto: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
  },
  tabTextoActiva: {
    color: Colors.onPrimary,
  },

  card: {
    backgroundColor: Colors.chip,
    borderRadius: Radius.md,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 110,
  },

  productImage: {
    width: 82,
    height: 82,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
  },

  productImagePlaceholder: {
    width: 82,
    height: 82,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: Colors.textStrong,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  info: {
    flex: 1,
    paddingHorizontal: 10,
  },

  productName: {
    color: Colors.textStrong,
    fontSize: 15,
    fontWeight: "700",
  },

  price: {
    marginTop: 5,
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: "700",
  },

  discountLabel: {
    marginTop: 6,
    color: "#B84A39",
    fontSize: 12,
    fontWeight: "700",
  },

  originalPrice: {
    marginTop: 4,
    color: Colors.textEarthMuted,
    fontSize: 12,
    textDecorationLine: "line-through",
  },

  stock: {
    marginTop: 3,
    color: Colors.textEarth,
    fontSize: 13,
  },

  status: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },

  statusAvailable: {
    color: "#4D7A43",
  },

  statusUnavailable: {
    color: "#B33A3A",
  },

  actions: {
    gap: 7,
  },

  editButton: {
    minWidth: 70,
    minHeight: 35,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  editButtonText: {
    color: Colors.textStrong,
    fontSize: 12,
    fontWeight: "700",
  },

  deleteButton: {
    minWidth: 70,
    minHeight: 35,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: "#B33A3A",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  newButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  newButtonText: {
    color: Colors.textStrong,
    fontSize: 14,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 30,
  },

  message: {
    marginTop: 8,
    color: Colors.textEarth,
    fontSize: 14,
    textAlign: "center",
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 30,
  },

  emptyTitle: {
    color: Colors.textStrong,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  primaryButton: {
    marginTop: Spacing.md,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: Colors.textStrong,
    fontSize: 14,
    fontWeight: "700",
  },

  backButton: {
    marginTop: Spacing.md,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.sm,
    backgroundColor: Colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  backButtonText: {
    color: Colors.textStrong,
    fontSize: 14,
    fontWeight: "700",
  },
});
