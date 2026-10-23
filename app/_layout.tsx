import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message';

import { BarraNavegacionWeb } from '../components/BarraNavegacionWeb';
import { Colors } from '../constants/theme';
import { useEsEscritorio } from '../hooks/useEsEscritorio';
import { ROUTES } from '../constants/routes';
import { sincronizarBorradores } from '../services/offlineService';
import { supabase } from '../services/supabase';
import { useEmpresaStore } from '../stores/useEmpresaStore';
import { useUsuarioStore } from '../stores/useUsuarioStore';

// Toast ámbar para avisos de modo offline.
const toastConfig: ToastConfig = {
  offline: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: Colors.warning }}
      text1NumberOfLines={2}
      text2NumberOfLines={2}
    />
  ),
};

export default function RootLayout() {
  const hidratarDesdeAuthUser = useUsuarioStore((state) => state.hidratarDesdeAuthUser);
  const router = useRouter();
  const segments = useSegments();
  const esEscritorio = useEsEscritorio();
  // `undefined` = aún se está resolviendo la sesión inicial.
  const [haySesion, setHaySesion] = useState<boolean | undefined>(undefined);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_600SemiBold: require('@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });

  useEffect(() => {
    if (!supabase) {
      hidratarDesdeAuthUser(null);
      setHaySesion(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setHaySesion(Boolean(data.session));
        hidratarDesdeAuthUser(data.session?.user ?? null);
      })
      .catch(() => {
        setHaySesion(false);
        hidratarDesdeAuthUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHaySesion(Boolean(session));
      hidratarDesdeAuthUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hidratarDesdeAuthUser]);

  // Empresas del usuario para el selector "actuar como".
  useEffect(() => {
    if (haySesion) {
      void useEmpresaStore.getState().cargar();
    } else if (haySesion === false) {
      useEmpresaStore.getState().limpiar();
    }
  }, [haySesion]);

  // Al recuperar la red (y con sesión) se suben los borradores de `ny_drafts`.
  useEffect(() => {
    if (!haySesion) {
      return;
    }

    const unsubscribe = NetInfo.addEventListener((estado) => {
      if (!estado.isConnected || estado.isInternetReachable === false) {
        return;
      }

      sincronizarBorradores()
        .then((cantidad) => {
          if (cantidad > 0) {
            Toast.show({
              type: 'success',
              text1: 'Borradores sincronizados',
              text2: `Se subieron ${cantidad} operación(es) pendientes.`,
            });
          }
        })
        .catch(() => {});
    });

    return unsubscribe;
  }, [haySesion]);

  // Guardia de rutas: sin sesión sólo se permiten las pantallas de (auth);
  // con sesión activa, (auth) redirige al home.
  useEffect(() => {
    if (haySesion === undefined) {
      return;
    }

    const enAuth = segments[0] === '(auth)';
    // El enlace de recuperación abre una sesión antes de elegir la contraseña nueva.
    const enNuevaContrasena = (segments as string[])[1] === 'nueva-contrasena';

    if (!haySesion && !enAuth) {
      router.replace(ROUTES.login);
    } else if (haySesion && enAuth && !enNuevaContrasena) {
      router.replace(ROUTES.home);
    }
  }, [haySesion, segments, router]);

  if (!fontsLoaded || haySesion === undefined) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      {esEscritorio && haySesion && segments[0] !== '(auth)' ? <BarraNavegacionWeb /> : null}
      <Stack initialRouteName="(auth)/login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/recuperar" />
        <Stack.Screen name="(auth)/nueva-contrasena" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="producto/[id]" />
        <Stack.Screen name="producto/nuevo" />
        <Stack.Screen name="editar/[id]" />
        <Stack.Screen name="mis-publicaciones" />
        <Stack.Screen name="mis-compras" />
        <Stack.Screen name="mis-ventas" />
        <Stack.Screen name="direcciones" />
        <Stack.Screen name="checkout/index" />
        <Stack.Screen name="empresa/index" />
        <Stack.Screen name="empresa/nueva" />
        <Stack.Screen name="empresa/sedes" />
        <Stack.Screen name="empresa/equipo" />
        <Stack.Screen name="invitacion" />
        <Stack.Screen name="tienda/[slug]" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="metricas" />
      </Stack>
      <Toast config={toastConfig} />
    </>
  );
}