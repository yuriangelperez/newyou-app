import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { TAB_BAR_ICONS } from '../constants/assets';
import { Colors } from '../constants/theme';

type TabKey = 'home' | 'bag' | 'cart' | 'menu';

interface BottomTabBarProps {
  activeTab: TabKey;
  canvasWidth: number;
  scale: number;
  bottomInset: number;
  cartCount: number;
  esVendedor?: boolean;
  onPressHome?: () => void;
  onPressBag?: () => void;
  onPressCart?: () => void;
  onPressMenu?: () => void;
  onPressCreate?: () => void;
}

export function BottomTabBar({
  activeTab,
  canvasWidth,
  scale,
  bottomInset,
  cartCount,
  esVendedor = false,
  onPressHome,
  onPressBag,
  onPressCart,
  onPressMenu,
  onPressCreate,
}: BottomTabBarProps) {
  const styles = createStyles(scale, canvasWidth, bottomInset);

  return (
    <View style={styles.tabBar}>
      <View style={styles.tabBarInner}>
        <TabButton
          active={activeTab === 'home'}
          icon={TAB_BAR_ICONS.home}
          onPress={onPressHome}
          styles={styles}
        />
        <TabButton
          active={activeTab === 'bag'}
          icon={TAB_BAR_ICONS.bag}
          onPress={onPressBag}
          styles={styles}
        />
        {esVendedor ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir prenda"
            onPress={onPressCreate}
            style={styles.createTabButton}>
            <View style={styles.createCircle}>
              <Ionicons name="add" size={30 * scale} color="#2D1F16" />
            </View>
          </Pressable>
        ) : null}
        <TabButton
          active={activeTab === 'cart'}
          icon={TAB_BAR_ICONS.cart}
          onPress={onPressCart}
          styles={styles}
          badgeCount={cartCount}
        />
        <TabButton
          active={activeTab === 'menu'}
          compact
          icon={TAB_BAR_ICONS.menu}
          onPress={onPressMenu}
          styles={styles}
        />
      </View>
    </View>
  );
}

function TabButton({
  active,
  compact,
  icon,
  onPress,
  styles,
  badgeCount = 0,
}: {
  active: boolean;
  compact?: boolean;
  icon: number;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
  badgeCount?: number;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && active} style={styles.tabItem}>
      <View style={[styles.tabBackground, active && styles.tabBackgroundActive]}>
        <Image source={icon} style={[compact ? styles.tabIconCompact : styles.tabIcon, active && styles.tabIconActive]} />
        {badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(scale: number, canvasWidth: number, bottomInset: number) {
  const s = (value: number) => value * scale;

  return StyleSheet.create({
    tabBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: s(78) + bottomInset,
      paddingBottom: Math.max(bottomInset, s(6)),
      backgroundColor: Colors.background,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.08,
      shadowRadius: s(3),
      elevation: 5,
    },
    tabBarInner: {
      width: canvasWidth,
      alignSelf: 'center',
      paddingHorizontal: s(26),
      paddingTop: s(5),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tabItem: {
      width: s(60),
      height: s(60),
      alignItems: 'center',
      justifyContent: 'center',
    },
    createTabButton: {
      width: s(60),
      height: s(60),
      alignItems: 'center',
      justifyContent: 'center',
    },
    createCircle: {
      width: s(52),
      height: s(52),
      borderRadius: s(26),
      backgroundColor: Colors.tertiary,
      borderWidth: s(2),
      borderColor: Colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBackground: {
      width: s(60),
      height: s(60),
      borderRadius: s(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBackgroundActive: {
      backgroundColor: Colors.tertiary,
    },
    tabIcon: {
      width: s(40),
      height: s(40),
      resizeMode: 'contain',
      opacity: 0.5,
    },
    tabIconCompact: {
      width: s(38),
      height: s(38),
      resizeMode: 'contain',
      opacity: 0.5,
    },
    tabIconActive: {
      opacity: 1,
    },
    badge: {
      position: 'absolute',
      top: s(4),
      right: s(4),
      minWidth: s(18),
      height: s(18),
      borderRadius: s(9),
      backgroundColor: '#E24B4B',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s(3),
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: s(10),
      lineHeight: s(11),
      fontWeight: '700',
    },
  });
}
