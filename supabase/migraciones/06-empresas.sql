-- Modo empresa: empresas, sedes, miembros con rol e invitaciones.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 05-particular.sql).
-- La empresa nace "pendiente"; un administrador la verifica desde el SQL Editor:
--   UPDATE public.empresas SET estado = 'verificada' WHERE cuit = '<cuit>';

BEGIN;

-- 1) Catálogo de roles y permisos. Las políticas preguntan por permisos, no por roles,
--    así un rol nuevo es sólo filas en rol_permisos.
CREATE TABLE IF NOT EXISTS public.roles (
  codigo text PRIMARY KEY,
  nombre text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permisos (
  codigo text PRIMARY KEY,
  descripcion text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.rol_permisos (
  rol text NOT NULL REFERENCES public.roles(codigo) ON DELETE CASCADE,
  permiso text NOT NULL REFERENCES public.permisos(codigo) ON DELETE CASCADE,
  PRIMARY KEY (rol, permiso)
);

INSERT INTO public.roles (codigo, nombre) VALUES
  ('propietario', 'Propietario'),
  ('administrador', 'Administrador'),
  ('vendedor', 'Vendedor'),
  ('envios', 'Envíos')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO public.permisos (codigo, descripcion) VALUES
  ('empresa.editar', 'Editar los datos de la empresa'),
  ('equipo.gestionar', 'Invitar, cambiar el rol y quitar miembros'),
  ('sedes.gestionar', 'Crear y editar sedes'),
  ('productos.publicar', 'Publicar y editar prendas'),
  ('productos.precio', 'Cambiar precios y descuentos'),
  ('stock.editar', 'Cambiar el stock'),
  ('pedidos.ver', 'Ver pedidos'),
  ('pedidos.estado', 'Cambiar el estado de los pedidos'),
  ('envios.gestionar', 'Gestionar envíos'),
  ('metricas.ver', 'Ver métricas')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO public.rol_permisos (rol, permiso)
SELECT r.rol, p.codigo
  FROM (VALUES ('propietario'), ('administrador')) AS r(rol)
 CROSS JOIN public.permisos p
UNION ALL
SELECT 'vendedor', unnest(ARRAY['productos.publicar', 'stock.editar', 'pedidos.ver', 'pedidos.estado'])
UNION ALL
SELECT 'envios', unnest(ARRAY['pedidos.ver', 'envios.gestionar'])
ON CONFLICT DO NOTHING;

-- 2) Empresas y sedes.
CREATE TABLE IF NOT EXISTS public.empresas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  razon_social text NOT NULL CHECK (char_length(btrim(razon_social)) > 0),
  nombre_fantasia text NOT NULL CHECK (char_length(btrim(nombre_fantasia)) > 0),
  cuit text NOT NULL UNIQUE CHECK (cuit ~ '^\d{11}$'),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  descripcion text,
  logo_url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificada', 'suspendida')),
  creada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sedes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL CHECK (char_length(btrim(nombre)) > 0),
  direccion text NOT NULL CHECK (char_length(btrim(direccion)) > 0),
  horarios text,
  hace_retiro boolean NOT NULL DEFAULT true,
  hace_envio boolean NOT NULL DEFAULT false,
  costo_envio numeric NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hace_retiro OR hace_envio)
);
CREATE INDEX IF NOT EXISTS sedes_empresa ON public.sedes (empresa_id);

-- 3) Miembros e invitaciones.
CREATE TABLE IF NOT EXISTS public.empresa_miembros (
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL REFERENCES public.roles(codigo),
  todas_las_sedes boolean NOT NULL DEFAULT true,
  sedes_permitidas bigint[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS empresa_miembros_usuario ON public.empresa_miembros (usuario_id, empresa_id);

CREATE TABLE IF NOT EXISTS public.invitaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id bigint NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (position('@' IN email) > 1),
  rol text NOT NULL REFERENCES public.roles(codigo) CHECK (rol <> 'propietario'),
  todas_las_sedes boolean NOT NULL DEFAULT true,
  sedes_permitidas bigint[] NOT NULL DEFAULT '{}',
  codigo text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  vence_en timestamptz NOT NULL DEFAULT now() + interval '7 days',
  creada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  aceptada_por uuid REFERENCES auth.users(id),
  aceptada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Prendas de empresa: se publican por sede (la carga desde la app llega en la entrega 3).
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES public.empresas(id),
  ADD COLUMN IF NOT EXISTS sede_id bigint REFERENCES public.sedes(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_empresa_con_sede') THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_empresa_con_sede CHECK ((empresa_id IS NULL) = (sede_id IS NULL));
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS productos_empresa_sede ON public.productos (empresa_id, sede_id);

-- 5) Chequeos de permiso. SECURITY DEFINER para que las políticas de empresa_miembros
--    no se llamen a sí mismas.
CREATE OR REPLACE FUNCTION public.es_miembro(p_empresa bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM empresa_miembros
     WHERE empresa_id = p_empresa AND usuario_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_empresa bigint, p_permiso text, p_sede bigint DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM empresa_miembros m
      JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = p_permiso
      JOIN empresas e ON e.id = m.empresa_id AND e.estado <> 'suspendida'
     WHERE m.empresa_id = p_empresa
       AND m.usuario_id = auth.uid()
       AND (p_sede IS NULL OR m.todas_las_sedes OR p_sede = ANY (m.sedes_permitidas))
  );
$$;

GRANT EXECUTE ON FUNCTION public.es_miembro(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_permiso(bigint, text, bigint) TO authenticated;

-- 6) Políticas.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_lectura ON public.roles;
CREATE POLICY roles_lectura ON public.roles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS permisos_lectura ON public.permisos;
CREATE POLICY permisos_lectura ON public.permisos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS rol_permisos_lectura ON public.rol_permisos;
CREATE POLICY rol_permisos_lectura ON public.rol_permisos FOR SELECT TO anon, authenticated USING (true);

-- Empresas verificadas son públicas (página de la tienda); los miembros ven la suya siempre.
-- El alta es con crear_empresa(); el estado y el CUIT no se editan desde la app (trigger abajo).
DROP POLICY IF EXISTS empresas_lectura ON public.empresas;
CREATE POLICY empresas_lectura ON public.empresas FOR SELECT TO anon, authenticated
  USING (estado = 'verificada' OR public.es_miembro(id));
DROP POLICY IF EXISTS empresas_edicion ON public.empresas;
CREATE POLICY empresas_edicion ON public.empresas FOR UPDATE TO authenticated
  USING (public.tiene_permiso(id, 'empresa.editar'))
  WITH CHECK (public.tiene_permiso(id, 'empresa.editar'));

DROP POLICY IF EXISTS sedes_lectura ON public.sedes;
CREATE POLICY sedes_lectura ON public.sedes FOR SELECT TO anon, authenticated
  USING (
    public.es_miembro(empresa_id)
    OR (activa AND EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id AND e.estado = 'verificada'))
  );
DROP POLICY IF EXISTS sedes_gestion ON public.sedes;
CREATE POLICY sedes_gestion ON public.sedes FOR ALL TO authenticated
  USING (public.tiene_permiso(empresa_id, 'sedes.gestionar'))
  WITH CHECK (public.tiene_permiso(empresa_id, 'sedes.gestionar'));

-- Los miembros se escriben sólo con las funciones de abajo.
DROP POLICY IF EXISTS miembros_lectura ON public.empresa_miembros;
CREATE POLICY miembros_lectura ON public.empresa_miembros FOR SELECT TO authenticated
  USING (public.es_miembro(empresa_id));

DROP POLICY IF EXISTS invitaciones_lectura ON public.invitaciones;
CREATE POLICY invitaciones_lectura ON public.invitaciones FOR SELECT TO authenticated
  USING (public.tiene_permiso(empresa_id, 'equipo.gestionar') OR lower(email) = lower(auth.email()));
DROP POLICY IF EXISTS invitaciones_alta ON public.invitaciones;
CREATE POLICY invitaciones_alta ON public.invitaciones FOR INSERT TO authenticated
  WITH CHECK (public.tiene_permiso(empresa_id, 'equipo.gestionar') AND aceptada_por IS NULL);
DROP POLICY IF EXISTS invitaciones_baja ON public.invitaciones;
CREATE POLICY invitaciones_baja ON public.invitaciones FOR DELETE TO authenticated
  USING (public.tiene_permiso(empresa_id, 'equipo.gestionar') AND aceptada_por IS NULL);

-- Restrictiva (se suma con AND a las de 05): nadie asigna una prenda a una empresa o sede
-- en la que no tiene permiso de publicar, y la sede tiene que ser de esa empresa.
DROP POLICY IF EXISTS productos_empresa_permitida ON public.productos;
CREATE POLICY productos_empresa_permitida ON public.productos AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    empresa_id IS NULL
    OR (public.tiene_permiso(empresa_id, 'productos.publicar', sede_id)
        AND EXISTS (SELECT 1 FROM public.sedes s WHERE s.id = sede_id AND s.empresa_id = productos.empresa_id))
  );

-- 7) Estado y CUIT sólo los cambia un administrador de la plataforma (SQL Editor).
CREATE OR REPLACE FUNCTION public.empresas_proteger_campos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.estado IS DISTINCT FROM OLD.estado
          OR NEW.cuit IS DISTINCT FROM OLD.cuit
          OR NEW.slug IS DISTINCT FROM OLD.slug
          OR NEW.creada_por IS DISTINCT FROM OLD.creada_por) THEN
    RAISE EXCEPTION 'Ese dato de la empresa no se puede modificar desde la app';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS empresas_proteger_campos ON public.empresas;
CREATE TRIGGER empresas_proteger_campos
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.empresas_proteger_campos();

-- 8) Funciones de la app.

-- Valida el dígito verificador del CUIT (módulo 11).
CREATE OR REPLACE FUNCTION public.cuit_valido(p_cuit text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pesos int[] := ARRAY[5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  v_suma int := 0;
  v_dv int;
BEGIN
  IF p_cuit !~ '^\d{11}$' THEN
    RETURN false;
  END IF;
  FOR i IN 1..10 LOOP
    v_suma := v_suma + substr(p_cuit, i, 1)::int * v_pesos[i];
  END LOOP;
  v_dv := 11 - (v_suma % 11);
  v_dv := CASE v_dv WHEN 11 THEN 0 WHEN 10 THEN 9 ELSE v_dv END;
  RETURN v_dv = substr(p_cuit, 11, 1)::int;
END;
$$;

-- Crea la empresa (pendiente), su primera sede y al creador como propietario.
CREATE OR REPLACE FUNCTION public.crear_empresa(
  p_razon_social text,
  p_nombre_fantasia text,
  p_cuit text,
  p_descripcion text,
  p_sede_nombre text,
  p_sede_direccion text,
  p_hace_retiro boolean DEFAULT true,
  p_hace_envio boolean DEFAULT false
) RETURNS public.empresas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cuit text := regexp_replace(coalesce(p_cuit, ''), '\D', '', 'g');
  v_base text;
  v_slug text;
  v_empresa public.empresas;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  IF NOT public.cuit_valido(v_cuit) THEN
    RAISE EXCEPTION 'El CUIT no es válido';
  END IF;

  IF EXISTS (SELECT 1 FROM empresas WHERE cuit = v_cuit) THEN
    RAISE EXCEPTION 'Ya hay una empresa registrada con ese CUIT';
  END IF;

  v_base := trim(BOTH '-' FROM regexp_replace(
    lower(translate(btrim(p_nombre_fantasia), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
    '[^a-z0-9]+', '-', 'g'));
  v_base := coalesce(nullif(v_base, ''), 'tienda');
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM empresas WHERE slug = v_slug) LOOP
    v_slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  END LOOP;

  INSERT INTO empresas (razon_social, nombre_fantasia, cuit, slug, descripcion, creada_por)
  VALUES (btrim(p_razon_social), btrim(p_nombre_fantasia), v_cuit, v_slug,
          nullif(btrim(coalesce(p_descripcion, '')), ''), v_uid)
  RETURNING * INTO v_empresa;

  INSERT INTO sedes (empresa_id, nombre, direccion, hace_retiro, hace_envio)
  VALUES (v_empresa.id, btrim(p_sede_nombre), btrim(p_sede_direccion), p_hace_retiro, p_hace_envio);

  INSERT INTO empresa_miembros (empresa_id, usuario_id, rol)
  VALUES (v_empresa.id, v_uid, 'propietario');

  RETURN v_empresa;
END;
$$;

-- Empresas del usuario con su rol y sus permisos (para el selector de contexto).
CREATE OR REPLACE FUNCTION public.mis_empresas()
RETURNS TABLE (
  empresa_id bigint,
  nombre_fantasia text,
  slug text,
  estado text,
  rol text,
  todas_las_sedes boolean,
  sedes_permitidas bigint[],
  permisos text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.nombre_fantasia, e.slug, e.estado, m.rol, m.todas_las_sedes, m.sedes_permitidas,
         coalesce(array_agg(rp.permiso ORDER BY rp.permiso) FILTER (WHERE rp.permiso IS NOT NULL), '{}')
    FROM empresa_miembros m
    JOIN empresas e ON e.id = m.empresa_id
    LEFT JOIN rol_permisos rp ON rp.rol = m.rol AND e.estado <> 'suspendida'
   WHERE m.usuario_id = auth.uid()
   GROUP BY e.id, m.rol, m.todas_las_sedes, m.sedes_permitidas
   ORDER BY e.nombre_fantasia;
$$;

-- Equipo de una empresa con nombre y correo (profiles no es legible entre usuarios).
CREATE OR REPLACE FUNCTION public.equipo_empresa(p_empresa bigint)
RETURNS TABLE (
  usuario_id uuid,
  username text,
  email text,
  rol text,
  todas_las_sedes boolean,
  sedes_permitidas bigint[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.usuario_id, p.username, p.email, m.rol, m.todas_las_sedes, m.sedes_permitidas
    FROM empresa_miembros m
    JOIN profiles p ON p.id = m.usuario_id
   WHERE m.empresa_id = p_empresa
     AND public.es_miembro(p_empresa)
   ORDER BY array_position(ARRAY['propietario', 'administrador', 'vendedor', 'envios'], m.rol), p.username;
$$;

-- Acepta una invitación vigente dirigida al correo del usuario.
CREATE OR REPLACE FUNCTION public.aceptar_invitacion(p_codigo text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.invitaciones;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  SELECT * INTO v_inv FROM invitaciones
   WHERE codigo = upper(btrim(p_codigo))
   FOR UPDATE;

  IF NOT FOUND OR v_inv.aceptada_por IS NOT NULL OR v_inv.vence_en < now() THEN
    RAISE EXCEPTION 'La invitación no existe, ya se usó o venció';
  END IF;

  IF lower(v_inv.email) <> lower(coalesce(auth.email(), '')) THEN
    RAISE EXCEPTION 'La invitación es para otro correo';
  END IF;

  INSERT INTO empresa_miembros (empresa_id, usuario_id, rol, todas_las_sedes, sedes_permitidas)
  VALUES (v_inv.empresa_id, v_uid, v_inv.rol, v_inv.todas_las_sedes, v_inv.sedes_permitidas)
  ON CONFLICT (empresa_id, usuario_id) DO NOTHING;

  UPDATE invitaciones SET aceptada_por = v_uid, aceptada_en = now() WHERE id = v_inv.id;

  RETURN v_inv.empresa_id;
END;
$$;

-- Cambia el rol o las sedes de un miembro. Sólo un propietario asigna o quita el rol de propietario,
-- y la empresa nunca queda sin propietario.
CREATE OR REPLACE FUNCTION public.cambiar_rol_miembro(
  p_empresa bigint,
  p_usuario uuid,
  p_rol text,
  p_todas_las_sedes boolean DEFAULT true,
  p_sedes bigint[] DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual text;
  v_soy_propietario boolean;
BEGIN
  IF NOT public.tiene_permiso(p_empresa, 'equipo.gestionar') THEN
    RAISE EXCEPTION 'No tenés permiso para gestionar el equipo';
  END IF;

  SELECT rol INTO v_actual FROM empresa_miembros
   WHERE empresa_id = p_empresa AND usuario_id = p_usuario
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa persona no es miembro de la empresa';
  END IF;

  v_soy_propietario := EXISTS (
    SELECT 1 FROM empresa_miembros
     WHERE empresa_id = p_empresa AND usuario_id = auth.uid() AND rol = 'propietario');

  IF (p_rol = 'propietario' OR v_actual = 'propietario') AND NOT v_soy_propietario THEN
    RAISE EXCEPTION 'Sólo un propietario puede asignar o quitar ese rol';
  END IF;

  IF v_actual = 'propietario' AND p_rol <> 'propietario' AND NOT EXISTS (
    SELECT 1 FROM empresa_miembros
     WHERE empresa_id = p_empresa AND rol = 'propietario' AND usuario_id <> p_usuario) THEN
    RAISE EXCEPTION 'La empresa necesita al menos un propietario';
  END IF;

  UPDATE empresa_miembros
     SET rol = p_rol,
         todas_las_sedes = p_rol IN ('propietario', 'administrador') OR p_todas_las_sedes,
         sedes_permitidas = CASE WHEN p_rol IN ('propietario', 'administrador') OR p_todas_las_sedes
                                 THEN '{}' ELSE coalesce(p_sedes, '{}') END
   WHERE empresa_id = p_empresa AND usuario_id = p_usuario;
END;
$$;

-- Quita a un miembro (o a uno mismo, para salir de la empresa).
CREATE OR REPLACE FUNCTION public.quitar_miembro(p_empresa bigint, p_usuario uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual text;
BEGIN
  IF p_usuario <> auth.uid() AND NOT public.tiene_permiso(p_empresa, 'equipo.gestionar') THEN
    RAISE EXCEPTION 'No tenés permiso para gestionar el equipo';
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

REVOKE ALL ON FUNCTION public.crear_empresa(text, text, text, text, text, text, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mis_empresas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.equipo_empresa(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aceptar_invitacion(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cambiar_rol_miembro(bigint, uuid, text, boolean, bigint[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quitar_miembro(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_empresa(text, text, text, text, text, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mis_empresas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.equipo_empresa(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceptar_invitacion(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_rol_miembro(bigint, uuid, text, boolean, bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quitar_miembro(bigint, uuid) TO authenticated;

COMMIT;
