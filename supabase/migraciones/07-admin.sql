-- Panel de administrador de la plataforma: verificar, suspender y reactivar empresas.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 06-empresas.sql).
-- Para nombrar administrador a una cuenta (sólo desde el SQL Editor):
--   INSERT INTO public.plataforma_admins (usuario_id)
--   SELECT id FROM auth.users WHERE email = '<correo>';

BEGIN;

-- 1) Administradores de la plataforma. Sin políticas de escritura: sólo se cargan desde el SQL Editor.
CREATE TABLE IF NOT EXISTS public.plataforma_admins (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plataforma_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_admin_plataforma()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM plataforma_admins WHERE usuario_id = auth.uid());
$$;

-- 2) Historial de decisiones sobre cada empresa (quién la verificó o suspendió y por qué).
CREATE TABLE IF NOT EXISTS public.empresa_revisiones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estado_anterior text NOT NULL,
  estado_nuevo text NOT NULL,
  motivo text,
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empresa_revisiones ENABLE ROW LEVEL SECURITY;

-- Los miembros ven el historial de su empresa (por ejemplo, el motivo de una suspensión).
DROP POLICY IF EXISTS revisiones_lectura ON public.empresa_revisiones;
CREATE POLICY revisiones_lectura ON public.empresa_revisiones FOR SELECT TO authenticated
  USING (public.es_miembro(empresa_id) OR public.es_admin_plataforma());

-- 3) Empresas para revisar, con el correo de quien la creó y cuántas sedes y miembros tiene.
CREATE OR REPLACE FUNCTION public.admin_empresas(p_estado text DEFAULT NULL)
RETURNS TABLE (
  id bigint,
  razon_social text,
  nombre_fantasia text,
  cuit text,
  slug text,
  estado text,
  creador_email text,
  sedes bigint,
  miembros bigint,
  created_at timestamptz,
  ultimo_motivo text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores';
  END IF;

  RETURN QUERY
  SELECT e.id, e.razon_social, e.nombre_fantasia, e.cuit, e.slug, e.estado, p.email,
         (SELECT count(*) FROM sedes s WHERE s.empresa_id = e.id),
         (SELECT count(*) FROM empresa_miembros m WHERE m.empresa_id = e.id),
         e.created_at,
         (SELECT r.motivo FROM empresa_revisiones r WHERE r.empresa_id = e.id ORDER BY r.created_at DESC LIMIT 1)
    FROM empresas e
    LEFT JOIN profiles p ON p.id = e.creada_por
   WHERE p_estado IS NULL OR e.estado = p_estado
   ORDER BY array_position(ARRAY['pendiente', 'suspendida', 'verificada'], e.estado), e.created_at;
END;
$$;

-- 4) Cambia el estado de una empresa y lo registra. Suspender exige un motivo.
CREATE OR REPLACE FUNCTION public.admin_cambiar_estado_empresa(
  p_empresa bigint,
  p_estado text,
  p_motivo text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anterior text;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores';
  END IF;

  IF p_estado NOT IN ('pendiente', 'verificada', 'suspendida') THEN
    RAISE EXCEPTION 'Estado inválido';
  END IF;

  IF p_estado = 'suspendida' AND btrim(coalesce(p_motivo, '')) = '' THEN
    RAISE EXCEPTION 'Indicá el motivo de la suspensión';
  END IF;

  SELECT estado INTO v_anterior FROM empresas WHERE id = p_empresa FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La empresa no existe';
  END IF;

  IF v_anterior = p_estado THEN
    RETURN;
  END IF;

  UPDATE empresas SET estado = p_estado WHERE id = p_empresa;

  INSERT INTO empresa_revisiones (empresa_id, estado_anterior, estado_nuevo, motivo, admin_id)
  VALUES (p_empresa, v_anterior, p_estado, nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.admin_empresas(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_cambiar_estado_empresa(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_admin_plataforma() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_empresas(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_estado_empresa(bigint, text, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
