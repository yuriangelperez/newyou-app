import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '../components/BottomTabBar';
import { ROUTES } from '../constants/routes';
import { Colors, Radius } from '../constants/theme';
import { supabase } from '../services/supabase';
import { selectTotalItems, useCarritoStore } from '../stores/useCarritoStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';

export default function PerfilScreen() {
  const router = useRouter();
  const usuario = useUsuarioStore((state) => state.usuario);
  const totalItems = useCarritoStore(selectTotalItems);
  const esVendedor = usuario?.tipo === 'vendedor';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const canvasWidth = Math.min(width, 412);
  const scale = canvasWidth / 412;
  const styles = useMemo(() => createStyles(scale, insets.bottom), [insets.bottom, scale]);

  const cerrarSesion = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    router.replace(ROUTES.login);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{usuario?.nombre ?? 'Invitado'}</Text>

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{usuario?.email ?? 'Sin sesion activa'}</Text>

          <Text style={styles.label}>Tipo de cuenta</Text>
          <Text style={styles.value}>{esVendedor ? 'Vendedor' : 'Comprador'}</Text>
        </View>

        <Pressable onPress={() => void cerrarSesion()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Cerrar Sesion</Text>
        </Pressable>
      </View>

      <BottomTabBar
        activeTab="menu"
        canvasWidth={canvasWidth}
        scale={scale}
        bottomInset={insets.bottom}
        cartCount={totalItems}
        esVendedor={esVendedor}
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
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: s(20),
      paddingTop: s(40),
      paddingBottom: s(26) + s(78) + bottomInset,
    },
    title: {
      fontSize: s(28),
      color: Colors.primary,
      marginBottom: s(20),
      fontFamily: 'Montserrat_700Bold',
    },
    card: {
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.lg,
      padding: s(16),
      rowGap: s(6),
    },
    label: {
      color: Colors.textMuted,
      fontSize: s(12),
      fontFamily: 'Montserrat_500Medium',
    },
    value: {
      color: Colors.text,
      fontSize: s(16),
      marginBottom: s(8),
      fontFamily: 'Montserrat_600SemiBold',
    },
    logoutButton: {
      marginTop: s(20),
      minHeight: s(46),
      borderRadius: Radius.md,
      backgroundColor: '#E9B4B4',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutText: {
      color: '#2D1F16',
      fontSize: s(15),
      fontFamily: 'Montserrat_700Bold',
    },
  });
}
