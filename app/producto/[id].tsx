import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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

import { BotonFavorito } from "../../components/BotonFavorito";
import { BottomTabBar } from "../../components/BottomTabBar";
import { ErrorView } from "../../components/ui/ErrorView";
import { ResumenReputacion } from "../../components/ui/Estrellas";
import { NombreVendedor } from "../../components/ui/NombreVendedor";
import { SkeletonList } from "../../components/ui/SkeletonList";
import { BRANDING_LOGO, PRODUCT_DETAIL_ICONS } from "../../constants/assets";
import { resolveProductColorHex } from "../../constants/productColors";
import { ROUTES } from "../../constants/routes";
import { Colors, EstiloBarraEstado } from "../../constants/theme";
import { useProductoById } from "../../hooks/useProductoById";
import { deleteProducto } from "../../services/productosService";
import { confirmar } from "../../services/confirmar";
import { obtenerReputacionProducto } from "../../services/pedidosService";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeGestionarProducto, usePuedeVender } from "../../hooks/usePuedeVender";
import { useEsEscritorio } from "../../hooks/useEsEscritorio";
import { useFavoritosStore } from "../../stores/useFavoritosStore";
import { calcularPrecioFinal } from "../../types";

const CANVAS_WIDTH = 412;

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const setCompraDirecta = useCarritoStore((state) => state.setCompraDirecta);
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = usePuedeVender();
  const { producto, cargando, error, refrescar } = useProductoById(id);
  const puedeGestionar = usePuedeGestionarProducto(producto);

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  // En la web de escritorio: fotos a la izquierda y datos a la derecha.
  const esEscritorio = useEsEscritorio();
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom, esEscritorio),
    [canvasWidth, insets.bottom, insets.top, scale, esEscritorio],
  );

  // Sólo lo que cargó el vendedor: no se inventan talles ni colores.
  const talles = useMemo(() => producto?.talle ?? [], [producto]);
  const colores = useMemo(() => producto?.colores ?? [], [producto]);
  const galleryImages = useMemo(() => {
    const imagenes = producto?.imagenes?.filter(Boolean) ?? [];
    if (imagenes.length > 0) {
      return imagenes;
    }
    return producto?.imagen ? [producto.imagen] : [];
  }, [producto]);
  const detailItems = useMemo(
    () =>
      producto
        ? [
            producto.descripcion,
            talles.length > 0
              ? `Talles disponibles: ${talles.join(", ")}.`
              : "Talle no indicado por el vendedor.",
            producto.disponible
              ? "Disponible para compra inmediata."
              : "Producto agotado por el momento.",
          ]
        : [],
    [producto, talles],
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(talles[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(colores[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const isFavorite = useFavoritosStore((state) =>
    producto ? state.favoritos.some((item) => item.id === producto.id) : false,
  );
  const toggleFavorito = useFavoritosStore((state) => state.toggleFavorito);
  const [purchaseFeedback, setPurchaseFeedback] = useState(false);
  const purchaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reputacion, setReputacion] = useState<{ promedio: number | null; cantidad: number } | null>(null);

  // Opiniones de los pedidos entregados que incluyeron esta prenda.
  useEffect(() => {
    if (!producto?.id) {
      return;
    }

    let vigente = true;
    obtenerReputacionProducto(producto.id).then((datos) => vigente && setReputacion(datos));
    return () => {
      vigente = false;
    };
  }, [producto?.id]);

  // Al cambiar de prenda se reinician las elecciones. Se hace durante el render
  // (no en un efecto) para no dibujar dos veces; antes el efecto dependía de
  // `colores`, que es un arreglo nuevo en cada render, y pisaba el color elegido.
  const [productoMostradoId, setProductoMostradoId] = useState(producto?.id);
  if (producto && producto.id !== productoMostradoId) {
    setProductoMostradoId(producto.id);
    setSelectedImageIndex(0);
    setSelectedSize(talles[0] ?? "");
    setSelectedColor(colores[0] ?? "");
    setQuantity(1);
  }

  useEffect(
    () => () => {
      if (purchaseTimerRef.current) {
        clearTimeout(purchaseTimerRef.current);
      }
    },
    [],
  );

  // Empresa: su tienda. Particular: su página con todas sus publicaciones.
  const verVendedor = () => {
    if (!producto?.vendedor) {
      return;
    }

    if (producto.vendedor.tipo === "empresa" && producto.vendedor.slug) {
      router.push({ pathname: ROUTES.store, params: { slug: producto.vendedor.slug } });
    } else if (producto.creadoPor) {
      router.push({ pathname: ROUTES.seller, params: { id: producto.creadoPor } });
    }
  };

  const toggleFavorite = () => {
    if (producto) {
      toggleFavorito(producto);
    }
  };

  // Valida stock/cantidad antes de agregar al carrito o comprar directo.
  const puedeComprar = () => {
    if (!producto || !producto.disponible) {
      return false;
    }

    if (producto.stock <= 0) {
      Toast.show({ type: "info", text1: "Sin stock", text2: "Este producto no tiene unidades disponibles." });
      return false;
    }

    if (quantity > producto.stock) {
      Toast.show({
        type: "info",
        text1: "Stock insuficiente",
        text2: `Solo quedan ${producto.stock} unidades disponibles.`,
      });
      return false;
    }

    return true;
  };

  const onPressAgregarAlCarrito = () => {
    if (!producto || !puedeComprar()) {
      return;
    }

    agregarProducto({
      producto,
      talle: selectedSize,
      color: selectedColor,
      cantidad: quantity,
    });

    setPurchaseFeedback(true);
    if (purchaseTimerRef.current) {
      clearTimeout(purchaseTimerRef.current);
    }
    purchaseTimerRef.current = setTimeout(
      () => setPurchaseFeedback(false),
      900,
    );
  };

  // Compra sólo esta prenda (y cantidad), sin tocar el carrito.
  const onPressComprarAhora = () => {
    if (!producto || !puedeComprar()) {
      return;
    }

    setCompraDirecta({
      key: `directa::${producto.id}::${selectedSize}::${selectedColor}`,
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      categoria: producto.categoria,
      disponible: producto.disponible,
      stock: producto.stock,
      descripcion: producto.descripcion,
      talle: selectedSize,
      color: selectedColor,
      cantidad: quantity,
    });
    router.push(ROUTES.checkout);
  };

  const onPressEliminar = () => {
    if (!producto) {
      return;
    }

    // confirmar() también funciona en la web, donde Alert con botones no hace nada (BUG-05).
    void confirmar("Eliminar producto", "Esta acción no se puede deshacer.", "Eliminar").then(
      async (ok) => {
        if (!ok) {
          return;
        }
        try {
          await deleteProducto(producto.id);
          router.replace(ROUTES.home);
        } catch {
          Toast.show({ type: "error", text1: "No se pudo eliminar el producto." });
        }
      },
    );
  };

  if (cargando) {
    return (
      <View style={styles.screen}>
        <StatusBar style={EstiloBarraEstado} />
        <SkeletonList />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <StatusBar style={EstiloBarraEstado} />
        <ErrorView message={error} onRetry={() => void refrescar()} />
      </View>
    );
  }

  if (!producto) {
    return (
      <View style={styles.screen}>
        <StatusBar style={EstiloBarraEstado} />
        <ErrorView
          message="No encontramos este producto."
          onRetry={() => router.replace(ROUTES.home)}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style={EstiloBarraEstado} />

      <View style={styles.canvas}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.headerIconButton}
          >
            <Image
              source={PRODUCT_DETAIL_ICONS.back}
              style={styles.headerIcon}
            />
          </Pressable>

          <Image
            accessibilityLabel="New You"
            source={BRANDING_LOGO}
            tintColor={Colors.textStrong}
            style={styles.logo}
          />

          <BotonFavorito
            activo={isFavorite}
            onToggle={toggleFavorite}
            style={styles.headerIconButton}
            iconStyle={styles.favoriteIcon}
          />
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.galleryColumn}>
          <View style={styles.carouselFrame}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const next = Math.round(
                  event.nativeEvent.contentOffset.x /
                    event.nativeEvent.layoutMeasurement.width,
                );
                setSelectedImageIndex(next);
              }}
            >
              {galleryImages.map((image, index) => (
                <Image
                  key={`${producto.id}-${index.toString()}`}
                  source={{ uri: image }}
                  style={styles.carouselImage}
                />
              ))}
            </ScrollView>
          </View>
          {galleryImages.length > 1 ? (
            <View style={styles.carouselDots}>
              {galleryImages.map((_, index) => (
                <View
                  key={`${producto.id}-dot-${index.toString()}`}
                  style={[
                    styles.carouselDot,
                    selectedImageIndex === index && styles.carouselDotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
          </View>

          <View style={styles.infoSection}>
            <Text numberOfLines={2} style={styles.productName}>
              {producto.nombre}
            </Text>
            {producto.descuentoPorcentaje > 0 ? (
              <>
                <Text style={styles.discountLabel}>
                  -{producto.descuentoPorcentaje}% de descuento
                </Text>
                <Text style={styles.originalPrice}>
                  ${producto.precio.toLocaleString("es-AR")}
                </Text>
              </>
            ) : null}
            <Text style={styles.price}>
              ${calcularPrecioFinal(producto).toLocaleString("es-AR")}
            </Text>
            {reputacion ? <ResumenReputacion promedio={reputacion.promedio} cantidad={reputacion.cantidad} /> : null}
            {producto.vendedor ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Ver publicaciones de ${producto.vendedor.nombre}`}
                onPress={verVendedor}
                style={styles.sellerRow}
              >
                <NombreVendedor
                  prefijo="Vendido por "
                  nombre={producto.vendedor.nombre}
                  verificada={producto.vendedor.verificada}
                  tamano={13 * scale}
                />
              </Pressable>
            ) : null}

            {talles.length > 0 ? (
            <View style={styles.sizeSelector}>
              <View style={styles.sizeLabelsRow}>
                {talles.map((size) => (
                  <Text key={`label-${size}`} style={styles.sizeLabel}>
                    {size}
                  </Text>
                ))}
              </View>

              <View style={styles.sizeChipsRow}>
                {talles.map((size) => {
                  const isSelected = size === selectedSize;

                  return (
                    <Pressable
                      key={size}
                      accessibilityLabel={`Seleccionar talle ${size}`}
                      onPress={() => setSelectedSize(size)}
                      style={[
                        styles.sizeChip,
                        isSelected && styles.sizeChipSelected,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            ) : null}

            {colores.length > 0 ? (
            <View style={styles.colorSelector}>
              <Text style={styles.colorLabel}>Color:</Text>
              <View style={styles.colorChipsRow}>
                {colores.map((color) => {
                  const isSelected = color === selectedColor;
                  return (
                    <Pressable
                      key={color}
                      accessibilityLabel={`Seleccionar color ${color}`}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorChip,
                        isSelected && styles.colorChipSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: resolveProductColorHex(
                              color,
                              Colors.secondary,
                            ),
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.selectedColorText}>
                Seleccionado: {selectedColor}
              </Text>
            </View>
            ) : null}

            <View style={styles.quantityRow}>
              <Pressable
                accessibilityLabel="Disminuir cantidad"
                onPress={() =>
                  setQuantity((current) => Math.max(current - 1, 1))
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </Pressable>

              <View style={styles.quantityValueBox}>
                <Text style={styles.quantityValueText}>{quantity}</Text>
              </View>

              <Pressable
                accessibilityLabel="Aumentar cantidad"
                onPress={() =>
                  setQuantity((current) =>
                    Math.min(current + 1, producto.stock),
                  )
                }
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.descriptionList}>
              {detailItems.map((item, index) => (
                <View
                  key={`${producto.id}-detail-${index.toString()}`}
                  style={styles.descriptionItem}
                >
                  <Text style={styles.bulletMarker}>{"\u2022"}</Text>
                  <Text style={styles.descriptionText}>{item}</Text>
                </View>
              ))}
            </View>

            {puedeGestionar ? (
              <View style={styles.adminActionsRow}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: ROUTES.editProduct,
                      params: { id: producto.id },
                    })
                  }
                  style={styles.adminButton}
                >
                  <Text style={styles.adminButtonText}>EDITAR</Text>
                </Pressable>
                <Pressable
                  onPress={onPressEliminar}
                  style={[styles.adminButton, styles.deleteButton]}
                >
                  <Text style={styles.adminButtonText}>ELIMINAR</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel="Agregar al carrito"
              onPress={onPressAgregarAlCarrito}
              disabled={!producto.disponible}
              style={[
                styles.buyButton,
                styles.cartButton,
                !producto.disponible && styles.buyButtonDisabled,
                purchaseFeedback && styles.buyButtonAdded,
              ]}
            >
              <Text style={[styles.buyButtonText, styles.cartButtonText]}>
                {producto.disponible
                  ? purchaseFeedback
                    ? "AGREGADO"
                    : "AGREGAR AL CARRITO"
                  : "AGOTADO"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Comprar ahora"
              onPress={onPressComprarAhora}
              disabled={!producto.disponible}
              style={[
                styles.buyButton,
                !producto.disponible && styles.buyButtonDisabled,
              ]}
            >
              <Text style={styles.buyButtonText}>COMPRAR AHORA</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <BottomTabBar
        activeTab="bag"
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

function createStyles(
  scale: number,
  canvasWidth: number,
  topInset: number,
  bottomInset: number,
  esEscritorio = false,
) {
  const s = (value: number) => value * scale;
  const foto = esEscritorio ? 440 : s(275);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    canvas: {
      flex: 1,
      width: "100%",
      maxWidth: esEscritorio ? 1100 : 600,
      alignSelf: "center",
      backgroundColor: Colors.background,
    },
    header: {
      paddingTop: topInset,
      height: topInset + s(76),
      paddingHorizontal: s(15),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: Colors.background,
      borderBottomWidth: s(2),
      borderBottomColor: Colors.secondary,
    },
    headerIconButton: {
      width: s(39),
      height: s(39),
      alignItems: "center",
      justifyContent: "center",
    },
    headerIcon: {
      width: s(39),
      height: s(39),
      resizeMode: "contain",
    },
    favoriteIcon: {
      width: s(38),
      height: s(38),
      resizeMode: "contain",
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: "contain",
    },
    scrollContent: {
      paddingTop: s(23),
      paddingBottom: (esEscritorio ? 48 : s(122)) + bottomInset,
      ...(esEscritorio
        ? { flexDirection: "row" as const, alignItems: "flex-start" as const, columnGap: 48, paddingHorizontal: 24 }
        : {}),
    },
    galleryColumn: esEscritorio ? { flexShrink: 0 } : {},
    carouselFrame: {
      width: foto,
      height: foto,
      alignSelf: "center",
      borderRadius: s(10),
      borderWidth: s(5),
      borderColor: Colors.secondary,
      backgroundColor: Colors.accentSoft,
      overflow: "hidden",
    },
    carouselImage: {
      width: foto,
      height: foto,
      resizeMode: "cover",
    },
    carouselDots: {
      marginTop: s(10),
      flexDirection: "row",
      alignSelf: "center",
      columnGap: s(8),
    },
    carouselDot: {
      width: s(8),
      height: s(8),
      borderRadius: s(4),
      backgroundColor: "rgba(45, 31, 22, 0.3)",
    },
    carouselDotActive: {
      backgroundColor: Colors.secondary,
    },
    infoSection: esEscritorio
      ? { flex: 1, maxWidth: 520 }
      : {
          marginTop: s(14),
          marginLeft: s(38),
          marginRight: s(38),
        },
    productName: {
      color: Colors.textStrong,
      fontSize: s(30),
      lineHeight: s(36),
      fontWeight: "600",
    },
    discountLabel: {
      marginTop: s(8),
      color: Colors.danger,
      fontSize: s(14),
      fontWeight: "700",
    },
    originalPrice: {
      marginTop: s(8),
      color: Colors.textMuted,
      fontSize: s(16),
      lineHeight: s(20),
      textDecorationLine: "line-through",
    },
    sellerRow: {
      marginTop: s(6),
      alignSelf: "flex-start",
    },
    price: {
      marginTop: s(8),
      color: Colors.secondary,
      fontSize: s(30),
      lineHeight: s(36),
      fontWeight: "700",
    },
    sizeSelector: {
      marginTop: s(18),
      alignSelf: "flex-start",
      rowGap: s(8),
    },
    sizeLabelsRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(8),
    },
    sizeLabel: {
      width: s(34),
      color: Colors.ink,
      textAlign: "center",
      fontSize: s(15),
      lineHeight: s(19),
      fontWeight: "500",
    },
    sizeChipsRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(8),
    },
    colorSelector: {
      marginTop: s(12),
      rowGap: s(6),
    },
    colorLabel: {
      color: Colors.textStrong,
      fontSize: s(14),
      lineHeight: s(16),
      fontWeight: "600",
    },
    colorChipsRow: {
      flexDirection: "row",
      columnGap: s(12),
    },
    colorChip: {
      width: s(34),
      height: s(34),
      borderRadius: s(17),
      borderWidth: s(2),
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.background,
    },
    colorChipSelected: {
      borderColor: Colors.secondary,
    },
    colorSwatch: {
      width: s(24),
      height: s(24),
      borderRadius: s(12),
      borderWidth: 1,
      borderColor: "rgba(45, 31, 22, 0.18)",
    },
    selectedColorText: {
      color: Colors.textMuted,
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: "500",
    },
    sizeChip: {
      width: s(34),
      height: s(34),
      borderRadius: s(10),
      backgroundColor: Colors.accentSoft,
      borderWidth: 1,
      borderColor: Colors.tertiary,
    },
    sizeChipSelected: {
      backgroundColor: Colors.secondary,
      borderColor: Colors.secondary,
    },
    quantityRow: {
      marginTop: s(24),
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(12),
    },
    quantityButton: {
      width: s(35),
      height: s(35),
      borderRadius: s(4),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.secondary,
    },
    quantityButtonText: {
      color: Colors.textStrong,
      fontSize: s(20),
      lineHeight: s(23),
      fontWeight: "400",
    },
    quantityValueBox: {
      width: s(47),
      height: s(38),
      borderRadius: s(4),
      borderWidth: s(2),
      borderColor: Colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.background,
    },
    quantityValueText: {
      color: Colors.textStrong,
      fontSize: s(20),
      lineHeight: s(23),
      fontWeight: "400",
    },
    descriptionList: {
      marginTop: s(17),
      rowGap: s(10),
      maxWidth: s(300),
    },
    descriptionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      columnGap: s(8),
    },
    bulletMarker: {
      marginTop: s(2),
      color: Colors.textStrong,
      fontSize: s(15),
      lineHeight: s(22),
    },
    descriptionText: {
      flex: 1,
      color: Colors.textStrong,
      fontSize: s(15),
      lineHeight: s(26),
      fontWeight: "500",
    },
    adminActionsRow: {
      marginTop: s(18),
      flexDirection: "row",
      columnGap: s(10),
    },
    adminButton: {
      flex: 1,
      minHeight: s(42),
      borderRadius: s(10),
      backgroundColor: Colors.tertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    deleteButton: {
      backgroundColor: "#F4B3B3",
    },
    adminButtonText: {
      color: Colors.textStrong,
      fontSize: s(13),
      fontFamily: "Montserrat_700Bold",
    },
    buyButton: {
      width: s(225),
      minHeight: s(48),
      marginTop: s(10),
      marginBottom: s(8),
      borderRadius: s(10),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.secondary,
      paddingVertical: s(8),
    },
    cartButton: {
      marginTop: s(18),
      marginBottom: 0,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.secondary,
    },
    cartButtonText: {
      color: Colors.primary,
      fontSize: s(16),
      lineHeight: s(20),
    },
    buyButtonDisabled: {
      opacity: 0.7,
    },
    buyButtonAdded: {
      backgroundColor: "#87B279",
    },
    buyButtonText: {
      color: Colors.white,
      fontSize: s(22),
      lineHeight: s(27),
      fontFamily: "Montserrat_700Bold",
      letterSpacing: s(0.4),
    },
  });
}
