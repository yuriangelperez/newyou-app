import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Animated,
  FlatList,
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
import { Colors } from "../../constants/theme";
import { useProductos } from "../../hooks/useProductos";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { Producto } from "../../types";

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
  const { productos, cargando, error, refreshing, refrescar } = useProductos();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const totalItems = useCarritoStore(selectTotalItems);
  const usuario = useUsuarioStore((state) => state.usuario);

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
        cardGap,
        isDesktop,
        topInset: insets.top,
        bottomInset: insets.bottom,
      }),
    [
      bannerHeight,
      bannerWidth,
      cardGap,
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
    const normalizedSearch = searchText.trim().toLowerCase();

    return productos.filter((item) => {
      const productType = item.categoriaProducto?.tipoPrenda ?? "";

      const productCategories = [
        item.categoria ?? "",
        ...(PRODUCT_CATEGORY_ALIASES[productType] ?? []),
      ];

      // Filtro por búsqueda
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.nombre.toLowerCase().includes(normalizedSearch) ||
        item.descripcion.toLowerCase().includes(normalizedSearch) ||
        item.categoria.toLowerCase().includes(normalizedSearch);

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
  }, [
    productos,
    searchText,
    selectedCategory,
    selectedTag,
  ]);

  const getAddButtonAnimation = (productId: string) => {
    if (!addButtonAnimationsRef.current[productId]) {
      addButtonAnimationsRef.current[productId] = new Animated.Value(1);
    }
    return addButtonAnimationsRef.current[productId];
  };

  const onPressAgregar = (item: Producto) => {
    if (!item.disponible) {
      return;
    }

    agregarProducto({
      producto: item,
      talle: item.talle?.[0] ?? "M",
      color: "Marron",
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
  };

  const renderProductCard = ({ item }: { item: Producto }) => {
    const isAdded = addedProductId === item.id;
    const buttonAnimation = getAddButtonAnimation(item.id);

    return (
      <TarjetaProducto
        producto={item}
        scale={scale}
        isAdded={isAdded}
        addButtonScale={buttonAnimation}
        cardWidth={cardWidth}
        imageHeight={cardImageHeight}
        onPressProducto={(producto) =>
          router.push({
            pathname: ROUTES.productDetail,
            params: { id: producto.id },
          })
        }
        onPressAgregar={onPressAgregar}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

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
            style={styles.logo}
          />
          <View style={[styles.headerSide, styles.headerRightSide]} />
        </View>
      </View>

      {cargando ? <SkeletonList /> : null}

      {!cargando && error ? (
        <ErrorView message={error} onRetry={() => void refrescar()} />
      ) : null}

      {!cargando && !error ? (
        <FlatList
          key={`product-grid-${numColumns}`}
          data={visibleProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          columnWrapperStyle={styles.productRow}
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
      ) : null}

      <BottomTabBar
        activeTab="home"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={usuario?.role === "vendedor"}
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
  cardGap: number;
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
  cardGap,
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
      backgroundColor: "#E4E0E1",
      paddingHorizontal: s(16),
      color: "#2D1F16",
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
      backgroundColor: "#D9D9D9",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(14),
    },
    promoTagActive: {
      backgroundColor: Colors.tertiary,
    },
    promoTagText: {
      color: "#000000",
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: "400",
    },
    content: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
      paddingBottom: s(24) + s(78) + bottomInset,
      paddingTop: s(10),
      flexGrow: 1,
    },
    productRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      gap: cardGap,
      paddingHorizontal: horizontalPadding,
      marginTop: s(12),
    },
    emptyState: {
      marginTop: s(60),
      alignItems: "center",
      rowGap: s(8),
      paddingHorizontal: s(24),
    },
    emptyTitle: {
      color: "#2D1F16",
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
