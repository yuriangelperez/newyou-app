import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabBar } from "../../components/BottomTabBar";
import { ErrorView } from "../../components/ui/ErrorView";
import { SkeletonList } from "../../components/ui/SkeletonList";
import TarjetaProducto from "../../components/TarjetaProducto";
import { BRANDING_LOGO, HOME_HERO_IMAGES } from "../../constants/assets";
import { ROUTES } from "../../constants/routes";
import { Colors, EstiloBarraEstado } from "../../constants/theme";
import { useProductos } from "../../hooks/useProductos";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeVender } from "../../hooks/usePuedeVender";
import { Producto } from "../../types";
import { incluyeTexto } from "../../utils/texto";

const CANVAS_WIDTH = 412;
const MAX_CONTENT_WIDTH = 1160;
const HOME_TAGS = [
  "Todo",
  "Promociones",
  "Invierno",
  "Verano",
  "Otoño",
  "Primavera",
  "Todo el año",
];

const PRODUCT_CATEGORY_ALIASES: Record<string, string[]> = {
  Camisa: ["Camisas", "Torso"],
  Remera: ["Camisas", "Torso"],
  Campera: ["Camperas", "Torso"],
  Buzo: ["Buzos", "Torso"],
  Pantalón: ["Jeans", "Pantalones"],
  Torso: ["Torso"],
  Vestido: ["Vestidos"],
  Falda: ["Faldas", "Vestidos"],
  Short: ["Short", "Shorts"],
  Calzado: ["Botas", "Calzado"],
  Accesorio: ["Accesorios"],
  Interior: ["Interior"],
};

export default function HomeScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { productos, cargando, error, sinConexion, refreshing, refrescar } = useProductos();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const totalItems = useCarritoStore(selectTotalItems);
  const usuario = useUsuarioStore((state) => state.usuario);
  const puedeVender = usePuedeVender();

  const isDesktop = width >= 768;
  const containerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;

  const numColumns = useMemo(() => {
    if (width >= 960) return 4;
    if (width >= 640) return 3;
    return 2;
  }, [width]);

  const cardGap = 16;
  const horizontalPadding = isDesktop ? 20 : 16;
  const availableGridWidth =
    containerWidth - horizontalPadding * 2 - (numColumns - 1) * cardGap;
  const cardWidth = Math.max(Math.floor(availableGridWidth / numColumns), 150);
  const cardImageHeight = width >= 960 ? 160 : width >= 640 ? 140 : 110;

  const bannerWidth = isDesktop
    ? containerWidth - horizontalPadding * 2
    : containerWidth;
  const bannerHeight = isDesktop
    ? Math.min(Math.round(bannerWidth * 0.32), 290)
    : 150;

  const heroScrollRef = useRef<ScrollView>(null);

  const styles = useMemo(
    () =>
      createStyles({
        scale,
        containerWidth,
        bannerWidth,
        bannerHeight,
        horizontalPadding,
        isDesktop,
        topInset: insets.top,
        bottomInset: insets.bottom,
      }),
    [
      bannerHeight,
      bannerWidth,
      containerWidth,
      horizontalPadding,
      insets.bottom,
      insets.top,
      isDesktop,
      scale,
    ],
  );

  const [activeTag, setActiveTag] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const addedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const addButtonAnimationsRef = useRef<Record<string, Animated.Value>>({});

  useEffect(() => {
    return () => {
      Object.values(addedTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const selectedTag = HOME_TAGS[activeTag];
  const selectedCategory = Array.isArray(category) ? category[0] : category;

  const visibleProducts = useMemo(() => {
    const normalizedSearch = searchText.trim();

    const filtrados = productos.filter((item) => {
      const productType = item.categoriaProducto?.tipoPrenda ?? "";

      const productCategories = [
        item.categoria ?? "",
        ...(PRODUCT_CATEGORY_ALIASES[productType] ?? []),
      ];

      // Filtro por búsqueda: sin distinguir mayúsculas ni tildes ("pantalon" = "Pantalón").
      const matchesSearch =
        normalizedSearch.length === 0 ||
        incluyeTexto(item.nombre, normalizedSearch) ||
        incluyeTexto(item.descripcion, normalizedSearch) ||
        incluyeTexto(item.categoria, normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      // Filtro por categoría proveniente de navegación
      if (selectedCategory) {
        const matchesCategory = productCategories.some(
          (value) => value.toLowerCase() === selectedCategory.toLowerCase(),
        );

        if (!matchesCategory) {
          return false;
        }
      }

      if (selectedTag === "Todo") {
        return true;
      }

      if (selectedTag === "Promociones") {
        return item.descuentoPorcentaje > 0;
      }

      return item.categoriaProducto?.temporada === selectedTag;
    });

    // Las agotadas van al final (grises, con "AGOTADO") para no tapar lo que se puede comprar (CA2).
    return [...filtrados.filter((item) => item.disponible), ...filtrados.filter((item) => !item.disponible)];
  }, [
    productos,
    searchText,
    selectedCategory,
    selectedTag,
  ]);

  const getAddButtonAnimation = useCallback((productId: string) => {
    if (!addButtonAnimationsRef.current[productId]) {
      addButtonAnimationsRef.current[productId] = new Animated.Value(1);
    }
    return addButtonAnimationsRef.current[productId];
  }, []);

  // useCallback (Clase 9): referencias estables para no romper el React.memo de TarjetaProducto.
  const onPressAgregar = useCallback((item: Producto) => {
    if (!item.disponible) {
      return;
    }

    agregarProducto({
      producto: item,
      talle: item.talle?.[0] ?? "Único",
      // El primer color cargado de la prenda (antes iba siempre "Marron").
      color: item.colores?.[0] ?? "",
      cantidad: 1,
    });

    const animation = getAddButtonAnimation(item.id);
    setAddedProductId(item.id);

    if (addedTimersRef.current[item.id]) {
      clearTimeout(addedTimersRef.current[item.id]);
    }

    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1.08,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    addedTimersRef.current[item.id] = setTimeout(() => {
      setAddedProductId((current) => (current === item.id ? null : current));
    }, 900);
  }, [agregarProducto, getAddButtonAnimation]);

  const onPressProducto = useCallback(
    (producto: Producto) =>
      router.push({
        pathname: ROUTES.productDetail,
        params: { id: producto.id },
      }),
    [router],
  );

  const renderProductCard = useCallback(
    ({ item, index }: { item: Producto; index: number }) => {
      // FlashList reparte el ancho en columnas iguales; este margen deja cada
      // tarjeta donde la ubicaba la grilla con `gap` de la FlatList anterior.
      const columna = index % numColumns;
      const margenIzquierdo =
        horizontalPadding +
        columna * (cardWidth + cardGap) -
        (columna * containerWidth) / numColumns;

      return (
        <View style={[styles.productCell, { marginLeft: margenIzquierdo }]}>
          <TarjetaProducto
            producto={item}
            scale={scale}
            isAdded={addedProductId === item.id}
            addButtonScale={getAddButtonAnimation(item.id)}
            cardWidth={cardWidth}
            imageHeight={cardImageHeight}
            onPressProducto={onPressProducto}
            onPressAgregar={onPressAgregar}
          />
        </View>
      );
    },
    [
      addedProductId,
      cardImageHeight,
      cardWidth,
      containerWidth,
      getAddButtonAnimation,
      horizontalPadding,
      numColumns,
      onPressAgregar,
      onPressProducto,
      scale,
      styles.productCell,
    ],
  );

  return (
    <View style={styles.container}>
      <StatusBar style={EstiloBarraEstado} />

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerSide}>
            <Text numberOfLines={1} style={styles.userLabel}>
              {usuario ? `Hola, ${usuario.nombre}` : "Hola, invitado"}
            </Text>
          </View>
          <Image
            accessibilityLabel="New You"
            source={BRANDING_LOGO}
            tintColor={Colors.textStrong}
            style={styles.logo}
          />
          <View style={[styles.headerSide, styles.headerRightSide]} />
        </View>
      </View>

      {cargando ? <SkeletonList /> : null}

      {!cargando && error ? (
        <ErrorView
          title={sinConexion ? "Sin conexión a Internet" : undefined}
          message={error}
          onRetry={() => void refrescar()}
        />
      ) : null}

      {!cargando && !error ? (
        <View style={styles.listWrapper}>
        {/* FlashList (Clase 9): recicla las celdas en vez de crearlas y destruirlas. */}
        <FlashList
          key={`product-grid-${numColumns}`}
          data={visibleProducts}
          extraData={addedProductId}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshing={refreshing}
          onRefresh={() => void refrescar()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No hay prendas disponibles</Text>
              <Text style={styles.emptyText}>
                Publica una nueva prenda con el boton +.
              </Text>
            </View>
          }
          ListHeaderComponent={
            <>
              <View style={styles.searchOuter}>
                <View style={styles.searchContainer}>
                  <TextInput
                    testID="home-buscar"
                    accessibilityLabel="Buscar prendas"
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Buscar prendas..."
                    placeholderTextColor={Colors.textMuted}
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                </View>
              </View>

              <View style={styles.heroOuter}>
                <View style={styles.heroContainer}>
                  <ScrollView
                    ref={heroScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(
                        event.nativeEvent.contentOffset.x / bannerWidth,
                      );
                      setHeroIndex(nextIndex);
                    }}
                  >
                    {HOME_HERO_IMAGES.map((image, index) => (
                      <Image
                        key={index}
                        source={image}
                        style={styles.heroImage}
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.heroDots}>
                    {HOME_HERO_IMAGES.map((_, index) => (
                      <Pressable
                        key={index}
                        accessibilityLabel={`Ir a la imagen ${index + 1}`}
                        onPress={() => {
                          heroScrollRef.current?.scrollTo({
                            x: index * bannerWidth,
                            animated: true,
                          });
                          setHeroIndex(index);
                        }}
                        style={[
                          styles.heroDot,
                          index === heroIndex && styles.heroDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.promoBarContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.promoBarContent}
                >
                  {HOME_TAGS.map((tag, index) => {
                    const selected = index === activeTag;
                    return (
                      <Pressable
                        key={tag}
                        onPress={() => setActiveTag(index)}
                        style={[
                          styles.promoTag,
                          selected && styles.promoTagActive,
                        ]}
                      >
                        <Text style={styles.promoTagText}>{tag}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          }
        />
        </View>
      ) : null}

      <BottomTabBar
        activeTab="home"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={puedeVender}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

interface CreateStylesParams {
  scale: number;
  containerWidth: number;
  bannerWidth: number;
  bannerHeight: number;
  horizontalPadding: number;
  isDesktop: boolean;
  topInset: number;
  bottomInset: number;
}

function createStyles({
  scale,
  containerWidth,
  bannerWidth,
  bannerHeight,
  horizontalPadding,
  isDesktop,
  topInset,
  bottomInset,
}: CreateStylesParams) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      width: "100%",
      paddingTop: topInset,
      backgroundColor: Colors.background,
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
      alignItems: "center",
    },
    headerInner: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      paddingHorizontal: horizontalPadding,
      minHeight: s(76),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSide: {
      flex: 1,
      justifyContent: "center",
    },
    headerRightSide: {
      alignItems: "flex-end",
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: "contain",
    },
    userLabel: {
      color: Colors.textMuted,
      fontSize: s(12),
      fontFamily: "Montserrat_500Medium",
    },
    searchOuter: {
      width: "100%",
      height: s(66),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: horizontalPadding,
      paddingTop: s(6),
      paddingBottom: s(15),
    },
    searchContainer: {
      width: "100%",
      maxWidth: 640,
    },
    searchInput: {
      height: s(42),
      borderRadius: s(12),
      backgroundColor: Colors.chip,
      paddingHorizontal: s(16),
      color: Colors.textStrong,
      fontSize: s(13),
      fontFamily: "Montserrat_400Regular",
    },
    heroOuter: {
      width: "100%",
      alignItems: "center",
      paddingHorizontal: isDesktop ? horizontalPadding : 0,
    },
    heroContainer: {
      width: bannerWidth,
      height: bannerHeight,
      backgroundColor: Colors.secondary,
      overflow: "hidden",
      borderRadius: isDesktop ? s(14) : 0,
      position: "relative",
    },
    heroImage: {
      width: bannerWidth,
      height: bannerHeight,
      resizeMode: "cover",
    },
    heroDots: {
      position: "absolute",
      bottom: s(10),
      alignSelf: "center",
      flexDirection: "row",
      columnGap: s(6),
      zIndex: 10,
    },
    heroDot: {
      width: s(8),
      height: s(8),
      borderRadius: s(4),
      backgroundColor: "rgba(255, 255, 255, 0.5)",
    },
    heroDotActive: {
      backgroundColor: "#FFFFFF",
      width: s(18),
    },
    promoBarContainer: {
      marginTop: s(8),
      height: s(50),
      justifyContent: "center",
      backgroundColor: Colors.background,
      width: "100%",
    },
    promoBarContent: {
      paddingHorizontal: horizontalPadding,
      columnGap: s(8),
      alignItems: "center",
      justifyContent: isDesktop ? "center" : "flex-start",
      flexGrow: isDesktop ? 1 : 0,
    },
    promoTag: {
      minWidth: s(104),
      height: s(28),
      borderRadius: s(10),
      backgroundColor: Colors.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(14),
    },
    promoTagActive: {
      backgroundColor: Colors.tertiary,
    },
    promoTagText: {
      color: Colors.ink,
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: "400",
    },
    listWrapper: {
      flex: 1,
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
    },
    content: {
      paddingBottom: s(24) + s(78) + bottomInset,
      paddingTop: s(10),
    },
    productCell: {
      marginTop: s(12),
    },
    emptyState: {
      marginTop: s(60),
      alignItems: "center",
      rowGap: s(8),
      paddingHorizontal: s(24),
    },
    emptyTitle: {
      color: Colors.textStrong,
      fontSize: s(22),
      fontFamily: "Montserrat_600SemiBold",
      textAlign: "center",
    },
    emptyText: {
      color: Colors.textMuted,
      fontSize: s(13),
      textAlign: "center",
      fontFamily: "Montserrat_400Regular",
    },
  });
}
