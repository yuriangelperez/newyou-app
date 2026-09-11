import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

import { BottomTabBar } from '../components/BottomTabBar';
import { BRANDING_LOGO, CATEGORY_DIAGONAL_CUT } from '../constants/assets';
import { ROUTES } from '../constants/routes';
import { Colors } from '../constants/theme';
import { selectTotalItems, useCarritoStore } from '../stores/useCarritoStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';

const CANVAS_WIDTH = 412;
const FILTERS = ['TODO', 'TORSO', 'PIERNAS', 'ACCESORIOS', 'CALZADO'];

const CATEGORY_BY_FILTER: Record<string, Array<{ id: string; label: string; image: string }>> = {
  TODO: [
    { id: 'camisas', label: 'CAMISAS', image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600' },
    { id: 'camperas', label: 'CAMPERAS', image: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600' },
    { id: 'brasieres', label: 'BRASIERES', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600' },
    { id: 'buzos', label: 'BUZOS', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600' },
    { id: 'faldas', label: 'FALDAS', image: 'https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=600' },
    { id: 'pantalones', label: 'PANTALONES', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600' },
    { id: 'shorts', label: 'SHORTS', image: 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=600' },
    { id: 'botas', label: 'BOTAS', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' },
  ],
  TORSO: [
    { id: 'camisas', label: 'CAMISAS', image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600' },
    { id: 'camperas', label: 'CAMPERAS', image: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600' },
    { id: 'brasieres', label: 'BRASIERES', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600' },
    { id: 'buzos', label: 'BUZOS', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600' },
  ],
  PIERNAS: [
    { id: 'faldas', label: 'FALDAS', image: 'https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=600' },
    { id: 'pantalones', label: 'PANTALONES', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600' },
    { id: 'shorts', label: 'SHORTS', image: 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=600' },
    { id: 'jeans', label: 'JEANS', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600' },
  ],
  ACCESORIOS: [
    { id: 'cinturones', label: 'CINTURONES', image: 'https://images.unsplash.com/photo-1612902456551-333ac5afa26d?w=600' },
    { id: 'carteras', label: 'CARTERAS', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600' },
    { id: 'gorras', label: 'GORRAS', image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600' },
    { id: 'lentes', label: 'LENTES', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600' },
  ],
  CALZADO: [
    { id: 'botas', label: 'BOTAS', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600' },
    { id: 'zapatillas', label: 'ZAPATILLAS', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
    { id: 'sandalias', label: 'SANDALIAS', image: 'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=600' },
    { id: 'mocasines', label: 'MOCASINES', image: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600' },
  ],
};

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = useUsuarioStore((state) => state.usuario?.tipo === 'vendedor');
  const [activeFilter, setActiveFilter] = useState('TODO');

  const canvasWidth = Math.min(width, CANVAS_WIDTH);
  const scale = canvasWidth / CANVAS_WIDTH;
  const styles = useMemo(
    () => createStyles(scale, canvasWidth, insets.top, insets.bottom),
    [canvasWidth, insets.bottom, insets.top, scale]
  );

  const categoryItems = CATEGORY_BY_FILTER[activeFilter];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Image source={BRANDING_LOGO} style={styles.logo} />
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, filter === activeFilter && styles.filterChipActive]}
            >
              <Text style={styles.filterText}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={categoryItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <Image source={CATEGORY_DIAGONAL_CUT} style={styles.cardBottomCut} />
            <Text style={styles.cardText}>{item.label}</Text>
          </Pressable>
        )}
      />

      <BottomTabBar
        activeTab="bag"
        canvasWidth={canvasWidth}
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

function createStyles(scale: number, canvasWidth: number, topInset: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      paddingTop: topInset,
      height: topInset + s(76),
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: Colors.secondary,
    },
    logo: {
      width: s(105),
      height: s(60),
      resizeMode: 'contain',
    },
    filtersWrap: {
      marginTop: s(14),
      height: s(34),
    },
    filtersContent: {
      paddingHorizontal: s(20),
      columnGap: s(4),
      alignItems: 'center',
    },
    filterChip: {
      width: s(104),
      height: s(27),
      borderRadius: s(10),
      backgroundColor: '#D9D9D9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipActive: {
      backgroundColor: Colors.tertiary,
    },
    filterText: {
      color: '#000000',
      fontSize: s(12),
      lineHeight: s(14),
      fontWeight: '400',
    },
    gridContent: {
      paddingTop: s(10),
      paddingBottom: s(26) + s(78) + bottomInset,
    },
    gridRow: {
      paddingHorizontal: s(19),
      justifyContent: 'space-between',
      marginTop: s(10),
    },
    card: {
      width: s(175),
      height: s(99),
      borderRadius: s(10),
      backgroundColor: Colors.secondary,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      alignItems: 'center',
      position: 'relative',
    },
    cardImage: {
      ...StyleSheet.absoluteFill,
      width: undefined,
      height: undefined,
      resizeMode: 'cover',
      opacity: 0.9,
    },
    cardBottomCut: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: -1,
      width: '100%',
      height: s(52),
      resizeMode: 'cover',
    },
    cardText: {
      marginBottom: s(18),
      color: '#000000',
      fontSize: s(17),
      lineHeight: s(18),
      fontWeight: '400',
      position: 'relative',
      zIndex: 1,
    },
  });
}
