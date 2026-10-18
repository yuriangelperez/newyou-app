import { supabase } from './supabase';

export interface Direccion {
  id: number;
  alias: string | null;
  direccion: string;
  esPrincipal: boolean;
}

interface DireccionRow {
  id: number;
  alias: string | null;
  direccion: string;
  es_principal: boolean;
}

const mapRow = (row: DireccionRow): Direccion => ({
  id: row.id,
  alias: row.alias,
  direccion: row.direccion,
  esPrincipal: row.es_principal,
});

/** Direcciones del usuario con la principal primero. */
export async function listarDirecciones(): Promise<Direccion[]> {
  const { data, error } = await supabase
    .from('direcciones')
    .select('id, alias, direccion, es_principal')
    .order('es_principal', { ascending: false })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

/** Crea una dirección; si es la primera del usuario queda como principal. */
export async function crearDireccion(direccion: string, alias?: string): Promise<Direccion> {
  const existentes = await listarDirecciones();

  const { data, error } = await supabase
    .from('direcciones')
    .insert({
      direccion: direccion.trim(),
      alias: alias?.trim() || null,
      es_principal: existentes.length === 0,
    })
    .select('id, alias, direccion, es_principal')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function marcarPrincipal(id: number) {
  const { error: limpiarError } = await supabase
    .from('direcciones')
    .update({ es_principal: false })
    .eq('es_principal', true);

  if (limpiarError) {
    throw new Error(limpiarError.message);
  }

  const { error } = await supabase.from('direcciones').update({ es_principal: true }).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Elimina una dirección; si era la principal, la más antigua restante pasa a serlo. */
export async function eliminarDireccion(id: number) {
  const { error } = await supabase.from('direcciones').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  const restantes = await listarDirecciones();
  if (restantes.length > 0 && !restantes.some((item) => item.esPrincipal)) {
    await marcarPrincipal(restantes[0].id);
  }
}

/** Guarda la dirección sólo si todavía no está entre las guardadas. */
export async function guardarSiEsNueva(direccion: string, guardadas: Direccion[]) {
  const limpia = direccion.trim();

  if (!limpia || guardadas.some((item) => item.direccion.toLowerCase() === limpia.toLowerCase())) {
    return;
  }

  await crearDireccion(limpia);
}
