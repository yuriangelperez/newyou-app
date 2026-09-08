import React, { createContext, useContext, useMemo, useState } from 'react';

import { Producto } from '../types';

export interface CartItem {
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

interface AddToCartPayload {
  producto: Producto;
  talle: string;
  color: string;
  cantidad?: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addToCart: (payload: AddToCartPayload) => void;
  updateQuantity: (key: string, cantidad: number) => void;
  removeItem: (key: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function makeKey(productoId: string, talle: string, color: string) {
  return `${productoId}::${talle}::${color}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = ({ producto, talle, color, cantidad = 1 }: AddToCartPayload) => {
    const safeQuantity = Math.max(1, cantidad);
    const key = makeKey(producto.id, talle, color);

    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (!existing) {
        const nextItem: CartItem = {
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
        };
        return [...current, nextItem];
      }

      return current.map((item) =>
        item.key === key ? { ...item, cantidad: item.cantidad + safeQuantity } : item
      );
    });
  };

  const updateQuantity = (key: string, cantidad: number) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, cantidad: Math.max(1, cantidad) } : item
      )
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
    const subtotal = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    return {
      items,
      totalItems,
      subtotal,
      addToCart,
      updateQuantity,
      removeItem,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
