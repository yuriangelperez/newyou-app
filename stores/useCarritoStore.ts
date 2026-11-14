import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { calcularPrecioFinal, Producto } from '../types';

export interface CarritoItem {
  key: string;
  productoId: string;
  nombre: string;
  precio: number;
  precioOriginal?: number;
  descuentoPorcentaje?: number;
  imagen: string;
  categoria: string;
  disponible: boolean;
  stock: number;
  descripcion: string;
  talle: string;
  color: string;
  cantidad: number;
}

interface AgregarAlCarritoPayload {
  producto: Producto;
  talle: string;
  color: string;
  cantidad?: number;
}

interface CarritoStore {
  items: CarritoItem[];
  /** Compra de un solo producto ("Comprar ahora"): no pasa por el carrito ni se persiste. */
  compraDirecta: CarritoItem[] | null;
  setCompraDirecta: (item: CarritoItem) => void;
  limpiarCompraDirecta: () => void;
  agregarProducto: (payload: AgregarAlCarritoPayload) => void;
  incrementarUnidad: (key: string) => void;
  restarUnidad: (key: string) => void;
  eliminarProducto: (key: string) => void;
  actualizarCantidad: (key: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  /**
   * Pone al día precio, descuento y stock con lo que hay ahora en el catálogo (el carrito
   * queda guardado en el celular y el vendedor puede cambiarlos). Las prendas que ya no
   * están publicadas se sacan. Devuelve si cambió algo.
   */
  actualizarDesdeCatalogo: (productos: Producto[]) => boolean;
}

function makeKey(productoId: string, talle: string, color: string) {
  return `${productoId}::${talle}::${color}`;
}

export const useCarritoStore = create<CarritoStore>()(
  persist(
    (set) => ({
      items: [],
      compraDirecta: null,

      setCompraDirecta: (item) => set({ compraDirecta: [item] }),

      limpiarCompraDirecta: () => set({ compraDirecta: null }),

      agregarProducto: ({ producto, talle, color, cantidad = 1 }) => {
        if (!producto.disponible) {
          return;
        }

        const stockDisponible = producto.stock ?? 0;

        if (stockDisponible <= 0) {
          return;
        }

        const key = makeKey(producto.id, talle, color);

        set((state) => {
          const itemExistente = state.items.find(
            (item) => item.key === key
          );

          if (!itemExistente) {
            return {
              items: [
                ...state.items,
                {
                  key,
                  productoId: producto.id,
                  nombre: producto.nombre,
                  precio: calcularPrecioFinal(producto),
                  precioOriginal: producto.precio,
                  descuentoPorcentaje: producto.descuentoPorcentaje,
                  imagen: producto.imagen,
                  categoria: producto.categoria,
                  disponible: producto.disponible,
                  stock: stockDisponible,
                  descripcion: producto.descripcion,
                  talle,
                  color,
                  cantidad: Math.min(
                    Math.max(1, cantidad),
                    stockDisponible
                  ),
                },
              ],
            };
          }

          const nuevaCantidad = Math.min(
            itemExistente.cantidad + Math.max(1, cantidad),
            stockDisponible
          );

          return {
            items: state.items.map((item) =>
              item.key === key
                ? {
                    ...item,
                    cantidad: nuevaCantidad,
                    stock: stockDisponible,
                    disponible: producto.disponible,
                  }
                : item
            ),
          };
        });
      },

      incrementarUnidad: (key) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.key !== key) {
              return item;
            }

            if (!item.disponible || item.cantidad >= item.stock) {
              return item;
            }

            return {
              ...item,
              cantidad: item.cantidad + 1,
            };
          }),
        }));
      },

      restarUnidad: (key) => {
        set((state) => ({
          items: state.items
            .map((item) =>
              item.key === key
                ? {
                    ...item,
                    cantidad: item.cantidad - 1,
                  }
                : item
            )
            .filter((item) => item.cantidad > 0),
        }));
      },

      eliminarProducto: (key) => {
        set((state) => ({
          items: state.items.filter((item) => item.key !== key),
        }));
      },

      actualizarCantidad: (key, cantidad) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.key !== key) {
              return item;
            }

            if (item.stock <= 0 || !item.disponible) {
              return {
                ...item,
                cantidad: 0,
              };
            }

            const nuevaCantidad = Math.min(
              Math.max(1, cantidad),
              item.stock
            );

            return {
              ...item,
              cantidad: nuevaCantidad,
            };
          }).filter((item) => item.cantidad > 0),
        }));
      },

      vaciarCarrito: () => {
        set({ items: [] });
      },

      actualizarDesdeCatalogo: (productos) => {
        const porId = new Map(productos.map((producto) => [producto.id, producto]));
        let cambio = false;

        set((state) => {
          const items = state.items.flatMap((item) => {
            const producto = porId.get(item.productoId);
            if (!producto) {
              cambio = true;
              return [];
            }

            const stock = producto.stock ?? 0;
            const actualizado: CarritoItem = {
              ...item,
              nombre: producto.nombre,
              precio: calcularPrecioFinal(producto),
              precioOriginal: producto.precio,
              descuentoPorcentaje: producto.descuentoPorcentaje,
              stock,
              disponible: producto.disponible && stock > 0,
              cantidad: stock > 0 ? Math.min(item.cantidad, stock) : item.cantidad,
            };

            if (
              actualizado.precio !== item.precio ||
              actualizado.precioOriginal !== item.precioOriginal ||
              actualizado.stock !== item.stock ||
              actualizado.disponible !== item.disponible ||
              actualizado.cantidad !== item.cantidad
            ) {
              cambio = true;
            }
            return [actualizado];
          });

          return cambio ? { items } : state;
        });

        return cambio;
      },
    }),
    {
      name: 'newyou-carrito',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

export const selectTotalItems = (state: CarritoStore) =>
  state.items.reduce((acc, item) => acc + item.cantidad, 0);

export const selectSubtotal = (state: CarritoStore) =>
  state.items.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );