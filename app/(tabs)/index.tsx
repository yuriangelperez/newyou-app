import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
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
import { FiltroPrecio } from "../../components/ui/FiltroPrecio";
import { PanelFiltros } from "../../components/ui/PanelFiltros";
import { SkeletonList } from "../../components/ui/SkeletonList";
import TarjetaProducto from "../../components/TarjetaProducto";
import { BRANDING_LOGO, HOME_HERO_IMAGES } from "../../constants/assets";
import { normalizarPublicos, PUBLICOS } from "../../constants/categoriasProductos";
import { ROUTES } from "../../constants/routes";
import { Colors, EstiloBarraEstado } from "../../constants/theme";
import { useProductos } from "../../hooks/useProductos";
import {
  selectTotalItems,
  useCarritoStore,
} from "../../stores/useCarritoStore";
import { useUsuarioStore } from "../../stores/useUsuarioStore";
import { usePuedeVender } from "../../hooks/usePuedeVender";
import { calcularPrecioFinal, Producto } from "../../types";
import { useHistorialStore } from "../../stores/useHistorialStore";
import {
  cantidadDePrendas,
  CONDICIONES,
  cumpleFiltrosExtra,
  FILTROS_EXTRA_INICIALES,
  ORDENES,
  ordenarPorPrecio,
  TALLE_TODOS,
  TALLES_CALZADO,
  TALLES_ROPA,
} from "../../utils/filtrosCatalogo";
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
const PUBLIC_FILTERS = ["Todo", ...PUBLICOS];

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

  const [selectedTag, setSelectedTag] = useState<string>("Todo");
  const [orden, setOrden] = useState<string>(ORDENES[0]);
  const [activePublicFilter, setActivePublicFilter] = useState("Todo");
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const [precioMin, setPrecioMin] = useState<number | null>(FILTROS_EXTRA_INICIALES.precioMin);
  const [precioMax, setPrecioMax] = useState<number | null>(FILTROS_EXTRA_INICIALES.precioMax);
  const [condicion, setCondicion] = useState<string>(FILTROS_EXTRA_INICIALES.condicion);
  const [talle, setTalle] = useState<string>(FILTROS_EXTRA_INICIALES.talle);

  // Historial del dispositivo: búsquedas recientes y prendas vistas.
  const busquedasRecientes = useHistorialStore((state) => state.busquedas);
  const idsVistos = useHistorialStore((state) => state.vistos);
  const cargarHistorial = useHistorialStore((state) => state.cargar);
  const registrarBusqueda = useHistorialStore((state) => state.registrarBusqueda);
  const borrarBusquedas = useHistorialStore((state) => state.borrarBusquedas);
  const [buscadorActivo, setBuscadorActivo] = useState(false);
  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const addedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const addButtonAnimationsRef = useRef<Record<string, Animated.Value>>({});

  useEffect(() => {
    return () => {
      Object.values(addedTimersRef.current).forEach((timeoutId) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
      addedTimersRef.current = {};
    };
  }, []);

  const hayFiltros =
    selectedTag !== "Todo" ||
    activePublicFilter !== "Todo" ||
    orden !== ORDENES[0] ||
    precioMin !== FILTROS_EXTRA_INICIALES.precioMin ||
    precioMax !== FILTROS_EXTRA_INICIALES.precioMax ||
    condicion !== FILTROS_EXTRA_INICIALES.condicion ||
    talle !== FILTROS_EXTRA_INICIALES.talle;
  const limpiarFiltros = useCallback(() => {
    setOrden(ORDENES[0]);
    setSelectedTag("Todo");
    setActivePublicFilter("Todo");
    setPrecioMin(FILTROS_EXTRA_INICIALES.precioMin);
    setPrecioMax(FILTROS_EXTRA_INICIALES.precioMax);
    setCondicion(FILTROS_EXTRA_INICIALES.condicion);
    setTalle(FILTROS_EXTRA_INICIALES.talle);
  }, []);
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

      const publicosProducto = normalizarPublicos(item.categoriaProducto?.publico);
      const matchesPublic =
        activePublicFilter === "Todo" || publicosProducto.includes(activePublicFilter as (typeof PUBLICOS)[number]);

      if (!matchesPublic) {
        return false;
      }

      if (!cumpleFiltrosExtra(item, { precioMin, precioMax, condicion, talle })) {
        return false;
      }

      if (selectedTag === "Todo") {
        return true;
      }

      if (selectedTag === "Promociones") {
        return item.descuentoPorcentaje > 0;
      }

      return item.categoriaProducto?.temporada === selectedTag;
    });

    // Orden por precio final (con descuento aplicado). "Destacados" deja el orden original.
    const ordenados = ordenarPorPrecio(filtrados, orden);

    // Las agotadas van al final (grises, con "AGOTADO") para no tapar lo que se puede comprar (CA2).
    return [...ordenados.filter((item) => item.disponible), ...ordenados.filter((item) => !item.disponible)];
  }, [
    condicion,
    precioMin,
    precioMax,
    talle,
    activePublicFilter,
    orden,
    productos,
    searchText,
    selectedCategory,
    selectedTag,
  ]);

  // Sólo las vistas que siguen publicadas, con los datos actuales del catálogo.
  const vistosRecientes = useMemo(
    () =>
      idsVistos
        .map((id) => productos.find((item) => item.id === id))
        .filter((item): item is Producto => Boolean(item)),
    [idsVistos, productos],
  );

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
          // Al filtrar o limpiar, la lista no debe "seguir" a un producto: se queda donde estaba.
          maintainVisibleContentPosition={{ disabled: true }}
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
            hayFiltros || searchText.trim() ? (
              <View style={styles.emptyState} testID="home-sin-resultados">
                <Ionicons name="search-outline" size={40} color={Colors.textEarthMuted} />
                <Text style={styles.emptyTitle}>No encontramos prendas</Text>
                <Text style={styles.emptyText}>
                  Probá con otra búsqueda o sacá algunos filtros.
                </Text>
                <Pressable
                  testID="home-limpiar-filtros"
                  style={styles.emptyButton}
                  onPress={() => {
                    limpiarFiltros();
                    setSearchText("");
                  }}
                >
                  <Text style={styles.emptyButtonText}>Limpiar búsqueda y filtros</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No hay prendas disponibles</Text>
                <Text style={styles.emptyText}>
                  {/* Sólo quien puede vender tiene el botón + (el comprador no publica). */}
                  {puedeVender
                    ? "Publicá una nueva prenda con el botón +."
                    : "Todavía no hay prendas publicadas. Volvé a mirar más tarde."}
                </Text>
              </View>
            )
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
                    onFocus={() => setBuscadorActivo(true)}
                    // Con demora, para que el toque en una búsqueda reciente llegue antes de ocultarlas.
                    onBlur={() => {
                      setTimeout(() => setBuscadorActivo(false), 200);
                      registrarBusqueda(searchText);
                    }}
                    onSubmitEditing={() => registrarBusqueda(searchText)}
                  />
                  <Pressable
                    testID="home-filtros-buscador"
                    accessibilityRole="button"
                    accessibilityLabel="Ordenar y filtrar"
                    onPress={() => setFiltrosVisibles(true)}
                    style={styles.filtrosBoton}
                  >
                    <Ionicons name="options-outline" size={20} color={Colors.textStrong} />
                    {hayFiltros ? <View style={styles.filtrosPunto} /> : null}
                  </Pressable>
                </View>
                {buscadorActivo && !searchText && busquedasRecientes.length > 0 ? (
                  <View style={styles.recentSearches} testID="busquedas-recientes">
                    <View style={styles.recentHeader}>
                      <Text style={styles.recentTitle}>Búsquedas recientes</Text>
                      <Pressable onPress={borrarBusquedas} hitSlop={8}>
                        <Text style={styles.recentClear}>Borrar</Text>
                      </Pressable>
                    </View>
                    <View style={styles.recentChips}>
                      {busquedasRecientes.map((texto) => (
                        <Pressable
                          key={texto}
                          style={styles.recentChip}
                          onPress={() => {
                            setSearchText(texto);
                            registrarBusqueda(texto);
                          }}
                        >
                          <Ionicons name="time-outline" size={14} color={Colors.textEarth} />
                          <Text style={styles.recentChipText}>{texto}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
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

              <View style={styles.filtrosFila}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsFila}
                style={styles.chipsScroll}
              >
                {HOME_TAGS.map((tag) => {
                  const elegido = tag === "Todo" ? !hayFiltros : tag === selectedTag;
                  return (
                    <Pressable
                      key={`tag-${tag}`}
                      testID={`chip-${tag}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: elegido }}
                      onPress={() => {
                        if (tag === "Todo") {
                          limpiarFiltros();
                        } else {
                          setSelectedTag(tag === selectedTag ? "Todo" : tag);
                        }
                      }}
                      style={[styles.chip, elegido && styles.chipActivo]}
                    >
                      <Text style={styles.chipTexto}>{tag}</Text>
                    </Pressable>
                  );
                })}
                <View style={styles.chipsSeparador} />
                {PUBLICOS.map((publico) => {
                  const elegido = publico === activePublicFilter;
                  return (
                    <Pressable
                      key={`publico-${publico}`}
                      testID={`chip-${publico}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: elegido }}
                      onPress={() => setActivePublicFilter(elegido ? "Todo" : publico)}
                      style={[styles.chip, elegido && styles.chipActivo]}
                    >
                      <Text style={styles.chipTexto}>{publico}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              </View>

              {vistosRecientes.length > 0 && !searchText.trim() ? (
                <View style={styles.recentSection} testID="vistos-recientes">
                  <Text style={styles.sectionTitle}>Vistos recientemente</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentList}
                  >
                    {vistosRecientes.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityLabel={`Ver ${item.nombre}`}
                        style={styles.recentCard}
                        onPress={() => onPressProducto(item)}
                      >
                        <Image source={{ uri: item.imagen }} style={styles.recentImage} />
                        <Text numberOfLines={1} style={styles.recentName}>{item.nombre}</Text>
                        <Text style={styles.recentPrice}>
                          ${calcularPrecioFinal(item).toLocaleString("es-AR")}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.resultsRow}>
                <Text style={styles.resultsText} testID="home-cantidad">
                  {cantidadDePrendas(visibleProducts.length)}
                  {orden !== ORDENES[0] ? ` · ${orden.toLowerCase()}` : ""}
                </Text>
                {hayFiltros ? (
                  <Pressable onPress={limpiarFiltros} hitSlop={8} testID="home-limpiar">
                    <Text style={styles.resultsClear}>Limpiar filtros</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          }
        />
        </View>
      ) : null}

      <PanelFiltros
        visible={filtrosVisibles}
        onCerrar={() => setFiltrosVisibles(false)}
        onLimpiar={limpiarFiltros}
        secciones={[
          { id: "orden", titulo: "Ordenar por", opciones: ORDENES, valor: orden, onCambiar: setOrden },
          { id: "temporada", titulo: "Temporada", opciones: HOME_TAGS, valor: selectedTag, onCambiar: setSelectedTag },
          { id: "publico", titulo: "Público", opciones: PUBLIC_FILTERS, valor: activePublicFilter, onCambiar: setActivePublicFilter },
          {
            id: "precio",
            titulo: "Precio",
            contenido: (
              <FiltroPrecio
                min={precioMin}
                max={precioMax}
                onCambiar={(min, max) => {
                  setPrecioMin(min);
                  setPrecioMax(max);
                }}
              />
            ),
          },
          { id: "condicion", titulo: "Estado", opciones: CONDICIONES, valor: condicion, onCambiar: setCondicion },
          {
            id: "talle-ropa",
            titulo: "Talle de prendas",
            opciones: TALLES_ROPA,
            valor: talle,
            onCambiar: (valor) => setTalle(valor === talle ? TALLE_TODOS : valor),
            estilo: "chips",
          },
          {
            id: "talle-calzado",
            titulo: "Talle de calzado",
            opciones: TALLES_CALZADO,
            valor: talle,
            onCambiar: (valor) => setTalle(valor === talle ? TALLE_TODOS : valor),
            estilo: "chips",
          },
        ]}
      />

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
      minHeight: s(66),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: horizontalPadding,
      paddingTop: s(6),
      paddingBottom: s(15),
    },
    searchContainer: {
      width: "100%",
      maxWidth: 640,
      flexDirection: "row",
      columnGap: s(8),
    },
    filtrosBoton: {
      width: s(42),
      height: s(42),
      borderRadius: s(12),
      backgroundColor: Colors.chip,
      alignItems: "center",
      justifyContent: "center",
    },
    filtrosPunto: {
      position: "absolute",
      top: s(8),
      right: s(8),
      width: s(8),
      height: s(8),
      borderRadius: s(4),
      backgroundColor: Colors.secondary,
    },
    filtrosFila: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      columnGap: s(8),
      marginTop: s(10),
      marginBottom: s(10),
    },
    chipsScroll: {
      flex: 1,
    },
    chipsFila: {
      paddingHorizontal: horizontalPadding,
      columnGap: s(8),
      alignItems: "center",
    },
    chip: {
      height: s(30),
      borderRadius: s(10),
      backgroundColor: Colors.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(14),
    },
    chipActivo: {
      backgroundColor: Colors.tertiary,
    },
    chipTexto: {
      color: Colors.ink,
      fontSize: s(12),
      fontFamily: "Montserrat_400Regular",
    },
    chipsSeparador: {
      width: 1,
      height: s(18),
      backgroundColor: Colors.border,
    },
    searchInput: {
      flex: 1,
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
    recentSearches: {
      width: "100%",
      maxWidth: 640,
      marginTop: s(8),
      rowGap: s(6),
    },
    recentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    recentTitle: {
      color: Colors.textEarth,
      fontSize: s(12),
      fontFamily: "Montserrat_600SemiBold",
    },
    recentClear: {
      color: Colors.secondary,
      fontSize: s(12),
      fontFamily: "Montserrat_600SemiBold",
    },
    recentChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s(6),
    },
    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 4,
      borderRadius: s(10),
      backgroundColor: Colors.chip,
      paddingHorizontal: s(10),
      paddingVertical: s(5),
    },
    recentChipText: {
      color: Colors.textStrong,
      fontSize: s(12),
      fontFamily: "Montserrat_400Regular",
    },
    recentSection: {
      width: "100%",
      marginTop: s(10),
      rowGap: s(6),
    },
    sectionTitle: {
      color: Colors.textStrong,
      fontSize: s(14),
      fontFamily: "Montserrat_600SemiBold",
      paddingHorizontal: horizontalPadding,
    },
    recentList: {
      paddingHorizontal: horizontalPadding,
      columnGap: s(10),
    },
    recentCard: {
      width: 96,
      rowGap: 2,
    },
    recentImage: {
      width: 96,
      height: 110,
      borderRadius: 10,
      backgroundColor: Colors.chip,
    },
    recentName: {
      color: Colors.textStrong,
      fontSize: 12,
      fontFamily: "Montserrat_500Medium",
    },
    recentPrice: {
      color: Colors.textEarth,
      fontSize: 12,
      fontFamily: "Montserrat_600SemiBold",
    },
    resultsRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: horizontalPadding,
      marginTop: s(10),
      marginBottom: s(8),
    },
    resultsText: {
      color: Colors.textEarth,
      fontSize: s(12),
      fontFamily: "Montserrat_500Medium",
    },
    resultsClear: {
      color: Colors.secondary,
      fontSize: s(12),
      fontFamily: "Montserrat_600SemiBold",
    },
    emptyButton: {
      marginTop: s(8),
      borderRadius: 8,
      backgroundColor: Colors.secondary,
      paddingHorizontal: s(16),
      paddingVertical: s(10),
    },
    emptyButtonText: {
      color: Colors.white,
      fontSize: s(13),
      fontFamily: "Montserrat_600SemiBold",
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
