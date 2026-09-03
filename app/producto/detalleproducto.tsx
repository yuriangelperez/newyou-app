import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';
import { PRODUCTOS_MOCK } from '../../data/mockData';

const LOGO = require('../../assets/images/logo.png');
const HOME_ICON = require('../../assets/images/bar-icons/home.png');
const BAG_ICON = require('../../assets/images/bar-icons/bolsa.png');
const CART_ICON = require('../../assets/images/bar-icons/carrito.png');
const MENU_ICON = require('../../assets/images/bar-icons/bar-hamburguesa.png');

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export default function DetalleProductoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const producto = useMemo(
    () => PRODUCTOS_MOCK.find((item) => item.id === id) ?? PRODUCTOS_MOCK[0],
    [id]
  );

  const sizes = producto.talle?.length ? producto.talle : DEFAULT_SIZES;
  const [selectedSize, setSelectedSize] = useState(sizes[0]);
  const [cantidad, setCantidad] = useState(1);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>❮</Text>
        </Pressable>
        <Image source={LOGO} style={styles.logo} />
        <View style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>★</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.galleryRow}>
          <View style={styles.thumbColumn}>
            {[0, 1, 2, 3].map((thumb) => (
              <Pressable key={thumb} style={styles.thumb} />
            ))}
          </View>
          <Image source={{ uri: producto.imagen }} style={styles.mainImage} />
        </View>

        <Text numberOfLines={1} style={styles.productName}>
          {producto.nombre}
        </Text>
        <Text style={styles.price}>${producto.precio.toLocaleString('es-AR')}</Text>

        <View style={styles.sizesSection}>
          <View style={styles.sizeLabelsRow}>
            {sizes.map((size) => (
              <Text key={`label-${size}`} style={styles.sizeLabel}>
                {size}
              </Text>
            ))}
          </View>
          <View style={styles.sizeChipsRow}>
            {sizes.map((size) => {
              const selected = size === selectedSize;
              return (
                <Pressable
                  key={size}
                  onPress={() => setSelectedSize(size)}
                  style={[styles.sizeChip, selected && styles.sizeChipSelected]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.counterRow}>
          <Pressable onPress={() => setCantidad((prev) => Math.max(1, prev - 1))} style={styles.counterButton}>
            <Text style={styles.counterSymbol}>-</Text>
          </Pressable>
          <View style={styles.counterValueBox}>
            <Text style={styles.counterValue}>{cantidad}</Text>
          </View>
          <Pressable onPress={() => setCantidad((prev) => prev + 1)} style={styles.counterButton}>
            <Text style={styles.counterSymbol}>+</Text>
          </Pressable>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.bullet}>•  Lorem ipsum dolor sit amet</Text>
          <Text style={styles.bullet}>•  consectetur adipiscing elit.</Text>
          <Text style={styles.bullet}>•  asfaf</Text>
        </View>

        <Pressable style={styles.buyButton}>
          <Text style={styles.buyButtonText}>COMPRAR</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomIconsRow}>
          <Image source={HOME_ICON} style={[styles.bottomIcon, styles.inactiveIcon]} />
          <View style={styles.activeIconSlot}>
            <Image source={BAG_ICON} style={styles.bottomIcon} />
          </View>
          <Image source={CART_ICON} style={[styles.bottomIcon, styles.inactiveIcon]} />
          <Image source={MENU_ICON} style={[styles.bottomIcon, styles.inactiveIcon]} />
        </View>
        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 60,
    marginHorizontal: 15,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 39,
    height: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: Colors.secondary,
    fontSize: 32,
    fontWeight: '700',
  },
  logo: {
    width: 105,
    height: 60,
    resizeMode: 'contain',
  },
  favoriteButton: {
    width: 39,
    height: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    color: '#A6A7A8',
    fontSize: 34,
    lineHeight: 34,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  galleryRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbColumn: {
    width: 65,
    gap: 18,
    marginRight: 16,
  },
  thumb: {
    width: 65,
    height: 65,
    borderRadius: Radius.md + 2,
    borderWidth: 5,
    borderColor: Colors.secondary,
    backgroundColor: '#E8D7CB',
  },
  mainImage: {
    flex: 1,
    height: 275,
    borderRadius: Radius.md + 2,
    borderWidth: 5,
    borderColor: Colors.secondary,
    backgroundColor: '#E8D7CB',
  },
  productName: {
    marginTop: 10,
    color: '#2D1F16',
    fontSize: 30,
    fontWeight: '600',
  },
  price: {
    marginTop: 4,
    color: Colors.secondary,
    fontSize: 30,
    fontWeight: '700',
  },
  sizesSection: {
    marginTop: 12,
    width: 220,
  },
  sizeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sizeLabel: {
    width: 34,
    textAlign: 'center',
    fontSize: FontSize.md,
    color: '#000000',
    fontWeight: '500',
  },
  sizeChipsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sizeChip: {
    width: 34,
    height: 34,
    borderRadius: Radius.md + 2,
    backgroundColor: '#E8D7CB',
    borderWidth: 1,
    borderColor: Colors.tertiary,
  },
  sizeChipSelected: {
    backgroundColor: Colors.secondary,
  },
  counterRow: {
    marginTop: 14,
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterButton: {
    width: 35,
    height: 35,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterSymbol: {
    fontSize: FontSize.xl,
    color: '#2D1F16',
  },
  counterValueBox: {
    width: 47,
    height: 38,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  counterValue: {
    color: '#2D1F16',
    fontSize: FontSize.xl,
  },
  descriptionSection: {
    marginTop: 14,
    gap: 8,
  },
  bullet: {
    color: '#2D1F16',
    fontSize: 15,
    lineHeight: 26,
  },
  buyButton: {
    marginTop: 10,
    alignSelf: 'center',
    width: 225,
    height: 45,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#2D1F16',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 85,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  bottomIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  bottomIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  inactiveIcon: {
    opacity: 0.5,
  },
  activeIconSlot: {
    width: 60,
    height: 60,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -67,
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#000000',
  },
});
