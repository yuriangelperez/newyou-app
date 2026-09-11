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
          tabBarBadge: totalItems > 0 ? (totalItems > 99 ? '99+' : totalItems) : undefined,
        }}
      />
    </Tabs>
  );
}
