import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CartProvider } from '../context/cart';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <CartProvider>
        <Stack initialRouteName="(auth)/login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="producto/[id]" />
          <Stack.Screen name="categorias" />
          <Stack.Screen name="carrito" />
        </Stack>
      </CartProvider>
    </>
  );
}