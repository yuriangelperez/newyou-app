import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

import { getProductosPorIds } from '../services/productosService';
import { useCarritoStore } from '../stores/useCarritoStore';

// Con la API REST de prueba (clase 12) las prendas no están en Supabase: no se refresca.
const usarApiRest = process.env.EXPO_PUBLIC_FUENTE_PRODUCTOS === 'dummyjson';

/**
 * Al entrar a la pantalla trae precio, descuento y stock actuales de las prendas del carrito.
 * El carrito queda guardado en el celular, así que sin esto mostraba precios viejos y el total
 * no coincidía con lo que cobra el servidor. Sin conexión deja el carrito como estaba.
 */
export function useRefrescarCarrito() {
  const actualizarDesdeCatalogo = useCarritoStore((state) => state.actualizarDesdeCatalogo);

  useFocusEffect(
    useCallback(() => {
      if (usarApiRest) {
        return;
      }

      const ids = useCarritoStore.getState().items.map((item) => item.productoId);
      if (ids.length === 0) {
        return;
      }

      let vigente = true;
      getProductosPorIds(Array.from(new Set(ids)))
        .then((productos) => {
          if (vigente && actualizarDesdeCatalogo(productos)) {
            Toast.show({
              type: 'info',
              text1: 'Actualizamos tu carrito',
              text2: 'Cambiaron precios o stock de algunas prendas desde que las agregaste.',
            });
          }
        })
        .catch(() => undefined);

      return () => {
        vigente = false;
      };
    }, [actualizarDesdeCatalogo]),
  );
}
