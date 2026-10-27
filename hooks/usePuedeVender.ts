import { useEmpresaStore, puede, selectEmpresaActiva, selectEsPropietario } from '../stores/useEmpresaStore';
import { selectPuedeVender, useUsuarioStore } from '../stores/useUsuarioStore';
import { Producto } from '../types';

/**
 * Puede publicar en el contexto actual: como particular, o como miembro de la empresa
 * activa con permiso de publicar. La base de datos vuelve a verificarlo.
 */
export function usePuedeVender() {
  const particular = useUsuarioStore(selectPuedeVender);
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  // El propietario de una empresa no publica como particular (migración 15).
  const esPropietario = useEmpresaStore(selectEsPropietario);

  return empresaActiva ? puede(empresaActiva, 'productos.publicar') : particular && !esPropietario;
}

/** Puede editar o eliminar esta prenda: es suya (particular) o de una empresa donde tiene permiso. */
export function usePuedeGestionarProducto(producto: Producto | null | undefined) {
  const usuario = useUsuarioStore((state) => state.usuario);
  const membresias = useEmpresaStore((state) => state.membresias);

  if (!producto || !usuario) {
    return false;
  }

  if (producto.empresaId) {
    const membresia = membresias.find((item) => item.empresaId === producto.empresaId) ?? null;
    return puede(membresia, 'productos.publicar', producto.sedeId ?? undefined);
  }

  return selectPuedeVender({ usuario }) && producto.creadoPor === usuario.id;
}
