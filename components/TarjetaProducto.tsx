import React, { useMemo } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "../constants/theme";
import { useCarritoStore } from "../stores/useCarritoStore";
import { calcularPrecioFinal, Producto } from "../types";

interface TarjetaProductoProps {
  producto: Producto;
  scale: number;
  isAdded?: boolean;
  addButtonScale?: Animated.Value;
  onPressProducto: (producto: Producto) => void;
  onPressAgregar: (producto: Producto) => void;
  cardWidth?: number;
  imageHeight?: number;
}

export default function TarjetaProducto({
  producto,
  scale,
  isAdded = false,
  addButtonScale,
  onPressProducto,
  onPressAgregar,
  cardWidth,
  imageHeight,
}: TarjetaProductoProps) {
  const styles = useMemo(() => createStyles(scale), [scale]);
  const productoEnCarrito = useCarritoStore((state) =>
    state.items.some((item) => item.productoId === producto.id),
  );
  const eliminarProducto = useCarritoStore((state) => state.eliminarProducto);
  const agregado = productoEnCarrito;
  const precioFinal = calcularPrecioFinal(producto);
  const tieneDescuento = producto.descuentoPorcentaje > 0;

  const onPressAccion = () => {
    if (productoEnCarrito) {
      useCarritoStore
        .getState()
        .items.filter((item) => item.productoId === producto.id)
        .forEach((item) => eliminarProducto(item.key));
      return;
    }

    onPressAgregar(producto);
  };

  return (
    <Pressable
      accessibilityLabel={`Ver ${producto.nombre}`}
      onPress={() => onPressProducto(producto)}
      style={[
        styles.card,
        cardWidth ? { width: cardWidth } : undefined,
        !producto.disponible && styles.cardDisabled,
      ]}
    >
      {producto.imagen ? (
        <Image
          source={{ uri: producto.imagen }}
          style={[styles.image, imageHeight ? { height: imageHeight } : undefined]}
        />
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            imageHeight ? { height: imageHeight } : undefined,
          ]}
        />
      )}

      {tieneDescuento ? (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{producto.descuentoPorcentaje}%
          </Text>
        </View>
      ) : null}

      <Text numberOfLines={2} style={styles.title}>
        {producto.nombre}
      </Text>

      <View style={styles.footer}>
        <View>
          {tieneDescuento ? (
            <Text style={styles.originalPrice}>
              ${producto.precio.toLocaleString("es-AR")}
            </Text>
          ) : null}
          <Text style={styles.price}>${precioFinal.toLocaleString("es-AR")}</Text>
        </View>

        <Pressable
          accessibilityLabel={
            agregado
              ? `Quitar ${producto.nombre}`
              : `Agregar ${producto.nombre}`
          }
          disabled={!producto.disponible}
          onPress={onPressAccion}
        >
          <Animated.View
            style={[
              styles.action,
              !producto.disponible && styles.actionDisabled,
              agregado && styles.actionAdded,
              addButtonScale
                ? { transform: [{ scale: addButtonScale }] }
                : undefined,
            ]}
          >
            <Text style={styles.actionText}>
              {producto.disponible
                ? agregado
                  ? "Agregado"
                  : "Agregar"
                : "Agotado"}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </Pressable>
  );
}

function createStyles(scale: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    card: {
      width: s(175),
      minHeight: s(180),
      borderRadius: s(10),
      backgroundColor: "#E4E0E1",
      paddingHorizontal: s(12),
      paddingTop: s(10),
      paddingBottom: s(12),
    },
    cardDisabled: {
      opacity: 0.62,
    },
    image: {
      width: "100%",
      height: s(100),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
    },
    imagePlaceholder: {
      width: "100%",
      height: s(100),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
    },
    discountBadge: {
      position: "absolute",
      top: s(10),
      left: s(10),
      paddingHorizontal: s(7),
      paddingVertical: s(4),
      borderRadius: s(6),
      backgroundColor: "#B84A39",
    },
    discountText: {
      color: "#FFFFFF",
      fontSize: s(10),
      fontWeight: "700",
    },
    title: {
      marginTop: s(8),
      minHeight: s(34),
      color: "#2D1F16",
      fontSize: s(12),
      lineHeight: s(16),
      fontWeight: "500",
    },
    footer: {
      marginTop: s(4),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    price: {
      color: Colors.secondary,
      fontSize: s(17),
      lineHeight: s(20),
      fontWeight: "700",
    },
    originalPrice: {
      color: "#8A7B73",
      fontSize: s(10),
      lineHeight: s(12),
      textDecorationLine: "line-through",
    },
    action: {
      minWidth: s(61),
      height: s(20),
      paddingHorizontal: s(10),
      borderRadius: s(100),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.secondary,
    },
    actionAdded: {
      backgroundColor: "#87B279",
    },
    actionDisabled: {
      backgroundColor: "#9C928D",
    },
    actionText: {
      color: "#2D1F16",
      fontSize: s(8),
      lineHeight: s(10),
      fontWeight: "700",
    },
  });
}
