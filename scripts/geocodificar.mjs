// Completa lat/lng de sedes, direcciones y prendas que se guardaron antes de 25-cercania.sql.
// Usa Nominatim (OpenStreetMap), 1 pedido por segundo como pide su política de uso.
//
// Uso (la clave service_role está en Supabase → Project Settings → API; no la subas a git):
//   EXPO_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/geocodificar.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false } });
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const cache = new Map();

async function geocodificar(direccion) {
  const clave = direccion.trim().toLowerCase();
  if (cache.has(clave)) return cache.get(clave);
  await esperar(1100);
  const respuesta = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(direccion)}`,
    { headers: { 'User-Agent': 'NewYouApp/1.0 (proyecto academico)' } },
  );
  const [lugar] = respuesta.ok ? await respuesta.json() : [];
  const punto = lugar ? { lat: Number(lugar.lat), lng: Number(lugar.lon) } : null;
  cache.set(clave, punto);
  return punto;
}

async function completar(tabla, columnaId, columnaDireccion, filtro = (consulta) => consulta) {
  const { data, error } = await filtro(
    supabase.from(tabla).select(`${columnaId}, ${columnaDireccion}`).is('lat', null).not(columnaDireccion, 'is', null),
  );
  if (error) throw error;
  let ok = 0;
  for (const fila of data) {
    const punto = await geocodificar(fila[columnaDireccion]);
    if (!punto) {
      console.log(`  sin resultado: ${tabla} ${fila[columnaId]} "${fila[columnaDireccion]}"`);
      continue;
    }
    const { error: errorUpdate } = await supabase.from(tabla).update(punto).eq(columnaId, fila[columnaId]);
    if (errorUpdate) console.log(`  error ${tabla} ${fila[columnaId]}: ${errorUpdate.message}`);
    else ok += 1;
  }
  console.log(`${tabla}: ${ok} de ${data.length} completadas`);
}

await completar('sedes', 'id', 'direccion');
await completar('direcciones', 'id', 'direccion');
await completar('productos', 'productoid', 'direccion_retiro', (consulta) => consulta.is('empresa_id', null));
