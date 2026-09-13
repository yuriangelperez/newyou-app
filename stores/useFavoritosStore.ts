import { create } from 'zustand';

import { Producto } from '../types';

interface FavoritosStore {
  favoritos: Producto[];
  toggleFavorito: (producto: Producto) => void;
  esFavorito: (productoId: string) => boolean;
}

export const useFavoritosStore = create<FavoritosStore>((set, get) => ({
  favoritos: [],

  toggleFavorito: (producto) => {
    set((state) => {
      const existe = state.favoritos.some((item) => item.id === producto.id);

      return {
        favoritos: existe
          ? state.favoritos.filter((item) => item.id !== producto.id)
          : [...state.favoritos, producto],
      };
    });
  },

  esFavorito: (productoId) => get().favoritos.some((item) => item.id === productoId),
}));
