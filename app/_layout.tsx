import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message';

import { BarraNavegacionWeb } from '../components/BarraNavegacionWeb';
import { TarjetaBienvenida } from '../components/TarjetaBienvenida';
import { Colors } from '../constants/theme';
import { useEsEscritorio } from '../hooks/useEsEscritorio';
import { ROUTES } from '../constants/routes';
import { bienvenidaVista, marcarBienvenidaVista } from '../services/bienvenidaService';
import { notificacionesDisponibles } from '../services/notificacionesService';
import { sincronizarBorradores } from '../services/offlineService';
import { supabase } from '../services/supabase';
import { tokenService } from '../services/tokenService';
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
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_600SemiBold: require('@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });

  // La primera vez que se abre la app aparece la tarjeta de bienvenida, haya sesión o no
  // (una sesión guardada salta el login, así que la tarjeta no puede vivir sólo ahí).
  useEffect(() => {
    void bienvenidaVista().then((vista) => setMostrarBienvenida(!vista));
  }, []);

  const cerrarBienvenida = () => {
    setMostrarBienvenida(false);
    void marcarBienvenidaVista();
  };

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
      // El JWT queda también en SecureStore (cifrado) para el interceptor de la Clase 8.
      void (session
        ? tokenService.save(session.access_token, session.user.id)
        : tokenService.clear()
      ).catch(() => undefined);
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

  // Al tocar una notificación se abre la pantalla que corresponde.
  useEffect(() => {
    if (!notificacionesDisponibles || !haySesion) {
      return;
    }

    const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
      const datos = respuesta.notification.request.content.data as {
        tipo?: string;
        productoId?: string;
      };
      if (datos.tipo === 'venta') {
        router.push(ROUTES.mySales);
      } else if (datos.tipo === 'compra') {
        router.push(ROUTES.myPurchases);
      } else if (datos.productoId) {
        router.push({ pathname: ROUTES.productDetail, params: { id: datos.productoId } });
      }
    });

    return () => suscripcion.remove();
  }, [haySesion, router]);

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
    // Raíz de gestos para el deslizar-para-borrar de Mis publicaciones (Clase 9).
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Stack.Screen name="ajustes" />
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
      <TarjetaBienvenida visible={mostrarBienvenida} onCerrar={cerrarBienvenida} />
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}