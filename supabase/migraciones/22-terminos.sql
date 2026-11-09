-- Términos y condiciones: qué versión aceptó cada usuario y cuándo.
-- El texto vive en la app (constants/terminos.ts); acá queda la constancia.
-- tipo 'comprador' se acepta al registrarse; 'vendedor', antes de publicar por primera vez.
-- Publicar una prenda exige haber aceptado los términos de vendedor (cualquier versión).
--
-- Correr en el SQL Editor de Supabase después de 21-efectivo-solo-retiro.sql.

CREATE TABLE IF NOT EXISTS public.terminos_aceptaciones (
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('comprador', 'vendedor')),
  version text NOT NULL CHECK (char_length(btrim(version)) > 0),
  aceptado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, tipo, version)
);

ALTER TABLE public.terminos_aceptaciones ENABLE ROW LEVEL SECURITY;

-- Cada uno ve sus aceptaciones; el admin de la plataforma ve todas (reclamos).
DROP POLICY IF EXISTS terminos_lectura ON public.terminos_aceptaciones;
CREATE POLICY terminos_lectura ON public.terminos_aceptaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.es_admin_plataforma());
-- Sin políticas de escritura: sólo se carga con aceptar_terminos (no se puede borrar ni cambiar la fecha).

CREATE OR REPLACE FUNCTION public.aceptar_terminos(p_tipo text, p_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión';
  END IF;
  INSERT INTO terminos_aceptaciones (usuario_id, tipo, version)
  VALUES (auth.uid(), p_tipo, p_version)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.aceptar_terminos(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceptar_terminos(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acepto_terminos_vendedor(p_usuario uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM terminos_aceptaciones WHERE usuario_id = p_usuario AND tipo = 'vendedor'
  );
$$;

-- Vendedores que ya publicaban antes de esta migración: se les da por aceptada la
-- versión inicial para no bloquearlos; la app igual les muestra los términos nuevos.
INSERT INTO public.terminos_aceptaciones (usuario_id, tipo, version, aceptado_at)
SELECT DISTINCT p.creado_por, 'vendedor', 'previa', now()
FROM public.productos p
WHERE p.creado_por IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.validar_terminos_vendedor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.acepto_terminos_vendedor(auth.uid()) THEN
    RAISE EXCEPTION 'Para publicar tenés que aceptar los términos y condiciones de vendedor.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_terminos_vendedor_trigger ON public.productos;
CREATE TRIGGER validar_terminos_vendedor_trigger BEFORE INSERT ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.validar_terminos_vendedor();
