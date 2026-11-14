-- Aislamiento de las cuentas demo (presentación del 16/11/2026).
-- Pegar TODO en el SQL Editor de Supabase y ejecutar una vez. Correrlo después de demo-cuentas.sql.
--
-- Qué cambia:
-- - Las cuentas demo (CompradorDemo, VendedorDemo, EmpresaDemo) ven SÓLO lo de las cuentas demo:
--   prendas, tiendas, sedes y preguntas.
-- - El resto de los usuarios (y quien entra sin sesión) NO ven nada de lo que publican o preguntan
--   las cuentas demo.
-- - Los administradores de la plataforma ven todo.
-- - Una cuenta demo no le puede comprar a una real ni una real a una demo (lo frena el servidor
--   aunque alguien llegue a la prenda con un link).
-- Las cuentas demo se anotan en la tabla cuentas_demo. Para sumar otra:
--   INSERT INTO public.cuentas_demo (usuario_id) SELECT id FROM auth.users WHERE email = '...';
-- Para deshacerlo todo, al final del archivo está el bloque "VOLVER ATRÁS".

BEGIN;

-- 1) Qué cuentas son demo.
CREATE TABLE IF NOT EXISTS public.cuentas_demo (
  usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Sin políticas: desde la app no se lee ni se escribe (sólo la usan las funciones de abajo).
ALTER TABLE public.cuentas_demo ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cuentas_demo (usuario_id)
SELECT id FROM auth.users
 WHERE lower(email) IN ('newyou.testing+compradordemo@gmail.com', 'newyou.testing+vendedordemo@gmail.com',
                        'newyou.testing+empresademo@gmail.com')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.es_cuenta_demo(p_usuario uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_usuario IS NOT NULL AND EXISTS (SELECT 1 FROM cuentas_demo WHERE usuario_id = p_usuario);
$$;

-- Empresa demo: la creó una cuenta demo.
CREATE OR REPLACE FUNCTION public.es_empresa_demo(p_empresa bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_empresa IS NOT NULL AND EXISTS (
    SELECT 1 FROM empresas e JOIN cuentas_demo d ON d.usuario_id = e.creada_por WHERE e.id = p_empresa
  );
$$;

-- ¿El usuario actual puede ver algo que es (o no es) de la demo? Admin: todo. Demo: sólo lo demo.
-- Real o sin sesión: sólo lo real.
CREATE OR REPLACE FUNCTION public.ve_contenido_demo(p_es_demo boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND public.es_admin_plataforma() THEN true
    ELSE coalesce(p_es_demo, false) = public.es_cuenta_demo(auth.uid())
  END;
$$;

GRANT EXECUTE ON FUNCTION public.es_cuenta_demo(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.es_empresa_demo(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ve_contenido_demo(boolean) TO anon, authenticated;

-- 2) Políticas restrictivas de lectura (se suman con AND a las que ya hay).
DROP POLICY IF EXISTS productos_demo_aislado ON public.productos;
CREATE POLICY productos_demo_aislado ON public.productos AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (public.ve_contenido_demo(public.es_cuenta_demo(creado_por) OR public.es_empresa_demo(empresa_id)));

DROP POLICY IF EXISTS empresas_demo_aislado ON public.empresas;
CREATE POLICY empresas_demo_aislado ON public.empresas AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (public.ve_contenido_demo(public.es_cuenta_demo(creada_por)));

DROP POLICY IF EXISTS sedes_demo_aislado ON public.sedes;
CREATE POLICY sedes_demo_aislado ON public.sedes AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (public.ve_contenido_demo(public.es_empresa_demo(empresa_id)));

DROP POLICY IF EXISTS preguntas_demo_aislado ON public.preguntas;
CREATE POLICY preguntas_demo_aislado ON public.preguntas AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (public.ve_contenido_demo(public.es_cuenta_demo(autor_id)));

-- 3) Sin compras cruzadas entre cuentas demo y reales (confirmar_compra arma un pedido por vendedor).
CREATE OR REPLACE FUNCTION public.pedidos_demo_aislado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.es_cuenta_demo(NEW.comprador_id)
     IS DISTINCT FROM (public.es_cuenta_demo(NEW.vendedor_id) OR public.es_empresa_demo(NEW.empresa_id)) THEN
    RAISE EXCEPTION 'En la versión demo, las cuentas de prueba sólo compran y venden entre ellas.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_demo_aislado ON public.pedidos;
CREATE TRIGGER pedidos_demo_aislado BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_demo_aislado();

COMMIT;

-- Cuentas marcadas como demo:
SELECT u.email FROM public.cuentas_demo d JOIN auth.users u ON u.id = d.usuario_id ORDER BY 1;

-- ===== VOLVER ATRÁS (sólo si querés sacar el aislamiento) =====
-- Seleccioná desde BEGIN hasta COMMIT, sacale los "-- " y ejecutalo.
-- BEGIN;
-- DROP TRIGGER IF EXISTS pedidos_demo_aislado ON public.pedidos;
-- DROP FUNCTION IF EXISTS public.pedidos_demo_aislado();
-- DROP POLICY IF EXISTS productos_demo_aislado ON public.productos;
-- DROP POLICY IF EXISTS empresas_demo_aislado ON public.empresas;
-- DROP POLICY IF EXISTS sedes_demo_aislado ON public.sedes;
-- DROP POLICY IF EXISTS preguntas_demo_aislado ON public.preguntas;
-- DROP FUNCTION IF EXISTS public.ve_contenido_demo(boolean);
-- DROP FUNCTION IF EXISTS public.es_empresa_demo(bigint);
-- DROP FUNCTION IF EXISTS public.es_cuenta_demo(uuid);
-- DROP TABLE IF EXISTS public.cuentas_demo;
-- COMMIT;
