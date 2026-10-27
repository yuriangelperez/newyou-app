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

import { BottomTabBar } from "../../components/BottomTabBar";
import TarjetaProducto from "../../components/TarjetaProducto";
import { ErrorView } from "../../components/ui/ErrorView";
import { SkeletonList } from "../../components/ui/SkeletonList";
import { BRANDING_LOGO, CATEGORY_DIAGONAL_CUT } from "../../constants/assets";
import { Categoria, tipoPrendaDeCategoria } from "../../constants/categoriasProductos";
import { mismoTalle, TALLES_CALZADO, TALLES_ROPA } from "../../constants/talles";
import { Colors, EstiloBarraEstado, Radius, Shadow } from "../../constants/theme";
import { ROUTES } from "../../constants/routes";
import { useCategorias } from "../../hooks/useCategorias";
import { useProductos } from "../../hooks/useProductos";
import { selectTotalItems, useCarritoStore } from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeVender } from "../../hooks/usePuedeVender";
import { Producto } from "../../types";
import { incluyeTexto, normalizarTexto } from "../../utils/texto";

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

const ROPA_SIZES = ["Todos", ...TALLES_ROPA];

const CALZADO_SIZES = ["Todos", ...TALLES_CALZADO];

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = usePuedeVender();
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const { productos, cargando, error, sinConexion, refrescar } = useProductos();
  // Las categorías salen de Supabase: una nueva (con su grupo) aparece sola.
  const categorias = useCategorias();
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

  const categoryItems = useMemo(
    () =>
      categorias
        .filter((item) => activeFilter === "TODO" || item.grupo === activeFilter)
        .map((item) => ({ ...item, key: normalizarTexto(item.nombre) })),
    [activeFilter, categorias],
  );
  const selectedFilter: Categoria | null = selectedCategoryId
    ? categorias.find((item) => normalizarTexto(item.nombre) === selectedCategoryId) ?? null
    : null;

  const isCalzado = selectedFilter
    ? tipoPrendaDeCategoria(selectedFilter.nombre, selectedFilter.grupo) === "Calzado"
    : false;

  const sizeFilters = isCalzado ? CALZADO_SIZES : ROPA_SIZES;
  const visibleProducts = selectedFilter
    ? productos.filter((item) => {
        // Cada categoría muestra sólo sus prendas ("Pantalones" ya no trae las de "Jeans").
        const matchesCategory =
          normalizarTexto(item.categoria) === normalizarTexto(selectedFilter.nombre) ||
          (selectedFilter.id !== undefined && item.categoriaId === selectedFilter.id);

        if (!matchesCategory) {
          return false;
        }

        // Sin distinguir mayúsculas ni tildes: "pantalon" encuentra "Pantalón".
        const matchesSearch =
          searchText.trim().length === 0 ||
          incluyeTexto(item.nombre, searchText) ||
          incluyeTexto(item.descripcion, searchText);

        if (!matchesSearch) {
          return false;
        }

        const matchesSize =
          selectedSize === "Todos" ||
          (item.talle ?? []).some((talle) => mismoTalle(talle, selectedSize));

        return matchesSize;
      })
    : [];

  const onPressAgregar = (producto: Producto) => {
    if (!producto.disponible) {
      return;
    }

    agregarProducto({
      producto,
      talle: producto.talle?.[0] ?? "Único",
      color: producto.colores?.[0] ?? "",
      cantidad: 1,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={EstiloBarraEstado} />

      <View style={styles.header}>
        <Image source={BRANDING_LOGO} tintColor={Colors.textStrong} style={styles.logo} />
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
              {selectedFilter?.nombre.toUpperCase()}
            </Text>
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
          keyExtractor={(item) => item.key}
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
              onPress={() => setSelectedCategoryId(item.key)}
            >
              {item.imagen ? (
                <Image source={{ uri: item.imagen }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
              )}
              <Image
                source={CATEGORY_DIAGONAL_CUT}
                style={styles.cardBottomCut}
              />
              <Text style={styles.cardText}>{item.nombre.toUpperCase()}</Text>
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
      backgroundColor: Colors.chip,
      paddingHorizontal: s(15),
      color: Colors.textStrong,
      fontSize: s(13),
    },

    sizeLabel: {
      marginTop: s(10),
      marginBottom: s(5),
      color: Colors.textStrong,
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
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.secondary,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    sizeChipActive: {
      backgroundColor: Colors.tertiary,
    },

    sizeChipText: {
      color: Colors.ink,
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
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.secondary,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(10),
    },
    filterChipActive: {
      backgroundColor: Colors.tertiary,
      ...Shadow.selected,
    },
    filterText: {
      color: Colors.ink,
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
      color: Colors.textStrong,
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
    cardImagePlaceholder: {
      backgroundColor: Colors.tertiary,
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
      color: Colors.ink,
      fontSize: s(17),
      lineHeight: s(18),
      fontWeight: "700",
      textAlign: "right",
      zIndex: 1,
    },
  });
}
