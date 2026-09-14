import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { BRANDING_LOGO } from '../constants/assets';
import { Colors } from '../constants/theme';
import { supabase } from '../services/supabase';
import { useUsuarioStore } from '../stores/useUsuarioStore';

export default function RootLayout() {
  const hidratarDesdeAuthUser = useUsuarioStore((state) => state.hidratarDesdeAuthUser);
  const [mostrarIntro, setMostrarIntro] = useState(true);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular: require('@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf'),
    Montserrat_500Medium: require('@expo-google-fonts/montserrat/500Medium/Montserrat_500Medium.ttf'),
    Montserrat_600SemiBold: require('@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf'),
    Montserrat_700Bold: require('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'),
  });

  useEffect(() => {
    if (!supabase) {
      hidratarDesdeAuthUser(null);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        hidratarDesdeAuthUser(data.session?.user ?? null);
      })
      .catch(() => {
        hidratarDesdeAuthUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      hidratarDesdeAuthUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hidratarDesdeAuthUser]);

  useEffect(() => {
    const timer = setTimeout(() => setMostrarIntro(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return <AnimatedIntro />;
  }

  return (
    <View style={layoutStyles.root}>
      <StatusBar style="auto" />
      <Stack initialRouteName="(auth)/login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="producto/[id]" />
        <Stack.Screen name="producto/nuevo" />
        <Stack.Screen name="editar/[id]" />
        <Stack.Screen name="mis-publicaciones" />
        <Stack.Screen name="mis-compras" />
        <Stack.Screen name="ajustes" />
        <Stack.Screen name="checkout" />
      </Stack>
      <Toast />
      {mostrarIntro ? <AnimatedIntro /> : null}
    </View>
  );
}

function AnimatedIntro() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.84)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 650,
        delay: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, opacity, scale]);

  return (
    <Animated.View style={introStyles.screen}>
      <StatusBar style="dark" />
      <Animated.Image
        accessibilityLabel="New You"
        source={BRANDING_LOGO}
        style={[introStyles.logo, { opacity, transform: [{ scale }] }]}
      />
      <Animated.View style={{ opacity: contentOpacity }}>
        <Text style={introStyles.tagline}>Nuevo estilo, Nuevo Tú</Text>
      </Animated.View>
    </Animated.View>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const introStyles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  logo: {
    width: 230,
    height: 130,
    resizeMode: 'contain',
  },
  tagline: {
    marginTop: 18,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
});