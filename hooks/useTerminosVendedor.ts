import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ROUTES } from '../constants/routes';
import { terminosAceptados } from '../services/terminosService';

/**
 * Antes de publicar: si el usuario no aceptó los términos de vendedor vigentes,
 * abre la pantalla de términos para aceptarlos. El servidor igual bloquea la
 * publicación de quien nunca los aceptó (22-terminos.sql).
 */
export function useTerminosVendedor() {
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    terminosAceptados('vendedor')
      .then((aceptados) => {
        if (activo && !aceptados) {
          router.push({ pathname: ROUTES.terms, params: { aceptar: 'vendedor' } });
        }
      })
      // Sin conexión no se insiste: se vuelve a revisar la próxima vez.
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [router]);
}
