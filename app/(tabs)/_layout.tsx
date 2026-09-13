import { Tabs } from 'expo-router';

import { selectTotalItems, useCarritoStore } from '../../stores/useCarritoStore';

export default function TabsLayout() {
  const totalItems = useCarritoStore(selectTotalItems);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="categorias"
        options={{
          title: 'Categorías',
        }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          title: 'Carrito',
          tabBarBadge: totalItems > 0 ? (totalItems > 99 ? '99+' : totalItems) : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
        }}
      />
    </Tabs>
  );
}
