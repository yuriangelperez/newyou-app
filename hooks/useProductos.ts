// hooks/useProductos.ts
import { useState, useEffect } from 'react';
import { Producto } from '../types';                 
import { PRODUCTOS_MOCK } from '../data/mockData';   

// Definimos la estructura que va a retornar nuestro hook
interface UseProductosResult {
  productos: Producto[];
  cargando: boolean;
  error: string | null;
  refrescar: () => void;
}

export function useProductos(): UseProductosResult {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    setError(null);

    // Simulamos un retraso asíncrono de red de 1000ms (1 segundo)
    // En la Clase 5 esto se reemplazará por una consulta real a Firebase
    setTimeout(() => {
      try {
        setProductos(PRODUCTOS_MOCK);
        setCargando(false);
      } catch (err) {
        setError('No se pudo conectar con el catálogo de NEW YOU.');
        setCargando(false);
      }
    }, 1000);
  };

  // Se ejecuta automáticamente al montar la pantalla por primera vez
  useEffect(() => {
    cargar();
  }, []);

  return {
    productos,
    cargando,
    error,
    refrescar: cargar, // Expone la función para el gesto de deslizar para actualizar
  };
}