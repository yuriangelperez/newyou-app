import { create } from 'zustand';

import { Producto } from '../types';

export interface CarritoItem {
  key: string;
  productoId: string;
  nombre: string;
  precio: number;
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
  agregarProducto: (payload: AgregarAlCarritoPayload) => void;
  incrementarUnidad: (key: string) => void;
  restarUnidad: (key: string) => void;
  eliminarProducto: (key: string) => void;
  actualizarCantidad: (key: string, cantidad: number) => void;
  vaciarCarrito: () => void;
}

function makeKey(productoId: string, talle: string, color: string) {
  return `${productoId}::${talle}::${color}`;
}

export const useCarritoStore = create<CarritoStore>((set) => ({
  items: [],

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
      const itemExistente = state.items.find((item) => item.key === key);

      if (!itemExistente) {
        return {
          items: [
            ...state.items,
            {
              key,
              productoId: producto.id,
              nombre: producto.nombre,
              precio: producto.precio,
              imagen: producto.imagen,
              categoria: producto.categoria,
              disponible: producto.disponible,
              stock: stockDisponible,
              descripcion: producto.descripcion,
              talle,
              color,
              cantidad: Math.min(Math.max(1, cantidad), stockDisponible),
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

        if (item.cantidad >= item.stock) {
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
            ? { ...item, cantidad: item.cantidad - 1 }
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

        const nuevaCantidad = Math.min(
          Math.max(1, cantidad),
          item.stock
        );

        return {
          ...item,
          cantidad: nuevaCantidad,
        };
      }),
    }));
  },

  vaciarCarrito: () => {
    set({ items: [] });
  },
}));

export const selectTotalItems = (state: CarritoStore) =>
  state.items.reduce((acc, item) => acc + item.cantidad, 0);

export const selectSubtotal = (state: CarritoStore) =>
  state.items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);