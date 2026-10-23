import { useEffect, useState } from "react";

import { HistorialPedidos } from "../components/HistorialPedidos";
import { leerBorradores } from "../services/offlineService";
import { obtenerMisPedidos } from "../services/pedidosService";

export default function MisComprasScreen() {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    leerBorradores().then((borradores) =>
      setPendientes(borradores.filter((b) => b.tipo === "compra").length),
    );
  }, []);

  return (
    <HistorialPedidos
      titulo="Mis compras"
      textoVacio="Todavía no hiciste ninguna compra."
      cargar={obtenerMisPedidos}
      modo="compra"
      pendientes={pendientes}
    />
  );
}
