-- Preguntas antes de comprar: preguntas públicas en la ficha de cada prenda.
-- Pregunta cualquier usuario logueado que no sea el vendedor; responde el particular
-- que publicó o un miembro de la empresa con el permiso nuevo preguntas.responder.
-- No se aceptan teléfonos, mails ni links (para que la venta no salga de la app):
-- contiene_datos_contacto() la usa también el chat de pedidos.
--
-- Correr en el SQL Editor de Supabase después de 22-terminos.sql.

-- 1) Filtro de datos de contacto (la app tiene una copia en utils/contacto.ts).
CREATE OR REPLACE FUNCTION public.contiene_datos_contacto(p_texto text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_texto, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      OR coalesce(p_texto, '') ~* '(https?://|www\.)'
      OR coalesce(p_texto, '') ~* '\m[a-z0-9-]+\.(com|ar|net|org|me)\M'
      OR coalesce(p_texto, '') ~ '(\d[ .\-]?){8,}'
      OR coalesce(p_texto, '') ~* '\m(whats ?app|wsp|wpp|telegram|instagram)\M';
$$;

-- 2) Permiso para responder de una empresa (lo tienen los roles que publican prendas).
INSERT INTO public.permisos (codigo, descripcion) VALUES
  ('preguntas.responder', 'Responder preguntas y mensajes de compradores')
ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO public.rol_permisos (rol, permiso)
SELECT rp.rol, 'preguntas.responder' FROM public.rol_permisos rp WHERE rp.permiso = 'productos.publicar'
ON CONFLICT DO NOTHING;

-- ¿El usuario actual puede responder por esta prenda?
CREATE OR REPLACE FUNCTION public.puede_responder_producto(p_producto bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM productos p
     WHERE p.productoid = p_producto
       AND ((p.empresa_id IS NULL AND p.creado_por = auth.uid())
         OR (p.empresa_id IS NOT NULL AND public.tiene_permiso(p.empresa_id, 'preguntas.responder')))
  );
$$;
GRANT EXECUTE ON FUNCTION public.puede_responder_producto(bigint) TO authenticated;

-- 3) Tabla.
CREATE TABLE IF NOT EXISTS public.preguntas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id bigint NOT NULL REFERENCES public.productos(productoid) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 3 AND 300),
  respuesta text CHECK (respuesta IS NULL OR char_length(btrim(respuesta)) BETWEEN 1 AND 500),
  respondida_por uuid REFERENCES auth.users(id),
  respondida_at timestamptz,
  oculta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS preguntas_producto ON public.preguntas (producto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS preguntas_sin_responder ON public.preguntas (producto_id) WHERE respuesta IS NULL AND NOT oculta;

ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

-- Todos ven las visibles; el autor ve las suyas aunque estén ocultas; el vendedor ve todas.
DROP POLICY IF EXISTS preguntas_lectura ON public.preguntas;
CREATE POLICY preguntas_lectura ON public.preguntas FOR SELECT TO anon, authenticated
  USING (NOT oculta OR autor_id = auth.uid() OR public.puede_responder_producto(producto_id));
-- Sin políticas de escritura: todo pasa por las funciones de abajo.

-- 4) Preguntar.
CREATE OR REPLACE FUNCTION public.hacer_pregunta(p_producto bigint, p_texto text)
RETURNS public.preguntas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pregunta public.preguntas;
  v_texto text := btrim(coalesce(p_texto, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión para preguntar.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM productos WHERE productoid = p_producto) THEN
    RAISE EXCEPTION 'La prenda ya no existe.';
  END IF;
  IF public.puede_responder_producto(p_producto) THEN
    RAISE EXCEPTION 'No podés preguntar en tu propia publicación.';
  END IF;
  IF char_length(v_texto) < 3 OR char_length(v_texto) > 300 THEN
    RAISE EXCEPTION 'La pregunta tiene que tener entre 3 y 300 caracteres.';
  END IF;
  IF public.contiene_datos_contacto(v_texto) THEN
    RAISE EXCEPTION 'Por seguridad no se pueden compartir teléfonos, mails, redes ni links.';
  END IF;
  IF (SELECT count(*) FROM preguntas
       WHERE producto_id = p_producto AND autor_id = auth.uid()
         AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Ya hiciste 5 preguntas sobre esta prenda hoy. Esperá la respuesta del vendedor.';
  END IF;

  INSERT INTO preguntas (producto_id, autor_id, texto)
  VALUES (p_producto, auth.uid(), v_texto)
  RETURNING * INTO v_pregunta;
  RETURN v_pregunta;
END;
$$;
REVOKE ALL ON FUNCTION public.hacer_pregunta(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hacer_pregunta(bigint, text) TO authenticated;

-- 5) Responder (o corregir la respuesta).
CREATE OR REPLACE FUNCTION public.responder_pregunta(p_pregunta bigint, p_respuesta text)
RETURNS public.preguntas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pregunta public.preguntas;
  v_texto text := btrim(coalesce(p_respuesta, ''));
BEGIN
  SELECT * INTO v_pregunta FROM preguntas WHERE id = p_pregunta FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La pregunta no existe.';
  END IF;
  IF NOT public.puede_responder_producto(v_pregunta.producto_id) THEN
    RAISE EXCEPTION 'Sólo el vendedor puede responder.';
  END IF;
  IF char_length(v_texto) < 1 OR char_length(v_texto) > 500 THEN
    RAISE EXCEPTION 'La respuesta tiene que tener entre 1 y 500 caracteres.';
  END IF;
  IF public.contiene_datos_contacto(v_texto) THEN
    RAISE EXCEPTION 'Por seguridad no se pueden compartir teléfonos, mails, redes ni links.';
  END IF;

  UPDATE preguntas
     SET respuesta = v_texto, respondida_por = auth.uid(), respondida_at = now()
   WHERE id = p_pregunta
  RETURNING * INTO v_pregunta;
  RETURN v_pregunta;
END;
$$;
REVOKE ALL ON FUNCTION public.responder_pregunta(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_pregunta(bigint, text) TO authenticated;

-- 6) Ocultar o volver a mostrar una pregunta ofensiva (el vendedor o el admin).
CREATE OR REPLACE FUNCTION public.ocultar_pregunta(p_pregunta bigint, p_oculta boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto bigint;
BEGIN
  SELECT producto_id INTO v_producto FROM preguntas WHERE id = p_pregunta;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La pregunta no existe.';
  END IF;
  IF NOT (public.puede_responder_producto(v_producto) OR public.es_admin_plataforma()) THEN
    RAISE EXCEPTION 'No tenés permiso para hacer esto.';
  END IF;
  UPDATE preguntas SET oculta = p_oculta WHERE id = p_pregunta;
END;
$$;
REVOKE ALL ON FUNCTION public.ocultar_pregunta(bigint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ocultar_pregunta(bigint, boolean) TO authenticated;

-- 7) Preguntas sin responder de mis publicaciones (contador de Mis publicaciones).
CREATE OR REPLACE FUNCTION public.mis_preguntas_pendientes()
RETURNS TABLE (producto_id bigint, cantidad bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.producto_id, count(*)
    FROM preguntas q
   WHERE q.respuesta IS NULL AND NOT q.oculta
     AND public.puede_responder_producto(q.producto_id)
   GROUP BY q.producto_id;
$$;
GRANT EXECUTE ON FUNCTION public.mis_preguntas_pendientes() TO authenticated;

-- 8) Push: pregunta nueva → al vendedor (o a quienes responden en la empresa);
--    respuesta → a quien preguntó. Requiere enviar_push (14-push-tokens.sql).
CREATE OR REPLACE FUNCTION public.notificar_pregunta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto productos;
  v_destino uuid;
BEGIN
  SELECT * INTO v_producto FROM productos WHERE productoid = NEW.producto_id;

  IF TG_OP = 'INSERT' THEN
    FOR v_destino IN
      SELECT v_producto.creado_por WHERE v_producto.empresa_id IS NULL
      UNION
      SELECT m.usuario_id
        FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'preguntas.responder'
       WHERE m.empresa_id = v_producto.empresa_id
    LOOP
      PERFORM enviar_push(v_destino, 'Nueva pregunta',
        format('Te preguntaron por "%s": %s', v_producto.nombre, left(NEW.texto, 80)),
        jsonb_build_object('productoId', NEW.producto_id, 'tipo', 'pregunta'));
    END LOOP;
  ELSIF NEW.respuesta IS NOT NULL AND OLD.respuesta IS NULL THEN
    PERFORM enviar_push(NEW.autor_id, 'Te respondieron',
      format('El vendedor respondió tu pregunta sobre "%s".', v_producto.nombre),
      jsonb_build_object('productoId', NEW.producto_id, 'tipo', 'respuesta'));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preguntas_push ON public.preguntas;
CREATE TRIGGER preguntas_push AFTER INSERT OR UPDATE OF respuesta ON public.preguntas
  FOR EACH ROW EXECUTE FUNCTION public.notificar_pregunta();
