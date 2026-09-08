import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { BRANDING_LOGO, PRODUCT_DETAIL_ICONS } from '../../constants/assets';
import { ROUTES } from '../../constants/routes';
import { Colors } from '../../constants/theme';
import { useCart } from '../../context/cart';
import { PRODUCTOS_MOCK } from '../../data/mockData';

const CANVAS_WIDTH = 412;
const EXTRA_PHOTO_SLOTS = 4;

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const COLOR_OPTIONS = ['Marron', 'Negro', 'Beige'];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { addToCart, totalItems } = useCart();

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom),
    [canvasWidth, insets.bottom, insets.top, scale]
  );

  const producto = useMemo(
    () => PRODUCTOS_MOCK.find((item) => item.id === id) ?? PRODUCTOS_MOCK[0],
    [id]
  );
  const talles = producto.talle?.length ? producto.talle : DEFAULT_SIZES;
  const galleryImages = useMemo(
    () => Array.from({ length: EXTRA_PHOTO_SLOTS }, () => producto.imagen),
    [producto.imagen]
  );
  const detailItems = useMemo(
    () => [
      producto.descripcion,
      `Talles disponibles: ${talles.join(', ')}.`,
      producto.disponible ? 'Disponible para compra inmediata.' : 'Producto agotado por el momento.',
    ],
    [producto.descripcion, producto.disponible, talles]
  );

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(talles[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [purchaseFeedback, setPurchaseFeedback] = useState(false);
  const favoriteScale = useState(() => new Animated.Value(1))[0];
  const purchaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedSize(talles[0]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setQuantity(1);
  }, [producto.id, talles]);

  useEffect(
    () => () => {
      if (purchaseTimerRef.current) {
        clearTimeout(purchaseTimerRef.current);
      }
    },
    []
  );

  const toggleFavorite = () => {
    setIsFavorite((current) => !current);
    Animated.sequence([
      Animated.timing(favoriteScale, { toValue: 1.22, duration: 120, useNativeDriver: true }),
      Animated.spring(favoriteScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }),
    ]).start();
  };

  const onPressComprar = () => {
    if (!producto.disponible) {
      return;
    }
    addToCart({
      producto,
      talle: selectedSize,
      color: selectedColor,
      cantidad: quantity,
    });
    setPurchaseFeedback(true);
    if (purchaseTimerRef.current) {
      clearTimeout(purchaseTimerRef.current);
    }
    purchaseTimerRef.current = setTimeout(() => setPurchaseFeedback(false), 900);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.canvas}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.headerIconButton}>
            <Image source={PRODUCT_DETAIL_ICONS.back} style={styles.headerIcon} />
          </Pressable>

          <Image accessibilityLabel="New You" source={BRANDING_LOGO} style={styles.logo} />

          <Pressable accessibilityLabel="Favorito" onPress={toggleFavorite} style={styles.headerIconButton}>
            <Animated.Image
              source={isFavorite ? PRODUCT_DETAIL_ICONS.favoriteOn : PRODUCT_DETAIL_ICONS.favoriteOff}
              style={[
                styles.favoriteIcon,
                { transform: [{ scale: favoriteScale }] },
              ]}
            />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.galleryRow}>
            <View style={styles.thumbnailColumn}>
              {galleryImages.map((image, index) => {
                const isSelected = index === selectedImageIndex;

                return (
                  <Pressable
                    key={`${producto.id}-${index}`}
                    accessibilityLabel={`Foto ${index + 1} del producto`}
                    onPress={() => setSelectedImageIndex(index)}
                    style={[styles.thumbnailFrame, isSelected && styles.thumbnailFrameSelected]}
                  >
                    <Image source={{ uri: image }} style={styles.thumbnailImage} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.mainImageFrame}>
              <Image source={{ uri: galleryImages[selectedImageIndex] }} style={styles.mainImage} />
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text numberOfLines={2} style={styles.productName}>
              {producto.nombre}
            </Text>
            <Text style={styles.price}>${producto.precio.toLocaleString('es-AR')}</Text>

            <View style={styles.sizeSelector}>
              <View style={styles.sizeLabelsRow}>
                {talles.map((size) => (
                  <Text key={`label-${size}`} style={styles.sizeLabel}>
                    {size}
                  </Text>
                ))}
              </View>

              <View style={styles.sizeChipsRow}>
                {talles.map((size) => {
                  const isSelected = size === selectedSize;

                  return (
                    <Pressable
                      key={size}
                      accessibilityLabel={`Seleccionar talle ${size}`}
                      onPress={() => setSelectedSize(size)}
                      style={[styles.sizeChip, isSelected && styles.sizeChipSelected]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.colorSelector}>
              <Text style={styles.colorLabel}>Color:</Text>
              <View style={styles.colorChipsRow}>
                {COLOR_OPTIONS.map((color) => {
                  const isSelected = color === selectedColor;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[styles.colorChip, isSelected && styles.colorChipSelected]}
                    >
                      <Text style={[styles.colorChipText, isSelected && styles.colorChipTextSelected]}>{color}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.quantityRow}>
              <Pressable
                accessibilityLabel="Disminuir cantidad"
                onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </Pressable>

              <View style={styles.quantityValueBox}>
                <Text style={styles.quantityValueText}>{quantity}</Text>
              </View>

              <Pressable
                accessibilityLabel="Aumentar cantidad"
                onPress={() => setQuantity((current) => current + 1)}
                style={styles.quantityButton}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.descriptionList}>
              {detailItems.map((item, index) => (
                <View key={`${producto.id}-detail-${index}`} style={styles.descriptionItem}>
                  <Text style={styles.bulletMarker}>{'\u2022'}</Text>
                  <Text style={styles.descriptionText}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityLabel="Comprar producto"
              onPress={onPressComprar}
              disabled={!producto.disponible}
              style={[styles.buyButton, !producto.disponible && styles.buyButtonDisabled, purchaseFeedback && styles.buyButtonAdded]}
            >
              <Text style={styles.buyButtonText}>
                {producto.disponible ? (purchaseFeedback ? 'AGREGADO' : 'COMPRAR') : 'AGOTADO'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <BottomTabBar
        activeTab="bag"
        canvasWidth={canvasWidth}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        onPressHome={() => router.replace(ROUTES.home)}
        onPressBag={() => router.push(ROUTES.categories)}
        onPressCart={() => router.push(ROUTES.cart)}
      />
    </View>
  );
}

function createStyles(scale: number, canvasWidth: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    canvas: {
      flex: 1,
      width: canvasWidth,
      alignSelf: 'center',
      backgroundColor: Colors.background,
    },
    header: {
      paddingTop: topInset,
      height: topInset + s(76),
      paddingHorizontal: s(15),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.background,
      borderBottomWidth: s(2),
      borderBottomColor: Colors.secondary,
    },
    headerIconButton: {
      width: s(39),
      height: s(39),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIcon: {
      width: s(39),
      height: s(39),
      resizeMode: 'contain',
    },
    favoriteIcon: {
      width: s(38),
      height: s(38),
      resizeMode: 'contain',
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: 'contain',
    },
    scrollContent: {
      paddingTop: s(23),
      paddingBottom: s(122) + bottomInset,
    },
    galleryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingLeft: s(24),
      paddingRight: s(27),
      columnGap: s(24),
    },
    thumbnailColumn: {
      width: s(57),
      rowGap: s(18),
    },
    thumbnailFrame: {
      width: s(57),
      height: s(57),
      borderRadius: s(10),
      borderWidth: s(5),
      borderColor: Colors.secondary,
      backgroundColor: '#E8D7CB',
      overflow: 'hidden',
    },
    thumbnailFrameSelected: {
      backgroundColor: '#E4D0C2',
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    mainImageFrame: {
      width: s(275),
      height: s(275),
      borderRadius: s(10),
      borderWidth: s(5),
      borderColor: Colors.secondary,
      backgroundColor: '#E8D7CB',
      overflow: 'hidden',
    },
    mainImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    infoSection: {
      marginTop: s(14),
      marginLeft: s(38),
      marginRight: s(38),
    },
    productName: {
      color: '#2D1F16',
      fontSize: s(30),
      lineHeight: s(36),
      fontWeight: '600',
    },
    price: {
      marginTop: s(8),
      color: Colors.secondary,
      fontSize: s(30),
      lineHeight: s(36),
      fontWeight: '700',
    },
    sizeSelector: {
      marginTop: s(18),
      alignSelf: 'flex-start',
      rowGap: s(8),
    },
    sizeLabelsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: s(8),
    },
    sizeLabel: {
      width: s(34),
      color: '#000000',
      textAlign: 'center',
      fontSize: s(15),
      lineHeight: s(19),
      fontWeight: '500',
    },
    sizeChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: s(8),
    },
    colorSelector: {
      marginTop: s(12),
      rowGap: s(6),
    },
    colorLabel: {
      color: '#2D1F16',
      fontSize: s(14),
      lineHeight: s(16),
      fontWeight: '600',
    },
    colorChipsRow: {
      flexDirection: 'row',
      columnGap: s(8),
    },
    colorChip: {
      minWidth: s(64),
      height: s(24),
      borderRadius: s(12),
      borderWidth: 1,
      borderColor: Colors.secondary,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(10),
    },
    colorChipSelected: {
      backgroundColor: Colors.secondary,
    },
    colorChipText: {
      color: '#2D1F16',
      fontSize: s(11),
      lineHeight: s(12),
      fontWeight: '500',
    },
    colorChipTextSelected: {
      color: '#FFFFFF',
    },
    sizeChip: {
      width: s(34),
      height: s(34),
      borderRadius: s(10),
      backgroundColor: '#E8D7CB',
      borderWidth: 1,
      borderColor: Colors.tertiary,
    },
    sizeChipSelected: {
      backgroundColor: Colors.secondary,
      borderColor: Colors.secondary,
    },
    quantityRow: {
      marginTop: s(24),
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: s(12),
    },
    quantityButton: {
      width: s(35),
      height: s(35),
      borderRadius: s(4),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.secondary,
    },
    quantityButtonText: {
      color: '#2D1F16',
      fontSize: s(20),
      lineHeight: s(23),
      fontWeight: '400',
    },
    quantityValueBox: {
      width: s(47),
      height: s(38),
      borderRadius: s(4),
      borderWidth: s(2),
      borderColor: Colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.background,
    },
    quantityValueText: {
      color: '#2D1F16',
      fontSize: s(20),
      lineHeight: s(23),
      fontWeight: '400',
    },
    descriptionList: {
      marginTop: s(17),
      rowGap: s(10),
      maxWidth: s(300),
    },
    descriptionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: s(8),
    },
    bulletMarker: {
      marginTop: s(2),
      color: '#2D1F16',
      fontSize: s(15),
      lineHeight: s(22),
    },
    descriptionText: {
      flex: 1,
      color: '#2D1F16',
      fontSize: s(15),
      lineHeight: s(26),
      fontWeight: '500',
    },
    buyButton: {
      width: s(225),
      minHeight: s(48),
      marginTop: s(18),
      marginBottom: s(8),
      borderRadius: s(10),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.secondary,
      paddingVertical: s(8),
    },
    buyButtonDisabled: {
      opacity: 0.7,
    },
    buyButtonAdded: {
      backgroundColor: '#87B279',
    },
    buyButtonText: {
      color: '#2D1F16',
      fontSize: s(22),
      lineHeight: s(27),
      fontWeight: '600',
      letterSpacing: s(0.4),
    },
  });
}