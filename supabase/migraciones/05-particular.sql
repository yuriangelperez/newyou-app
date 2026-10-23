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

-- 3) Políticas existentes que comparan con 'vendedor' (no están versionadas en el repo):
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

-- 4) Guarda de role:
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

-- 5) "Quiero vender prendas": un comprador activa el modo particular.
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
