import React, { useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProductos } from '../../hooks/useProductos';

import { Colors } from '../../constants/theme';
import { PRODUCTOS_MOCK } from '../../data/mockData';
import { Producto } from '../../types';

const NAVIGATION_ICONS = {
  home: require('../../assets/images/bar-icons/home.png'),
  bag: require('../../assets/images/bar-icons/bolsa.png'),
  cart: require('../../assets/images/bar-icons/carrito.png'),
  menu: require('../../assets/images/bar-icons/bar-hamburguesa.png'),
};

const LOGO = require('../../assets/images/logo.png');
const HERO_WIDTH = Dimensions.get('window').width;
const HERO_IMAGES = PRODUCTOS_MOCK.slice(0, 3).map((producto) => producto.imagen);

export default function HomeScreen() {
  const { productos, cargando, error, refrescar } = useProductos();
  const [heroIndex, setHeroIndex] = useState(0);

  const renderProductCard = ({ item }: { item: Producto }) => (
    <View style={[styles.productCard, !item.disponible && styles.cardDisabled]}>
      <Image source={{ uri: item.imagen }} style={styles.productImage} />
      <Text style={styles.productTitle} numberOfLines={2}>{item.nombre}</Text>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>${item.precio.toLocaleString('es-AR')}</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!item.disponible}
          style={[styles.productAction, !item.disponible && styles.productActionDisabled]}
        >
          <Text style={styles.productActionText}>{item.disponible ? 'Agregar' : 'Agotado'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image accessibilityLabel="New You" source={LOGO} style={styles.logo} />
      </View>
      <View style={styles.headerStrip} />

      <FlatList
        data={productos}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.productRow}
        refreshing={cargando}
        onRefresh={refrescar}
        ListHeaderComponent={
          <View style={styles.hero}>
            <FlatList
              data={HERO_IMAGES}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroCarousel}
              keyExtractor={(_, index) => `hero-${index}`}
              onMomentumScrollEnd={(event) => {
                setHeroIndex(Math.round(event.nativeEvent.contentOffset.x / HERO_WIDTH));
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} />
              )}
            />
            <View style={styles.paginationDots}>
              {HERO_IMAGES.map((_, index) => (
                <View key={index} style={[styles.dot, heroIndex === index && styles.activeDot]} />
              ))}
            </View>
          </View>
        }
      />

      <View style={styles.tabBar}>
        <TabButton accessibilityLabel="Inicio" icon={NAVIGATION_ICONS.home} active />
        <TabButton accessibilityLabel="Bolsa" icon={NAVIGATION_ICONS.bag} />
        <TabButton accessibilityLabel="Carrito" icon={NAVIGATION_ICONS.cart} />
        <TabButton accessibilityLabel="Menú" icon={NAVIGATION_ICONS.menu} />
      </View>
    </View>
  );
}

function TabButton({ accessibilityLabel, active = false, icon }: {
  accessibilityLabel: string;
  active?: boolean;
  icon: number;
}) {
  return (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} style={styles.tabItem}>
      <View style={[styles.iconContainer, active && styles.activeIconContainer]}>
        <Image source={icon} style={styles.tabIcon} />
      </View>
    </TouchableOpacity>
  );
}

// Estilos para la aplicación New You
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerStrip: {
    height: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    width: 94,
    height: 48,
    resizeMode: 'contain',
  },
  content: {
    paddingBottom: 92,
  },
  hero: {
    height: 146,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.secondary,
  },
  heroImage: {
    width: HERO_WIDTH,
    height: 146,
    resizeMode: 'cover',
  },
  heroCarousel: {
    height: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    marginHorizontal: 4,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  activeDot: {
    backgroundColor: Colors.surface,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  productCard: {
    width: '46%',
    minHeight: 172,
    padding: 7,
    borderRadius: 7,
    backgroundColor: Colors.background,
  },
  cardDisabled: {
    opacity: 0.62,
  },
  productImage: {
    width: '100%',
    height: 112,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
  },
  productTitle: {
    height: 24,
    marginTop: 7,
    color: '#262020',
    fontSize: 12,
    lineHeight: 16,
  },
  productFooter: {
    marginTop: 2,
  },
  productPrice: {
    color: Colors.secondary,
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  productAction: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  productActionDisabled: {
    backgroundColor: '#9B9B9B',
  },
  productActionText: {
    color: Colors.surface,
    fontSize: 8,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 69,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flex: 1,
  },
  iconContainer: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeIconContainer: {
    backgroundColor: Colors.secondary,
  },
  tabIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
