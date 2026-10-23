import { Redirect } from "expo-router";
import { useCallback } from "react";

import { HistorialPedidos } from "../components/HistorialPedidos";
import { ROUTES } from "../constants/routes";
import { usePuedeVender } from "../hooks/usePuedeVender";
import { obtenerVentas, Pedido } from "../services/pedidosService";
import { puede, selectEmpresaActiva, useEmpresaStore } from "../stores/useEmpresaStore";

/** Ventas del particular, o de la empresa activa (sólo las sedes que el miembro puede ver). */
export default function MisVentasScreen() {
  const esVendedor = usePuedeVender();
  const empresaActiva = useEmpresaStore(selectEmpresaActiva);
  const empresaId = empresaActiva?.empresaId ?? null;
  const puedeVerEmpresa = puede(empresaActiva, "pedidos.ver");

  const cargar = useCallback(() => obtenerVentas(empresaId), [empresaId]);

  const puedeCambiar = useCallback(
    (pedido: Pedido) => {
      if (!pedido.empresaId) return true;
      const sede = pedido.sedeId ?? undefined;
      return (
        puede(empresaActiva, "pedidos.estado", sede) ||
        (pedido.entrega === "domicilio" &&
          (pedido.estado === "preparando" || pedido.estado === "enviado") &&
          puede(empresaActiva, "envios.gestionar", sede))
      );
    },
    [empresaActiva],
  );

  if (!(empresaActiva ? puedeVerEmpresa : esVendedor)) {
    return <Redirect href={ROUTES.home} />;
  }

  return (
    <HistorialPedidos
      titulo={empresaActiva ? `Ventas de ${empresaActiva.nombre}` : "Mis ventas"}
      textoVacio="Todavía no hay ventas."
      cargar={cargar}
      modo="venta"
      puedeCambiar={puedeCambiar}
    />
  );
}
