import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { Colors, Radius, Spacing } from "../constants/theme";
import { ROUTES } from "../constants/routes";
import { useUsuarioStore } from "../stores/useUsuarioStore";
import { useMisProductos } from "../hooks/useMisProductos";
import { deleteProducto } from "../services/productosService";
import { Producto } from "../types";
import { calcularPrecioFinal } from "../types";

const backIcon = require("../assets/images/product-detail/back.png");

export default function MisPublicacionesScreen() {
  const router = useRouter();

  const usuario = useUsuarioStore((state) => state.usuario);

  const {
    productos,
    cargando,
    refreshing,
    error,
    refrescar,
  } = useMisProductos();

  useFocusEffect(
    useCallback(() => {
      void refrescar();
    }, [refrescar]),
  );

  const handleEliminar = (producto: Producto) => {
    Alert.alert(
      "Eliminar publicación",
      `¿Querés eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProducto(producto.id);
              await refrescar();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "No se pudo eliminar la publicación.",
              );
            }
          },
        },
      ],
    );
  };

  const handleEditar = (producto: Producto) => {
    router.push({
      pathname: ROUTES.editProduct,
      params: {
        id: producto.id,
      },
    });
  };

  if (usuario?.role !== "vendedor") {
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
            style={styles.backButton}
            onPress={() => router.replace(ROUTES.home)}
          >
            <Image
              source={backIcon}
              style={styles.backIcon}
              resizeMode="contain"
            />

            <Text style={styles.backButtonText}>
              Volver
            </Text>
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

  const renderItem = ({
    item,
  }: {
    item: Producto;
  }) => (
    <View style={styles.card}>
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

      <View style={styles.info}>
        <Text
          style={styles.productName}
          numberOfLines={2}
        >
          {item.nombre}
        </Text>

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
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.editButton}
          onPress={() => handleEditar(item)}
        >
          <Text style={styles.editButtonText}>
            Editar
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
              Mis publicaciones
            </Text>

            <Text style={styles.counter}>
              {productos.length}{" "}
              {productos.length === 1
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

        {productos.length === 0 ? (
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
          <FlatList
            data={productos}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
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
    color: "#2D1F16",
    fontSize: 23,
    fontWeight: "700",
  },

  counter: {
    marginTop: 3,
    color: "#5C514B",
    fontSize: 13,
  },

  list: {
    paddingTop: 2,
    paddingBottom: 24,
    gap: Spacing.sm,
  },

  card: {
    backgroundColor: "#E4E0E1",
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
    color: "#2D1F16",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  info: {
    flex: 1,
    paddingHorizontal: 10,
  },

  productName: {
    color: "#2D1F16",
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
    color: "#8A7B73",
    fontSize: 12,
    textDecorationLine: "line-through",
  },

  stock: {
    marginTop: 3,
    color: "#5C514B",
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
    color: "#2D1F16",
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
    color: "#2D1F16",
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
    color: "#5C514B",
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
    color: "#2D1F16",
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
    color: "#2D1F16",
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

  backIcon: {
    width: 22,
    height: 22,
  },

  backButtonText: {
    color: "#2D1F16",
    fontSize: 14,
    fontWeight: "700",
  },
});
