import { Redirect } from "expo-router";

import { HistorialPedidos } from "../components/HistorialPedidos";
import { ROUTES } from "../constants/routes";
import { obtenerMisVentas } from "../services/comprasService";
import { useUsuarioStore } from "../stores/useUsuarioStore";
import { usePuedeVender } from "../hooks/usePuedeVender";

export default function MisVentasScreen() {
  const esVendedor = usePuedeVender();

  if (!esVendedor) {
    return <Redirect href={ROUTES.home} />;
  }

  return (
    <HistorialPedidos
      titulo="Mis ventas"
      textoVacio="Todavía no vendiste ninguna prenda."
      cargar={obtenerMisVentas}
      mostrarComprador
    />
  );
}
