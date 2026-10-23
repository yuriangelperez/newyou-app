import { useEffect, useState } from 'react';

import { listarSedes, Membresia, Sede } from '../services/empresasService';

/**
 * Sedes activas de una empresa, separadas en las que el miembro puede editar
 * (según su alcance) y las que sólo puede ver.
 */
export function useSedesEmpresa(membresia: Membresia | null) {
  const [editables, setEditables] = useState<Sede[]>([]);
  const [soloLectura, setSoloLectura] = useState<Sede[]>([]);
  const [cargando, setCargando] = useState(false);

  const empresaId = membresia?.empresaId;
  const todas = membresia?.todasLasSedes ?? false;
  const permitidas = membresia?.sedesPermitidas.join(',') ?? '';

  useEffect(() => {
    if (!empresaId) {
      setEditables([]);
      setSoloLectura([]);
      return;
    }

    let vigente = true;
    setCargando(true);
    listarSedes(empresaId)
      .then((sedes) => {
        if (!vigente) return;
        const activas = sedes.filter((sede) => sede.activa);
        const ids = permitidas ? permitidas.split(',').map(Number) : [];
        const puede = (sede: Sede) => todas || ids.includes(sede.id);
        setEditables(activas.filter(puede));
        setSoloLectura(activas.filter((sede) => !puede(sede)));
      })
      .catch(() => {
        if (vigente) {
          setEditables([]);
          setSoloLectura([]);
        }
      })
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [empresaId, todas, permitidas]);

  return { editables, soloLectura, cargando };
}
