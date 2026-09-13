import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
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

import { BottomTabBar } from "../components/BottomTabBar";
import TarjetaProducto from "../components/TarjetaProducto";
import { ErrorView } from "../components/ui/ErrorView";
import { SkeletonList } from "../components/ui/SkeletonList";
import { BRANDING_LOGO, CATEGORY_DIAGONAL_CUT } from "../constants/assets";
import { CategoriaProducto } from "../constants/categoriasProductos";
import { Colors } from "../constants/theme";
import { ROUTES } from "../constants/routes";
import { useProductos } from "../hooks/useProductos";
import { selectTotalItems, useCarritoStore } from "../stores/useCarritoStore";
import { useUsuarioStore } from "../stores/useUsuarioStore";
import { Producto } from "../types";

const CANVAS_WIDTH = 412;
const MAX_CONTENT_WIDTH = 1160;
const FILTERS = [
  "TODO",
  "TORSO",
  "PIERNAS",
  "INTERIOR",
  "ACCESORIOS",
  "CALZADO",
];

const PRODUCT_FILTER_BY_ID: Record<
  string,
  {
    categoria?: string;
    categoriaId?: number;
    tipoPrenda?: CategoriaProducto["tipoPrenda"];
  }
> = {
  camisas: { categoria: "Camisas", categoriaId: 1, tipoPrenda: "Torso" },
  camperas: { categoria: "Camperas", categoriaId: 4, tipoPrenda: "Torso" },
  brasieres: {
    categoria: "Brasieres",
    categoriaId: 12,
    tipoPrenda: "Interior",
  },
  boxers: { categoria: "Boxers", categoriaId: 13, tipoPrenda: "Interior" },
  buzos: { categoria: "Buzos", tipoPrenda: "Torso" },
  faldas: { categoria: "Faldas", tipoPrenda: "Falda" },
  pantalones: { categoria: "Jeans", tipoPrenda: "Pantalón" },
  shorts: { categoria: "Short", tipoPrenda: "Short" },
  jeans: { categoria: "Jeans", tipoPrenda: "Pantalón" },
  botas: { categoria: "Botas", tipoPrenda: "Calzado" },
  zapatillas: { categoria: "Zapatillas", tipoPrenda: "Calzado" },
  sandalias: { categoria: "Sandalias", tipoPrenda: "Calzado" },
  mocasines: { categoria: "Mocasines", tipoPrenda: "Calzado" },
  cinturones: { categoria: "Cinturones", tipoPrenda: "Accesorio" },
  carteras: { categoria: "Carteras", tipoPrenda: "Accesorio" },
  gorras: { categoria: "Gorras", tipoPrenda: "Accesorio" },
  lentes: { categoria: "Lentes", tipoPrenda: "Accesorio" },
  mochila: { categoria: "Mochilas" },
};

const CATEGORY_BY_FILTER: Record<
  string,
  Array<{ id: string; label: string; image: string }>
> = {
  TODO: [
    {
      id: "camisas",
      label: "CAMISAS",
      image:
        "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600",
    },
    {
      id: "camperas",
      label: "CAMPERAS",
      image:
        "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600",
    },
    {
      id: "buzos",
      label: "BUZOS",
      image:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600",
    },
    {
      id: "faldas",
      label: "FALDAS",
      image:
        "https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=600",
    },
    {
      id: "pantalones",
      label: "PANTALONES",
      image:
        "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600",
    },
    {
      id: "shorts",
      label: "SHORTS",
      image:
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600",
    },
    {
      id: "jeans",
      label: "JEANS",
      image:
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600",
    },
    {
      id: "brasieres",
      label: "BRASIERES",
      image:
        "https://images.unsplash.com/photo-1610241519159-8a62634bac9a?w=600",
    },
    {
      id: "boxers",
      label: "BOXERS",
      image:
        "https://images.unsplash.com/photo-1640765937555-6f413ed1d936?w=600",
    },
    {
      id: "cinturones",
      label: "CINTURONES",
      image:
        "https://images.unsplash.com/photo-1664286074176-5206ee5dc878?w=600",
    },
    {
      id: "carteras",
      label: "CARTERAS",
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
    },
    {
      id: "gorras",
      label: "GORRAS",
      image:
        "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600",
    },
    {
      id: "lentes",
      label: "LENTES",
      image:
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
    },
    {
      id: "mochila",
      label: "MOCHILAS",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    },
    {
      id: "botas",
      label: "BOTAS",
      image:
        "https://plus.unsplash.com/premium_photo-1729788891863-0d9b6f2b453b?w=600",
    },
    {
      id: "zapatillas",
      label: "ZAPATILLAS",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    },
    {
      id: "sandalias",
      label: "SANDALIAS",
      image:
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600",
    },
    {
      id: "mocasines",
      label: "MOCASINES",
      image:
        "https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600",
    },
  ],
  TORSO: [
    {
      id: "camisas",
      label: "CAMISAS",
      image:
        "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600",
    },
    {
      id: "camperas",
      label: "CAMPERAS",
      image:
        "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600",
    },
    {
      id: "buzos",
      label: "BUZOS",
      image:
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600",
    },
  ],
  PIERNAS: [
    {
      id: "faldas",
      label: "FALDAS",
      image:
        "https://images.unsplash.com/photo-1577900232427-18219b9166a0?w=600",
    },
    {
      id: "pantalones",
      label: "PANTALONES",
      image:
        "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600",
    },
    {
      id: "shorts",
      label: "SHORTS",
      image:
        "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600",
    },
    {
      id: "jeans",
      label: "JEANS",
      image:
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600",
    },
  ],
  INTERIOR: [
    {
      id: "brasieres",
      label: "BRASIERES",
      image:
        "https://images.unsplash.com/photo-1610241519159-8a62634bac9a?w=600",
    },
    {
      id: "boxers",
      label: "BOXERS",
      image:
        "https://images.unsplash.com/photo-1640765937555-6f413ed1d936?w=600",
    },
  ],
  ACCESORIOS: [
    {
      id: "cinturones",
      label: "CINTURONES",
      image:
        "https://images.unsplash.com/photo-1664286074176-5206ee5dc878?w=600",
    },
    {
      id: "carteras",
      label: "CARTERAS",
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
    },
    {
      id: "gorras",
      label: "GORRAS",
      image:
        "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600",
    },
    {
      id: "lentes",
      label: "LENTES",
      image:
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
    },
    {
      id: "mochila",
      label: "MOCHILAS",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    },
  ],
  CALZADO: [
    {
      id: "botas",
      label: "BOTAS",
      image:
        "https://plus.unsplash.com/premium_photo-1729788891863-0d9b6f2b453b?w=600",
    },
    {
      id: "zapatillas",
      label: "ZAPATILLAS",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    },
    {
      id: "sandalias",
      label: "SANDALIAS",
      image:
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600",
    },
    {
      id: "mocasines",
      label: "MOCASINES",
      image:
        "https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=600",
    },
  ],
};

const ROPA_SIZES = ["Todos", "XS", "S", "M", "L", "XL", "XXL"];

const CALZADO_SIZES = [
  "Todos",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
];

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = useUsuarioStore(
    (state) => state.usuario?.role === "vendedor",
  );
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const { productos, cargando, error, refrescar } = useProductos();
  const [activeFilter, setActiveFilter] = useState("TODO");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [searchText, setSearchText] = useState("");
  const [selectedSize, setSelectedSize] = useState("Todos");

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
  const categoryCardHeight = isDesktop ? 130 : Math.round(cardWidth * 0.56);

  const styles = useMemo(
    () =>
      createStyles({
        scale,
        containerWidth,
        horizontalPadding,
        cardGap,
        isDesktop,
        topInset: insets.top,
        bottomInset: insets.bottom,
      }),
    [
      cardGap,
      containerWidth,
      horizontalPadding,
      insets.bottom,
      insets.top,
      isDesktop,
      scale,
    ],
  );

  const categoryItems = CATEGORY_BY_FILTER[activeFilter];
  const selectedFilter = selectedCategoryId
    ? PRODUCT_FILTER_BY_ID[selectedCategoryId]
    : null;

  const isCalzado = selectedFilter?.tipoPrenda === "Calzado";

  const sizeFilters = isCalzado ? CALZADO_SIZES : ROPA_SIZES;
  const visibleProducts = selectedFilter
    ? productos.filter((item) => {
        const matchesCategory = selectedFilter.categoriaId
          ? item.categoriaId === selectedFilter.categoriaId
          : selectedFilter.categoria
            ? item.categoria.toLowerCase() ===
              selectedFilter.categoria.toLowerCase()
            : true;

        if (!matchesCategory) {
          return false;
        }

        const normalizedSearch = searchText.trim().toLowerCase();

        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.nombre.toLowerCase().includes(normalizedSearch) ||
          item.descripcion.toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }

        const matchesSize =
          selectedSize === "Todos" ||
          (item.talle ?? []).some(
            (talle) => talle.toLowerCase() === selectedSize.toLowerCase(),
          );

        return matchesSize;
      })
    : [];

  const onPressAgregar = (producto: Producto) => {
    if (!producto.disponible) {
      return;
    }

    agregarProducto({
      producto,
      talle: producto.talle?.[0] ?? "M",
      color: producto.colores?.[0] ?? "Marron",
      cantidad: 1,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => {
                setActiveFilter(filter);
                setSelectedCategoryId(null);
                setSearchText("");
                setSelectedSize("Todos");
              }}
              style={[
                styles.filterChip,
                filter === activeFilter && styles.filterChipActive,
              ]}
            >
              <Text style={styles.filterText}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {selectedCategoryId ? (
        <>
          <View style={styles.categoryFilters}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Buscar en esta categoría..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
            />

            <Text style={styles.sizeLabel}>Talle</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sizeFiltersContent}
            >
              {sizeFilters.map((size) => {
                const selected = selectedSize === size;

                return (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    style={[styles.sizeChip, selected && styles.sizeChipActive]}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        selected && styles.sizeChipTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.selectedHeader}>
            <Pressable
              onPress={() => {
                setSelectedCategoryId(null);
                setSearchText("");
                setSelectedSize("Todos");
              }}
            >
              <Text style={styles.backText}>Categorias</Text>
            </Pressable>
            <Text style={styles.selectedTitle}>
              {
                CATEGORY_BY_FILTER[activeFilter].find(
                  (item) => item.id === selectedCategoryId,
                )?.label
              }
            </Text>
          </View>
          {cargando ? <SkeletonList /> : null}
          {!cargando && error ? (
            <ErrorView message={error} onRetry={() => void refrescar()} />
          ) : null}
          {!cargando && !error ? (
            <FlatList
              key={`cat-products-${numColumns}`}
              data={visibleProducts}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No hay productos en esta categoria.
                </Text>
              }
              renderItem={({ item }) => (
                <TarjetaProducto
                  producto={item}
                  scale={scale}
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
              )}
            />
          ) : null}
        </>
      ) : (
        <FlatList
          key={`cat-tiles-${numColumns}`}
          data={categoryItems}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.card,
                { width: cardWidth, height: categoryCardHeight },
              ]}
              onPress={() => setSelectedCategoryId(item.id)}
            >
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <Image
                source={CATEGORY_DIAGONAL_CUT}
                style={styles.cardBottomCut}
              />
              <Text style={styles.cardText}>{item.label}</Text>
            </Pressable>
          )}
        />
      )}

      <BottomTabBar
        activeTab="bag"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={esVendedor}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressCart={() => router.push(ROUTES.cart)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

interface CreateStylesParams {
  scale: number;
  containerWidth: number;
  horizontalPadding: number;
  cardGap: number;
  isDesktop: boolean;
  topInset: number;
  bottomInset: number;
}

function createStyles({
  scale,
  containerWidth,
  horizontalPadding,
  cardGap,
  isDesktop,
  topInset,
  bottomInset,
}: CreateStylesParams) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      width: "100%",
      paddingTop: topInset,
      height: topInset + s(76),
      justifyContent: "center",
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: "contain",
    },
    categoryFilters: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
      paddingHorizontal: horizontalPadding,
      paddingTop: s(12),
      paddingBottom: s(4),
    },

    searchInput: {
      width: "100%",
      maxWidth: 640,
      alignSelf: isDesktop ? "center" : "stretch",
      height: s(42),
      borderRadius: s(12),
      backgroundColor: "#E4E0E1",
      paddingHorizontal: s(15),
      color: "#2D1F16",
      fontSize: s(13),
    },

    sizeLabel: {
      marginTop: s(10),
      marginBottom: s(5),
      color: "#2D1F16",
      fontSize: s(12),
      fontWeight: "600",
      alignSelf: isDesktop ? "center" : "flex-start",
    },

    sizeFiltersContent: {
      columnGap: s(6),
      justifyContent: isDesktop ? "center" : "flex-start",
      flexGrow: isDesktop ? 1 : 0,
    },

    sizeChip: {
      minWidth: s(40),
      height: s(29),
      paddingHorizontal: s(9),
      borderRadius: s(10),
      backgroundColor: "#D9D9D9",
      alignItems: "center",
      justifyContent: "center",
    },

    sizeChipActive: {
      backgroundColor: Colors.tertiary,
    },

    sizeChipText: {
      color: "#000000",
      fontSize: s(11),
      fontWeight: "500",
    },

    sizeChipTextActive: {
      fontWeight: "700",
    },
    filtersWrap: {
      marginTop: s(14),
      height: s(34),
      width: "100%",
    },
    filtersContent: {
      paddingHorizontal: horizontalPadding,
      columnGap: s(6),
      alignItems: "center",
      justifyContent: isDesktop ? "center" : "flex-start",
      flexGrow: isDesktop ? 1 : 0,
    },
    filterChip: {
      minWidth: s(104),
      height: s(27),
      borderRadius: s(10),
      backgroundColor: "#D9D9D9",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(10),
    },
    filterChipActive: {
      backgroundColor: Colors.tertiary,
    },
    filterText: {
      color: "#000000",
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: "400",
    },
    gridContent: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
      paddingTop: s(10),
      paddingBottom: s(26) + s(78) + bottomInset,
      flexGrow: 1,
    },
    gridRow: {
      flexDirection: "row",
      justifyContent: "flex-start",
      gap: cardGap,
      paddingHorizontal: horizontalPadding,
      marginTop: s(12),
    },
    selectedHeader: {
      width: "100%",
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: horizontalPadding,
      paddingTop: s(14),
    },
    backText: {
      color: Colors.secondary,
      fontSize: s(13),
      fontWeight: "600",
    },
    selectedTitle: {
      color: "#2D1F16",
      fontSize: s(18),
      fontWeight: "600",
    },
    emptyText: {
      marginTop: s(50),
      color: Colors.textMuted,
      textAlign: "center",
      fontSize: s(14),
    },
    card: {
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
      overflow: "hidden",
      justifyContent: "flex-end",
      alignItems: "center",
      position: "relative",
    },
    cardImage: {
      ...StyleSheet.absoluteFill,
      width: undefined,
      height: undefined,
      resizeMode: "cover",
      opacity: 0.9,
    },
    cardBottomCut: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: -1,
      width: "100%",
      height: s(52),
      resizeMode: "cover",
    },
    cardText: {
      position: "absolute",
      right: s(6),
      bottom: s(7),
      maxWidth: s(150),
      color: "#000000",
      fontSize: s(17),
      lineHeight: s(18),
      fontWeight: "700",
      textAlign: "right",
      zIndex: 1,
    },
  });
}
