import React from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProductos } from '../../hooks/useProductos';

import { Producto } from '../../types';

const NAVIGATION_ICONS = {
  home: require('../../assets/images/bar-icons/home.png'),
  bag: require('../../assets/images/bar-icons/bolsa.png'),
  cart: require('../../assets/images/bar-icons/carrito.png'),
  menu: require('../../assets/images/bar-icons/barra-menu.png'),
};

const LOGO = require('../../assets/images/logo.png');
const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/0247d61d-82d7-4515-902d-6ef0b0bc1fa1.png';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = 157;

export default function HomeScreen() {
  const router = useRouter();
  const { productos, cargando, error, refrescar } = useProductos();

  const renderProductCard = ({ item }: { item: Producto }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/producto/detalleproducto', params: { id: item.id } })}
      style={[styles.productCard, !item.disponible && styles.cardDisabled]}
    >
      <View style={styles.productImage} />
      <Text style={styles.productTitle} numberOfLines={2}>{item.nombre}</Text>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>$$$$$</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!item.disponible}
          style={[styles.productAction, !item.disponible && styles.productActionDisabled]}
        >
          <Text style={styles.productActionText}>{item.disponible ? 'Agregar' : 'Agotado'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image accessibilityLabel="New You" source={LOGO} style={styles.logo} />
      </View>

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
          <Image accessibilityLabel="Ropero de New You" source={{ uri: HERO_IMAGE }} style={styles.heroImage} />
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
    backgroundColor: '#ffffff',
  },
  header: {
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f4',
    borderBottomWidth: 1,
    borderBottomColor: '#bdbdbd',
  },
  logo: {
    width: 105,
    height: 60,
    resizeMode: 'contain',
  },
  content: {
    paddingTop: 21,
    paddingBottom: 112,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 224,
    resizeMode: 'cover',
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    marginTop: 31,
  },
  productCard: {
    width: CARD_WIDTH,
    height: 222,
    padding: 11,
    borderRadius: 10,
    backgroundColor: '#e4e0e1',
  },
  cardDisabled: {
    opacity: 0.62,
  },
  productImage: {
    width: '100%',
    height: 133,
    borderRadius: 10,
    backgroundColor: '#aa876d',
  },
  productTitle: {
    height: 34,
    marginTop: 7,
    color: '#2d1f16',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  productPrice: {
    color: '#aa876d',
    fontSize: 18,
    fontWeight: '700',
  },
  productAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 61,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#aa876d',
  },
  productActionDisabled: {
    backgroundColor: '#8f8f8f',
  },
  productActionText: {
    color: '#2d1f16',
    fontSize: 8,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 92,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: '#f4f4f4',
    shadowColor: '#2d1f16',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#d0d0d0',
    paddingTop: 5,
    paddingBottom: 20,
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
    borderRadius: 10,
  },
  activeIconContainer: {
    backgroundColor: '#d5bfb3',
  },
  tabIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
});
