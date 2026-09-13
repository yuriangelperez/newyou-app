import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TarjetaProducto from '../components/TarjetaProducto';
import { BottomTabBar } from '../components/BottomTabBar';
import { ROUTES } from '../constants/routes';
import { Colors } from '../constants/theme';
import { useCarritoStore, selectTotalItems } from '../stores/useCarritoStore';
import { useFavoritosStore } from '../stores/useFavoritosStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';
import { Producto } from '../types';

const MAX_CONTENT_WIDTH = 1160;

export default function FavoritosScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;
  const containerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const canvasWidth = Math.min(width, 412);
  const scale = canvasWidth / 412;

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

  const styles = useMemo(
    () => createStyles(scale, insets.bottom, horizontalPadding, cardGap),
    [cardGap, horizontalPadding, insets.bottom, scale]
  );
  const favoritos = useFavoritosStore((state) => state.favoritos);
  const agregarProducto = useCarritoStore((state) => state.agregarProducto);
  const totalItems = useCarritoStore(selectTotalItems);
  const usuario = useUsuarioStore((state) => state.usuario);

  const onPressAgregar = (producto: Producto) => {
    if (!producto.disponible) {
      return;
    }

    agregarProducto({
      producto,
      talle: producto.talle?.[0] ?? 'M',
      color: producto.colores?.[0] ?? 'Marron',
      cantidad: 1,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>
          <Text style={styles.title}>Favoritos</Text>
        </View>
      </View>

      <FlatList
        key={`fav-grid-${numColumns}`}
        data={favoritos}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={<Text style={styles.emptyText}>Todavia no tenes productos favoritos.</Text>}
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            scale={scale}
            cardWidth={cardWidth}
            imageHeight={cardImageHeight}
            onPressProducto={(producto) => router.push({ pathname: ROUTES.productDetail, params: { id: producto.id } })}
            onPressAgregar={onPressAgregar}
          />
        )}
      />

      <BottomTabBar
        activeTab="menu"
        canvasWidth={Math.min(width, 560)}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={usuario?.role === 'vendedor'}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

function createStyles(scale: number, bottomInset: number, horizontalPadding: number, cardGap: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      width: '100%',
      paddingTop: s(42),
      paddingBottom: s(14),
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
      alignItems: 'center',
    },
    headerInner: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      paddingHorizontal: horizontalPadding,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backText: { color: Colors.secondary, fontSize: s(14), fontFamily: 'Montserrat_600SemiBold' },
    title: { color: Colors.primary, fontSize: s(24), fontFamily: 'Montserrat_700Bold' },
    content: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center',
      paddingTop: s(10),
      paddingBottom: s(24) + s(78) + bottomInset,
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: cardGap,
      paddingHorizontal: horizontalPadding,
      marginTop: s(12),
    },
    emptyText: { marginTop: s(70), paddingHorizontal: s(24), color: Colors.textMuted, textAlign: 'center', fontSize: s(14) },
  });
}
