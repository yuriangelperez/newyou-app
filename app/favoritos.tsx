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

export default function FavoritosScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canvasWidth = Math.min(width, 412);
  const scale = canvasWidth / 412;
  const styles = useMemo(() => createStyles(scale, insets.bottom), [insets.bottom, scale]);
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
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>Favoritos</Text>
      </View>

      <FlatList
        data={favoritos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={<Text style={styles.emptyText}>Todavia no tenes productos favoritos.</Text>}
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            scale={scale}
            onPressProducto={(producto) => router.push({ pathname: ROUTES.productDetail, params: { id: producto.id } })}
            onPressAgregar={onPressAgregar}
          />
        )}
      />

      <BottomTabBar
        activeTab="menu"
        canvasWidth={canvasWidth}
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

function createStyles(scale: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      paddingTop: s(42),
      paddingHorizontal: s(20),
      paddingBottom: s(14),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
    },
    backText: { color: Colors.secondary, fontSize: s(14), fontFamily: 'Montserrat_600SemiBold' },
    title: { color: Colors.primary, fontSize: s(24), fontFamily: 'Montserrat_700Bold' },
    content: { paddingTop: s(10), paddingBottom: s(24) + s(78) + bottomInset, flexGrow: 1 },
    row: { justifyContent: 'space-between', paddingHorizontal: s(20), marginTop: s(10) },
    emptyText: { marginTop: s(70), paddingHorizontal: s(24), color: Colors.textMuted, textAlign: 'center', fontSize: s(14) },
  });
}
