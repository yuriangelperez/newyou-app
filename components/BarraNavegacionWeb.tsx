import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { BRANDING_LOGO } from '../constants/assets';
import { ROUTES } from '../constants/routes';
import { Colors, FontSize, Radius, Shadow, Spacing } from '../constants/theme';
import { usePuedeVender } from '../hooks/usePuedeVender';
import { selectTotalItems, useCarritoStore } from '../stores/useCarritoStore';
import { selectEmpresaActiva, useEmpresaStore } from '../stores/useEmpresaStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';

type Destino = { texto: string; icono: keyof typeof Ionicons.glyphMap; ruta: string; activo: (path: string) => boolean };

const DESTINOS: Destino[] = [
  { texto: 'Inicio', icono: 'home-outline', ruta: ROUTES.home, activo: (p) => p === '/' },
  { texto: 'Categorías', icono: 'grid-outline', ruta: ROUTES.categories, activo: (p) => p.startsWith('/categorias') },
  { texto: 'Favoritos', icono: 'star-outline', ruta: ROUTES.favorites, activo: (p) => p.startsWith('/favoritos') },
  { texto: 'Mis compras', icono: 'bag-handle-outline', ruta: ROUTES.myPurchases, activo: (p) => p.startsWith('/mis-compras') },
];

/** Navegación de escritorio para la web: reemplaza a la barra inferior pensada para el celular. */
export function BarraNavegacionWeb() {
  const router = useRouter();
  const pathname = usePathname();
  const usuario = useUsuarioStore((state) => state.usuario);
  const totalItems = useCarritoStore(selectTotalItems);
  const puedeVender = usePuedeVender();
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Pressable accessibilityLabel="Ir al inicio" onPress={() => router.replace(ROUTES.home)}>
          <Image source={BRANDING_LOGO} tintColor={Colors.textStrong} style={styles.logo} />
        </Pressable>

        <View style={styles.links}>
          {DESTINOS.map((destino) => {
            const activo = destino.activo(pathname);
            return (
              <Pressable
                key={destino.texto}
                onPress={() => router.push(destino.ruta as never)}
                // react-native-web agrega `hovered` al estado del Pressable.
                style={(estado) => [styles.link, (activo || (estado as { hovered?: boolean }).hovered) && styles.linkActive]}
              >
                <Ionicons name={destino.icono} size={18} color={activo ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.linkText, activo && styles.linkTextActive]}>{destino.texto}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          {puedeVender ? (
            <Pressable onPress={() => router.push(ROUTES.newProduct)} style={styles.publish}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.publishText}>Publicar</Text>
            </Pressable>
          ) : null}

          <Pressable accessibilityLabel="Carrito" onPress={() => router.push(ROUTES.cart)} style={styles.iconButton}>
            <Ionicons name="cart-outline" size={22} color={Colors.primary} />
            {totalItems > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable onPress={() => router.push(ROUTES.profile)} style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(usuario?.nombre ?? '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text numberOfLines={1} style={styles.profileName}>
                {usuario?.nombre ?? 'Mi cuenta'}
              </Text>
              {empresaActiva ? (
                <Text numberOfLines={1} style={styles.profileContext}>
                  {empresaActiva.nombre}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    ...Shadow.card,
  },
  inner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    height: 68,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.lg,
  },
  logo: { width: 92, height: 44, resizeMode: 'contain' },
  links: { flex: 1, flexDirection: 'row', columnGap: Spacing.xs },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  linkActive: { backgroundColor: Colors.background },
  linkText: { color: Colors.textMuted, fontSize: FontSize.md, fontFamily: 'Montserrat_600SemiBold' },
  linkTextActive: { color: Colors.primary },
  actions: { flexDirection: 'row', alignItems: 'center', columnGap: Spacing.md },
  publish: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondary,
  },
  publishText: { color: Colors.white, fontSize: FontSize.md, fontFamily: 'Montserrat_700Bold' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 10, fontFamily: 'Montserrat_700Bold' },
  profile: { flexDirection: 'row', alignItems: 'center', columnGap: Spacing.sm, maxWidth: 200 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: FontSize.md, fontFamily: 'Montserrat_700Bold' },
  profileName: { color: Colors.primary, fontSize: FontSize.md, fontFamily: 'Montserrat_600SemiBold' },
  profileContext: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: 'Montserrat_500Medium' },
});
