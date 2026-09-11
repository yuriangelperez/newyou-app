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
    const safeQuantity = Math.max(1, cantidad);
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
              descripcion: producto.descripcion,
              talle,
              color,
              cantidad: safeQuantity,
            },
          ],
        };
      }

      return {
        items: state.items.map((item) =>
          item.key === key
            ? { ...item, cantidad: item.cantidad + safeQuantity }
            : item
        ),
      };
    });
  },
  incrementarUnidad: (key) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.key === key ? { ...item, cantidad: item.cantidad + 1 } : item
      ),
    }));
  },
  restarUnidad: (key) => {
    set((state) => ({
      items: state.items
        .map((item) =>
          item.key === key ? { ...item, cantidad: item.cantidad - 1 } : item
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
    const safeCantidad = Math.max(1, cantidad);
    set((state) => ({
      items: state.items.map((item) =>
        item.key === key ? { ...item, cantidad: safeCantidad } : item
      ),
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
