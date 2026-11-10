import { useEffect, useState } from 'react';

import { listarSedes, Membresia, Sede } from '../services/empresasService';

interface Resultado {
  /** Empresa y permisos para los que se calculó; si cambian, se vuelve a cargar. */
  clave: string;
  editables: Sede[];
  soloLectura: Sede[];
}

const SIN_SEDES: Sede[] = [];

/**
 * Sedes activas de una empresa, separadas en las que el miembro puede editar
 * (según su alcance) y las que sólo puede ver.
 */
export function useSedesEmpresa(membresia: Membresia | null) {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const empresaId = membresia?.empresaId;
  const todas = membresia?.todasLasSedes ?? false;
  const permitidas = membresia?.sedesPermitidas.join(',') ?? '';
  const clave = empresaId ? `${empresaId}|${todas}|${permitidas}` : null;

  useEffect(() => {
    if (!empresaId || !clave) {
      return;
    }

    let vigente = true;
    listarSedes(empresaId)
      .then((sedes) => {
        if (!vigente) return;
        const activas = sedes.filter((sede) => sede.activa);
        const ids = permitidas ? permitidas.split(',').map(Number) : [];
        const puede = (sede: Sede) => todas || ids.includes(sede.id);
        setResultado({ clave, editables: activas.filter(puede), soloLectura: activas.filter((sede) => !puede(sede)) });
      })
      .catch(() => {
        if (vigente) setResultado({ clave, editables: [], soloLectura: [] });
      });

    return () => {
      vigente = false;
    };
  }, [clave, empresaId, todas, permitidas]);

  // Sin empresa no hay sedes; con una empresa nueva se muestra vacío hasta que llegan.
  const actual = clave && resultado?.clave === clave ? resultado : null;

  return {
    editables: actual?.editables ?? SIN_SEDES,
    soloLectura: actual?.soloLectura ?? SIN_SEDES,
    cargando: Boolean(clave) && !actual,
  };
}
