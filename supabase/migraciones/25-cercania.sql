-- Filtrar por cercanía: coordenadas de sedes, direcciones y puntos de retiro.
-- La app geocodifica al guardar (geocodificador del celular + Nominatim) y manda lat/lng.
-- productos_cercanos() calcula la distancia con la fórmula de Haversine (sin PostGIS).
-- Para completar los registros viejos: node scripts/geocodificar.mjs (ver el archivo).
--
-- Correr en el SQL Editor de Supabase después de 24-chat-pedidos.sql.

ALTER TABLE public.sedes
  ADD COLUMN IF NOT EXISTS lat double precision CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng double precision CHECK (lng BETWEEN -180 AND 180);
ALTER TABLE public.direcciones
  ADD COLUMN IF NOT EXISTS lat double precision CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng double precision CHECK (lng BETWEEN -180 AND 180);
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS lat double precision CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng double precision CHECK (lng BETWEEN -180 AND 180);

-- Si la prenda toma la dirección principal del vendedor, toma también sus coordenadas.
CREATE OR REPLACE FUNCTION public.productos_coordenadas_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.lat IS NULL AND btrim(coalesce(NEW.direccion_retiro, '')) <> '' THEN
    SELECT d.lat, d.lng INTO NEW.lat, NEW.lng
      FROM direcciones d
     WHERE d.usuario_id = NEW.creado_por
       AND lower(btrim(d.direccion)) = lower(btrim(NEW.direccion_retiro))
       AND d.lat IS NOT NULL
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Corre después de productos_direccion_por_defecto (los triggers van en orden alfabético).
DROP TRIGGER IF EXISTS productos_zz_coordenadas ON public.productos;
CREATE TRIGGER productos_zz_coordenadas
  BEFORE INSERT OR UPDATE OF direccion_retiro ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_coordenadas_por_defecto();

-- Distancia en km entre dos puntos.
CREATE OR REPLACE FUNCTION public.distancia_km(p_lat1 double precision, p_lng1 double precision,
                                               p_lat2 double precision, p_lng2 double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$$;

-- Prendas publicadas a menos de p_radio_km, con la distancia al punto de retiro más cercano.
-- Empresas: sus sedes activas con retiro; particulares: el punto de retiro de la prenda.
-- Sólo se devuelve la distancia (redondeada a 100 m), nunca la dirección exacta.
CREATE OR REPLACE FUNCTION public.productos_cercanos(p_lat double precision, p_lng double precision,
                                                     p_radio_km double precision DEFAULT 10)
RETURNS TABLE (producto_id bigint, distancia_km numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH puntos AS (
    SELECT p.productoid, public.distancia_km(p_lat, p_lng, s.lat, s.lng) AS km
      FROM productos p
      JOIN sedes s ON s.empresa_id = p.empresa_id AND s.activa AND s.hace_retiro AND s.lat IS NOT NULL
     WHERE p.estado = 'publicada' AND p.empresa_id IS NOT NULL
    UNION ALL
    SELECT p.productoid, public.distancia_km(p_lat, p_lng, p.lat, p.lng)
      FROM productos p
     WHERE p.estado = 'publicada' AND p.empresa_id IS NULL AND p.lat IS NOT NULL
  )
  SELECT productoid, round(min(km)::numeric, 1)
    FROM puntos
   GROUP BY productoid
  HAVING min(km) <= least(greatest(coalesce(p_radio_km, 10), 0.5), 100)
   ORDER BY 2;
$$;
GRANT EXECUTE ON FUNCTION public.productos_cercanos(double precision, double precision, double precision) TO anon, authenticated;
