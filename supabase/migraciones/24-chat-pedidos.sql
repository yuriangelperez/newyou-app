-- Chat interno entre comprador y vendedor, uno por pedido.
-- Lo ven quienes ya ven el pedido (puede_ver_pedido): el comprador, el particular que
-- vende o un miembro de la empresa con pedidos.ver en esa sede.
-- Los cambios de estado aparecen como mensajes del sistema. 30 días después de
-- entregado o cancelado el chat queda de solo lectura (sirve como prueba en un reclamo).
-- Se usa Supabase Realtime: la tabla se agrega a la publicación supabase_realtime.
--
-- Correr en el SQL Editor de Supabase después de 23-preguntas.sql.

CREATE TABLE IF NOT EXISTS public.mensajes_pedido (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  -- Nulo en los mensajes del sistema.
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 1000),
  sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensajes_pedido_pedido ON public.mensajes_pedido (pedido_id, created_at);

-- Hasta dónde leyó cada usuario cada chat (para el contador de no leídos).
CREATE TABLE IF NOT EXISTS public.mensajes_lecturas (
  pedido_id bigint NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leido_hasta timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pedido_id, usuario_id)
);

ALTER TABLE public.mensajes_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_lecturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensajes_lectura ON public.mensajes_pedido;
CREATE POLICY mensajes_lectura ON public.mensajes_pedido FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(pedido_id) OR public.es_admin_plataforma());

DROP POLICY IF EXISTS lecturas_propias ON public.mensajes_lecturas;
CREATE POLICY lecturas_propias ON public.mensajes_lecturas FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());
-- Sin políticas de escritura: se escribe con enviar_mensaje y marcar_chat_leido.

-- ¿El chat todavía acepta mensajes?
CREATE OR REPLACE FUNCTION public.chat_abierto(p_pedido bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pedidos p
     WHERE p.id = p_pedido
       AND (p.estado NOT IN ('entregado', 'cancelado') OR p.updated_at > now() - interval '30 days')
  );
$$;
GRANT EXECUTE ON FUNCTION public.chat_abierto(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.enviar_mensaje(p_pedido bigint, p_texto text)
RETURNS public.mensajes_pedido
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensaje public.mensajes_pedido;
  v_texto text := btrim(coalesce(p_texto, ''));
BEGIN
  IF NOT public.puede_ver_pedido(p_pedido) THEN
    RAISE EXCEPTION 'No tenés acceso a este pedido.';
  END IF;
  IF NOT public.chat_abierto(p_pedido) THEN
    RAISE EXCEPTION 'Este chat se cerró: pasaron 30 días desde que terminó el pedido.';
  END IF;
  IF char_length(v_texto) < 1 OR char_length(v_texto) > 1000 THEN
    RAISE EXCEPTION 'El mensaje tiene que tener entre 1 y 1000 caracteres.';
  END IF;
  IF public.contiene_datos_contacto(v_texto) THEN
    RAISE EXCEPTION 'Por seguridad no se pueden compartir teléfonos, mails, redes ni links.';
  END IF;

  INSERT INTO mensajes_pedido (pedido_id, autor_id, texto)
  VALUES (p_pedido, auth.uid(), v_texto)
  RETURNING * INTO v_mensaje;

  -- Quien escribe ya leyó todo.
  INSERT INTO mensajes_lecturas (pedido_id, usuario_id, leido_hasta)
  VALUES (p_pedido, auth.uid(), now())
  ON CONFLICT (pedido_id, usuario_id) DO UPDATE SET leido_hasta = now();

  RETURN v_mensaje;
END;
$$;
REVOKE ALL ON FUNCTION public.enviar_mensaje(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enviar_mensaje(bigint, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.marcar_chat_leido(p_pedido bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.puede_ver_pedido(p_pedido) THEN
    RETURN;
  END IF;
  INSERT INTO mensajes_lecturas (pedido_id, usuario_id, leido_hasta)
  VALUES (p_pedido, auth.uid(), now())
  ON CONFLICT (pedido_id, usuario_id) DO UPDATE SET leido_hasta = now();
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_chat_leido(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_chat_leido(bigint) TO authenticated;

-- Mensajes sin leer por pedido (sólo los que escribió otra persona).
CREATE OR REPLACE FUNCTION public.mis_chats_sin_leer()
RETURNS TABLE (pedido_id bigint, cantidad bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.pedido_id, count(*)
    FROM mensajes_pedido m
    LEFT JOIN mensajes_lecturas l ON l.pedido_id = m.pedido_id AND l.usuario_id = auth.uid()
   WHERE NOT m.sistema
     AND m.autor_id IS DISTINCT FROM auth.uid()
     AND m.created_at > coalesce(l.leido_hasta, '-infinity'::timestamptz)
     AND public.puede_ver_pedido(m.pedido_id)
   GROUP BY m.pedido_id;
$$;
GRANT EXECUTE ON FUNCTION public.mis_chats_sin_leer() TO authenticated;

-- Cambios de estado del pedido como mensajes del sistema.
CREATE OR REPLACE FUNCTION public.mensaje_sistema_evento_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO mensajes_pedido (pedido_id, texto, sistema)
  VALUES (
    NEW.pedido_id,
    CASE WHEN NEW.estado_anterior IS NULL THEN 'Pedido creado. Podés escribirle al vendedor por acá.'
         ELSE format('El pedido pasó a: %s.', replace(NEW.estado_nuevo, '_', ' ')) END
      || CASE WHEN NEW.nota IS NOT NULL THEN ' ' || NEW.nota ELSE '' END,
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_eventos_chat ON public.pedido_eventos;
CREATE TRIGGER pedido_eventos_chat AFTER INSERT ON public.pedido_eventos
  FOR EACH ROW EXECUTE FUNCTION public.mensaje_sistema_evento_pedido();

-- Push al otro lado de la conversación (requiere enviar_push, 14-push-tokens.sql).
CREATE OR REPLACE FUNCTION public.notificar_mensaje_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos;
  v_destino uuid;
BEGIN
  IF NEW.sistema THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_pedido FROM pedidos WHERE id = NEW.pedido_id;

  IF NEW.autor_id IS DISTINCT FROM v_pedido.comprador_id THEN
    PERFORM enviar_push(v_pedido.comprador_id, 'Mensaje del vendedor', left(NEW.texto, 120),
      jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'chat'));
  ELSE
    FOR v_destino IN
      SELECT v_pedido.vendedor_id WHERE v_pedido.vendedor_id IS NOT NULL
      UNION
      SELECT m.usuario_id
        FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'pedidos.ver'
       WHERE m.empresa_id = v_pedido.empresa_id
         AND (m.todas_las_sedes OR v_pedido.sede_id = ANY (m.sedes_permitidas))
    LOOP
      PERFORM enviar_push(v_destino, format('Mensaje del pedido #%s', v_pedido.id), left(NEW.texto, 120),
        jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'chat'));
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mensajes_pedido_push ON public.mensajes_pedido;
CREATE TRIGGER mensajes_pedido_push AFTER INSERT ON public.mensajes_pedido
  FOR EACH ROW EXECUTE FUNCTION public.notificar_mensaje_pedido();

-- Tiempo real: la app escucha los INSERT de esta tabla (respeta las políticas de arriba).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_pedido;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
  NULL;
END $$;
