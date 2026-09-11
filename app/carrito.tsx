import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../components/BottomTabBar';
import { BRANDING_LOGO, PRODUCT_DETAIL_ICONS } from '../constants/assets';
import { ROUTES } from '../constants/routes';
import { Colors } from '../constants/theme';
import { selectSubtotal, selectTotalItems, useCarritoStore } from '../stores/useCarritoStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';

const CANVAS_WIDTH = 412;

export default function CarritoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const items = useCarritoStore((state) => state.items);
  const restarUnidad = useCarritoStore((state) => state.restarUnidad);
  const incrementarUnidad = useCarritoStore((state) => state.incrementarUnidad);
  const eliminarProducto = useCarritoStore((state) => state.eliminarProducto);
  const totalItems = useCarritoStore(selectTotalItems);
  const subtotal = useCarritoStore(selectSubtotal);
  const esVendedor = useUsuarioStore((state) => state.usuario?.tipo === 'vendedor');

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom),
    [canvasWidth, insets.bottom, insets.top, scale]
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.backIcon} />
        </Pressable>
        <Image source={BRANDING_LOGO} style={styles.logo} />
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
            <Text style={styles.emptyText}>Agrega productos desde Home o Categorías.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.itemSpacing} />}
        renderItem={({ item }) => (
          <View style={styles.cartRow}>
            <Image source={{ uri: item.imagen }} style={styles.productImage} />

            <View style={styles.rightColumn}>
              <Text style={styles.productTitle}>{item.nombre}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>{'\u2022 '}Talle: {item.talle}</Text>
                <Text style={styles.bulletText}>{'\u2022 '}Color: {item.color}</Text>
                <Text style={styles.bulletText}>{'\u2022 '}Categoría: {item.categoria}</Text>
              </View>

              <Text style={styles.productPrice}>${item.precio.toLocaleString('es-AR')}</Text>
              <Text style={styles.productPriceCaption}>Precio por unidad</Text>

              <View style={styles.actionsRow}>
                <View style={styles.quantityRow}>
                  <Pressable onPress={() => restarUnidad(item.key)} style={styles.quantityButton}>
                    <Text style={styles.quantitySymbol}>-</Text>
                  </Pressable>
                  <View style={styles.quantityValueBox}>
                    <Text style={styles.quantityValue}>{item.cantidad}</Text>
                  </View>
                  <Pressable onPress={() => incrementarUnidad(item.key)} style={styles.quantityButton}>
                    <Text style={styles.quantitySymbol}>+</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => eliminarProducto(item.key)} style={styles.removeButton}>
                  <Text style={styles.removeText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.checkoutBar}>
        <Text style={styles.totalText}>TOTAL: ${subtotal.toLocaleString('es-AR')}</Text>
        <Pressable disabled={items.length === 0} style={[styles.checkoutButton, items.length === 0 && styles.checkoutButtonDisabled]}>
          <Text style={styles.checkoutText}>COMPLETAR COMPRA</Text>
        </Pressable>
      </View>

      <BottomTabBar
        activeTab="cart"
        canvasWidth={canvasWidth}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={esVendedor}
        onPressCreate={() => router.push(ROUTES.newProduct)}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressMenu={() => router.push(ROUTES.profile)}
      />
    </View>
  );
}

function createStyles(scale: number, _canvasWidth: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      paddingTop: topInset,
      height: topInset + s(76),
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: s(16),
    },
    backButton: {
      width: s(39),
      height: s(39),
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      width: s(39),
      height: s(39),
      resizeMode: 'contain',
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: 'contain',
    },
    listContent: {
      paddingTop: s(20),
      paddingHorizontal: s(16),
      paddingBottom: s(24) + s(78) + s(70) + bottomInset,
      minHeight: s(540),
    },
    itemSpacing: {
      height: s(20),
    },
    emptyState: {
      marginTop: s(80),
      alignItems: 'center',
      rowGap: s(8),
    },
    emptyTitle: {
      color: '#2D1F16',
      fontSize: s(22),
      fontWeight: '600',
    },
    emptyText: {
      color: '#2D1F16',
      fontSize: s(14),
    },
    cartRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      columnGap: s(16),
    },
    productImage: {
      width: s(165),
      height: s(130),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
    },
    rightColumn: {
      width: s(185),
      minHeight: s(130),
      justifyContent: 'space-between',
    },
    productTitle: {
      color: '#2D1F16',
      fontSize: s(17),
      lineHeight: s(20),
      fontWeight: '500',
    },
    bulletList: {
      marginTop: s(4),
      rowGap: s(1),
    },
    bulletText: {
      color: '#2D1F16',
      fontSize: s(10),
      lineHeight: s(12),
      fontWeight: '400',
    },
    productPrice: {
      marginTop: s(8),
      color: Colors.primary,
      fontSize: s(24),
      lineHeight: s(28),
      fontWeight: '700',
    },
    productPriceCaption: {
      color: Colors.textMuted,
      fontSize: s(10),
      lineHeight: s(12),
      fontWeight: '500',
    },
    actionsRow: {
      marginTop: s(8),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    quantityRow: {
      width: s(110),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    quantityButton: {
      width: s(23),
      height: s(23),
      borderRadius: s(4),
      backgroundColor: Colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantitySymbol: {
      color: '#2D1F16',
      fontSize: s(17),
      lineHeight: s(17),
      fontWeight: '400',
    },
    quantityValueBox: {
      width: s(33),
      height: s(23),
      borderRadius: s(4),
      borderWidth: 1,
      borderColor: Colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.background,
    },
    quantityValue: {
      color: '#2D1F16',
      fontSize: s(17),
      lineHeight: s(17),
      fontWeight: '400',
    },
    removeButton: {
      minWidth: s(66),
      height: s(23),
      borderRadius: s(4),
      borderWidth: 1,
      borderColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(8),
    },
    removeText: {
      color: Colors.primary,
      fontSize: s(10),
      fontWeight: '700',
    },
    checkoutBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: s(78) + bottomInset,
      height: s(70),
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#E4E4E4',
      paddingHorizontal: s(28),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    totalText: {
      color: Colors.secondary,
      fontSize: s(18.5),
      lineHeight: s(21),
      fontWeight: '700',
    },
    checkoutButton: {
      width: s(172),
      height: s(27),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkoutButtonDisabled: {
      opacity: 0.5,
    },
    checkoutText: {
      color: '#FFFFFF',
      fontSize: s(13),
      lineHeight: s(16),
      fontWeight: '700',
    },
  });
}
