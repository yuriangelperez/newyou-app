import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../../components/BottomTabBar';
import TarjetaProducto from '../../components/TarjetaProducto';
import { BRANDING_LOGO, HOME_HERO_IMAGES } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors } from '../../constants/theme';
import { useCart } from '../../context/cart';
import { PRODUCTOS_MOCK } from '../../data/mockData';
import { useProductos } from '../../hooks/useProductos';
import { Producto } from '../../types';

const CANVAS_WIDTH = 412;
const HOME_TAGS = ['Promociones', 'Invierno', 'Verano', 'Femenino', 'Infantil'];

const HOME_FILTERS: Record<string, string[]> = {
  Promociones: ['Camisas', 'Jeans', 'Botas', 'Vestidos', 'Short', 'Camperas'],
  Invierno: ['Camperas', 'Botas', 'Buzos'],
  Verano: ['Short', 'Vestidos', 'Camisas'],
  Femenino: ['Vestidos', 'Brasieres', 'Faldas', 'Camisas'],
  Infantil: ['Infantil'],
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { productos, cargando, refrescar } = useProductos();
  const { addToCart, totalItems } = useCart();

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom),
    [canvasWidth, insets.bottom, insets.top, scale]
  );

  const [activeTag, setActiveTag] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const addedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const addButtonAnimationsRef = useRef<Record<string, Animated.Value>>({});

  useEffect(() => {
    return () => {
      Object.values(addedTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const sourceProducts = productos.length ? productos : PRODUCTOS_MOCK;
  const selectedTag = HOME_TAGS[activeTag];
  const activeCategories = HOME_FILTERS[selectedTag];

  const visibleProducts = useMemo(
    () => sourceProducts.filter((item) => activeCategories.some((category) => item.categoria.includes(category))),
    [activeCategories, sourceProducts]
  );

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

    addToCart({
      producto: item,
      talle: item.talle?.[0] ?? 'M',
      color: 'Marron',
      cantidad: 1,
    });

    const animation = getAddButtonAnimation(item.id);
    setAddedProductId(item.id);

    if (addedTimersRef.current[item.id]) {
      clearTimeout(addedTimersRef.current[item.id]);
    }

    Animated.sequence([
      Animated.timing(animation, { toValue: 1.08, duration: 100, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 1, duration: 140, useNativeDriver: true }),
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
        onPressProducto={(producto) => router.push({ pathname: ROUTES.productDetail, params: { id: producto.id } })}
        onPressAgregar={onPressAgregar}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Image accessibilityLabel="New You" source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <FlatList
        data={visibleProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.productRow}
        refreshing={cargando}
        onRefresh={refrescar}
        ListHeaderComponent={
          <>
            <View style={styles.heroContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / canvasWidth);
                  setHeroIndex(nextIndex);
                }}
              >
                {HOME_HERO_IMAGES.map((image, index) => (
                  <Image key={index} source={image} style={styles.heroImage} />
                ))}
              </ScrollView>
              <View style={styles.heroDots}>
                {HOME_HERO_IMAGES.map((_, index) => (
                  <View key={index} style={[styles.heroDot, index === heroIndex && styles.heroDotActive]} />
                ))}
              </View>
            </View>

            <View style={styles.promoBarContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoBarContent}>
                {HOME_TAGS.map((tag, index) => {
                  const selected = index === activeTag;
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => setActiveTag(index)}
                      style={[styles.promoTag, selected && styles.promoTagActive]}
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

      <BottomTabBar
        activeTab="home"
        canvasWidth={canvasWidth}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
      />
    </View>
  );
}

function createStyles(scale: number, canvasWidth: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      paddingTop: topInset,
      height: topInset + s(76),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.background,
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: 'contain',
    },
    heroContainer: {
      width: canvasWidth,
      height: s(146),
      backgroundColor: Colors.secondary,
      overflow: 'hidden',
      position: 'relative',
    },
    heroImage: {
      width: canvasWidth,
      height: s(146),
      resizeMode: 'cover',
    },
    heroDots: {
      position: 'absolute',
      bottom: s(8),
      alignSelf: 'center',
      flexDirection: 'row',
      columnGap: s(6),
    },
    heroDot: {
      width: s(6),
      height: s(6),
      borderRadius: s(3),
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    heroDotActive: {
      backgroundColor: '#FFFFFF',
    },
    promoBarContainer: {
      marginTop: s(8),
      height: s(50),
      justifyContent: 'center',
      backgroundColor: Colors.background,
    },
    promoBarContent: {
      paddingHorizontal: s(20),
      columnGap: s(8),
      alignItems: 'center',
    },
    promoTag: {
      minWidth: s(104),
      height: s(27),
      borderRadius: s(10),
      backgroundColor: '#D9D9D9',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(12),
    },
    promoTagActive: {
      backgroundColor: Colors.tertiary,
    },
    promoTagText: {
      color: '#000000',
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: '400',
    },
    content: {
      paddingBottom: s(24) + s(78) + bottomInset,
      paddingTop: s(10),
    },
    productRow: {
      justifyContent: 'space-between',
      paddingHorizontal: s(20),
      marginTop: s(10),
    },
  });
}
