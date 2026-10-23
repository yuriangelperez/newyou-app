-- Rol "particular" (C2C) y cambio de rol sólo desde el servidor.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 04-mis-direcciones.sql)
-- y publicar junto con la versión de la app que usa 'particular'.
-- Corre en una transacción: si algo falla, no queda nada a medias.

BEGIN;

-- 1) Quita el CHECK viejo de role ('comprador' | 'vendedor'), sea cual sea su nombre.
DO $$
DECLARE
  v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.profiles'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', v_constraint);
  END LOOP;
END;
$$;

-- 2) Los vendedores actuales pasan a ser particulares.
UPDATE public.profiles SET role = 'particular', updated_at = now() WHERE role = 'vendedor';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('comprador', 'particular'));

-- 3) Limpieza de políticas duplicadas (ver 00-base.sql). Las políticas permisivas se suman con OR,
--    así que "Usuarios autenticados pueden crear productos" y similares dejaban publicar, editar y
--    borrar a cualquier comprador. Quedan sólo las "Vendedores ..." (pasan a 'particular' abajo).
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear productos" ON public.productos;
DROP POLICY IF EXISTS productos_insert_own ON public.productos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar sus productos" ON public.productos;
DROP POLICY IF EXISTS productos_update_own ON public.productos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar sus productos" ON public.productos;
DROP POLICY IF EXISTS productos_delete_own ON public.productos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver productos" ON public.productos;
DROP POLICY IF EXISTS productos_select_authenticated ON public.productos;

-- Las compras sólo se crean con confirmar_compra (SECURITY DEFINER), que valida stock y precios.
DROP POLICY IF EXISTS "Los usuarios pueden crear sus compras" ON public.compras;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus compras" ON public.compras;

-- categorias tenía RLS sin políticas: nadie podía leerla ni crearla desde la app.
DROP POLICY IF EXISTS categorias_lectura ON public.categorias;
CREATE POLICY categorias_lectura ON public.categorias
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS categorias_alta_particular ON public.categorias;
CREATE POLICY categorias_alta_particular ON public.categorias
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'particular'));

-- 4) Políticas existentes que comparan con 'vendedor' (las "Vendedores ..." de 00-base.sql):
--    se reescriben para comparar con 'particular'. Cada cambio queda informado en NOTICE.
DO $$
DECLARE
  v_policy record;
  v_sql text;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual ILIKE '%''vendedor''%' OR with_check ILIKE '%''vendedor''%')
  LOOP
    v_sql := format('ALTER POLICY %I ON %I.%I', v_policy.policyname, v_policy.schemaname, v_policy.tablename);
    IF v_policy.qual IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', replace(v_policy.qual, '''vendedor''', '''particular'''));
    END IF;
    IF v_policy.with_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', replace(v_policy.with_check, '''vendedor''', '''particular'''));
    END IF;
    EXECUTE v_sql;
    RAISE NOTICE 'Política actualizada: %.%', v_policy.tablename, v_policy.policyname;
  END LOOP;
END;
$$;

-- 5) Alta de perfiles: la app nueva registra 'particular'; la vieja, 'vendedor'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'username', 'usuario'),
    CASE
      WHEN new.raw_user_meta_data ->> 'role' IN ('particular', 'vendedor') THEN 'particular'
      ELSE 'comprador'
    END
  );
  RETURN new;
END;
$$;

-- 6) Guarda de role:
--    - Al crear el perfil, 'vendedor' (metadata de registros viejos o del trigger de alta) se toma como 'particular'.
--    - Un usuario no puede cambiar su role con un UPDATE directo; sólo con activar_modo_particular().
CREATE OR REPLACE FUNCTION public.profiles_proteger_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'vendedor' THEN
    NEW.role := 'particular';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'El tipo de cuenta no se puede modificar directamente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_proteger_role ON public.profiles;
CREATE TRIGGER profiles_proteger_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_proteger_role();

-- 7) "Quiero vender prendas": un comprador activa el modo particular.
--    SECURITY DEFINER: corre como dueño de la función, así que la guarda de arriba lo deja pasar.
CREATE OR REPLACE FUNCTION public.activar_modo_particular()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  UPDATE public.profiles
     SET role = 'particular', updated_at = now()
   WHERE id = auth.uid()
  RETURNING role INTO v_role;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inexistente';
  END IF;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.activar_modo_particular() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activar_modo_particular() TO authenticated;

COMMIT;
