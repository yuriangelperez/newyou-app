-- Vendedor visible en cada prenda, dueños que venden sólo como empresa y salida de empleados.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 14-push-tokens.sql).
--
-- 1) vendedores_publicos / empresas_publicas: nombre del particular o de la empresa que vende
--    cada prenda (profiles no es legible entre usuarios y las empresas pendientes no son públicas).
-- 2) Un propietario de empresa ya no publica prendas como particular (sus empleados sí pueden).
-- 3) quitar_miembro: sólo quien gestiona el equipo (propietario o administrador) quita miembros;
--    un empleado ya no puede salirse solo.

BEGIN;

-- 1) Nombre público de los particulares que tienen prendas publicadas (no expone el correo).
CREATE OR REPLACE FUNCTION public.vendedores_publicos(p_ids uuid[])
RETURNS TABLE (usuario_id uuid, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username
    FROM profiles p
   WHERE p.id = ANY (p_ids)
     AND EXISTS (SELECT 1 FROM productos pr WHERE pr.creado_por = p.id AND pr.empresa_id IS NULL);
$$;

-- Nombre, slug y estado de las empresas que tienen prendas publicadas (incluye las pendientes,
-- para mostrar quién vende; la tienda sigue abriendo sólo para las verificadas).
CREATE OR REPLACE FUNCTION public.empresas_publicas(p_ids bigint[])
RETURNS TABLE (empresa_id bigint, nombre_fantasia text, slug text, estado text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.nombre_fantasia, e.slug, e.estado
    FROM empresas e
   WHERE e.id = ANY (p_ids)
     AND EXISTS (SELECT 1 FROM productos pr WHERE pr.empresa_id = e.id);
$$;

REVOKE ALL ON FUNCTION public.vendedores_publicos(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.empresas_publicas(bigint[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendedores_publicos(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.empresas_publicas(bigint[]) TO anon, authenticated;

-- 2) Restrictiva (se suma con AND): el propietario de una empresa no crea prendas de particular.
--    Las que ya tenía siguen publicadas y las puede editar o borrar.
CREATE OR REPLACE FUNCTION public.es_propietario_de_empresa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM empresa_miembros WHERE usuario_id = auth.uid() AND rol = 'propietario'
  );
$$;
GRANT EXECUTE ON FUNCTION public.es_propietario_de_empresa() TO authenticated;

DROP POLICY IF EXISTS productos_propietario_sin_particular ON public.productos;
CREATE POLICY productos_propietario_sin_particular ON public.productos AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IS NOT NULL OR NOT public.es_propietario_de_empresa());

-- 3) Quitar miembros: siempre con permiso de gestionar el equipo, también para quitarse a uno mismo.
CREATE OR REPLACE FUNCTION public.quitar_miembro(p_empresa bigint, p_usuario uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual text;
BEGIN
  IF NOT public.tiene_permiso(p_empresa, 'equipo.gestionar') THEN
    RAISE EXCEPTION 'Sólo el propietario o un administrador pueden quitar miembros del equipo';
  END IF;

  SELECT rol INTO v_actual FROM empresa_miembros
   WHERE empresa_id = p_empresa AND usuario_id = p_usuario
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa persona no es miembro de la empresa';
  END IF;

  IF v_actual = 'propietario' AND p_usuario <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM empresa_miembros
     WHERE empresa_id = p_empresa AND usuario_id = auth.uid() AND rol = 'propietario') THEN
    RAISE EXCEPTION 'Sólo un propietario puede quitar a otro propietario';
  END IF;

  IF v_actual = 'propietario' AND NOT EXISTS (
    SELECT 1 FROM empresa_miembros
     WHERE empresa_id = p_empresa AND rol = 'propietario' AND usuario_id <> p_usuario) THEN
    RAISE EXCEPTION 'La empresa necesita al menos un propietario';
  END IF;

  DELETE FROM empresa_miembros WHERE empresa_id = p_empresa AND usuario_id = p_usuario;
END;
$$;

REVOKE ALL ON FUNCTION public.quitar_miembro(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quitar_miembro(bigint, uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
