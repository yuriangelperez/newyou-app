import React, { memo, useMemo } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors, Radius } from "../constants/theme";
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

function TarjetaProductoBase({
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

  // El botón "Agregar" va al lado de la tarjeta tocable y no adentro: un botón
  // dentro de otro es HTML inválido en la web y el lector de pantalla no lo alcanza.
  return (
    <View
      style={[
        styles.card,
        cardWidth ? { width: cardWidth } : undefined,
        !producto.disponible && styles.cardDisabled,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver ${producto.nombre}`}
        testID={`tarjeta-producto-${producto.id}`}
        onPress={() => onPressProducto(producto)}
      >
        {producto.imagen ? (
          <Image
            accessibilityRole="image"
            accessibilityLabel={`Foto de ${producto.nombre}`}
            source={{ uri: producto.imagen }}
            style={[
              styles.image,
              imageHeight ? { height: imageHeight } : undefined,
            ]}
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

        {!producto.disponible ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>AGOTADO</Text>
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
            <Text style={styles.price}>
              ${calcularPrecioFinal(producto).toLocaleString("es-AR")}
            </Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        style={styles.actionButton}
        accessibilityRole="button"
        accessibilityState={{
          selected: agregado,
          disabled: !producto.disponible,
        }}
        testID={`agregar-producto-${producto.id}`}
        accessibilityLabel={
          agregado ? `Quitar ${producto.nombre}` : `Agregar ${producto.nombre}`
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
  );
}

// React.memo (Clase 9): al tipear en el buscador sólo se vuelven a dibujar las
// tarjetas cuyas props cambiaron; el padre pasa callbacks con useCallback.
const TarjetaProducto = memo(TarjetaProductoBase);
export default TarjetaProducto;

function createStyles(scale: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    card: {
      width: s(175),
      minHeight: s(180),
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.secondary,
      backgroundColor: Colors.surface,
      paddingHorizontal: s(12),
      paddingTop: s(10),
      paddingBottom: s(12),
    },
    discountBadge: {
      position: "absolute",
      top: s(6),
      left: s(6),
      paddingHorizontal: s(7),
      paddingVertical: s(4),
      borderRadius: s(6),
      backgroundColor: Colors.danger,
    },
    discountText: {
      color: Colors.white,
      fontSize: s(10),
      fontWeight: "700",
    },
    originalPrice: {
      color: Colors.textMuted,
      fontSize: s(10),
      lineHeight: s(12),
      textDecorationLine: "line-through",
    },
    soldOutBadge: {
      alignSelf: "flex-start",
      marginTop: s(4),
      paddingHorizontal: s(6),
      paddingVertical: s(2),
      borderRadius: s(4),
      backgroundColor: Colors.danger,
    },
    soldOutText: {
      color: Colors.white,
      fontSize: s(8),
      fontFamily: "Montserrat_700Bold",
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
    title: {
      marginTop: s(8),
      minHeight: s(34),
      color: Colors.textStrong,
      fontSize: s(12),
      lineHeight: s(16),
      fontWeight: "500",
    },
    footer: {
      marginTop: s(4),
      paddingRight: s(65),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    actionButton: {
      position: "absolute",
      right: s(12),
      bottom: s(12),
    },
    price: {
      color: Colors.secondary,
      fontSize: s(17),
      lineHeight: s(20),
      fontWeight: "700",
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
      color: Colors.white,
      fontSize: s(8),
      lineHeight: s(10),
      fontWeight: "700",
    },
  });
}
