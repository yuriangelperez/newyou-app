import { Redirect } from "expo-router";

import { HistorialPedidos } from "../components/HistorialPedidos";
import { ROUTES } from "../constants/routes";
import { obtenerMisVentas } from "../services/comprasService";
import { selectPuedeVender, useUsuarioStore } from "../stores/useUsuarioStore";

export default function MisVentasScreen() {
  const esVendedor = useUsuarioStore(selectPuedeVender);

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
