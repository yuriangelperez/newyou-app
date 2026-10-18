-- Direcciones guardadas por usuario + dirección de retiro por publicación.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de las migraciones anteriores).

-- Por si migracion-direcciones.sql no se había ejecutado: las columnas viejas se migran abajo.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS direccion_tienda text;

-- 1) Direcciones guardadas (cada usuario las administra desde Ajustes > Direcciones).
CREATE TABLE IF NOT EXISTS public.direcciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  alias text,
  direccion text NOT NULL CHECK (char_length(btrim(direccion)) > 0),
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Una sola dirección principal por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS direcciones_una_principal
  ON public.direcciones (usuario_id) WHERE es_principal;

ALTER TABLE public.direcciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS direcciones_propias ON public.direcciones;
CREATE POLICY direcciones_propias ON public.direcciones
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- 2) Dirección de retiro de cada publicación.
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS direccion_retiro text;

-- 3) Migra lo que ya estaba en profiles: la de la tienda queda como principal.
INSERT INTO public.direcciones (usuario_id, alias, direccion, es_principal)
SELECT p.id, 'Tienda', btrim(p.direccion_tienda), true
  FROM public.profiles p
 WHERE btrim(coalesce(p.direccion_tienda, '')) <> ''
   AND NOT EXISTS (SELECT 1 FROM public.direcciones d WHERE d.usuario_id = p.id);

INSERT INTO public.direcciones (usuario_id, alias, direccion, es_principal)
SELECT p.id, 'Domicilio', btrim(p.direccion),
       NOT EXISTS (SELECT 1 FROM public.direcciones d WHERE d.usuario_id = p.id AND d.es_principal)
  FROM public.profiles p
 WHERE btrim(coalesce(p.direccion, '')) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM public.direcciones d
      WHERE d.usuario_id = p.id AND lower(d.direccion) = lower(btrim(p.direccion)));

-- 4) Publicaciones anteriores sin dirección: se les coloca la dirección principal de su vendedor.
UPDATE public.productos pr
   SET direccion_retiro = d.direccion
  FROM public.direcciones d
 WHERE d.usuario_id = pr.creado_por AND d.es_principal
   AND btrim(coalesce(pr.direccion_retiro, '')) = '';

-- 5) Publicaciones nuevas sin dirección (p. ej. borradores offline): también toman la principal.
CREATE OR REPLACE FUNCTION public.productos_direccion_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF btrim(coalesce(NEW.direccion_retiro, '')) = '' THEN
    SELECT d.direccion INTO NEW.direccion_retiro
      FROM public.direcciones d
     WHERE d.usuario_id = NEW.creado_por AND d.es_principal
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_direccion_por_defecto ON public.productos;
CREATE TRIGGER productos_direccion_por_defecto
  BEFORE INSERT ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_direccion_por_defecto();

-- 6) Retiro en local: dirección de cada producto del carrito (reemplaza direcciones_tiendas).
DROP FUNCTION IF EXISTS public.direcciones_tiendas(bigint[]);

CREATE OR REPLACE FUNCTION public.direcciones_retiro(p_producto_ids bigint[])
RETURNS TABLE (productoid bigint, vendedor text, direccion text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.productoid,
         p.username,
         NULLIF(btrim(coalesce(
           pr.direccion_retiro,
           (SELECT d.direccion FROM public.direcciones d
             WHERE d.usuario_id = pr.creado_por AND d.es_principal LIMIT 1)
         )), '')
    FROM public.productos pr
    JOIN public.profiles p ON p.id = pr.creado_por
   WHERE pr.productoid = ANY (p_producto_ids);
$$;
GRANT EXECUTE ON FUNCTION public.direcciones_retiro(bigint[]) TO authenticated;
