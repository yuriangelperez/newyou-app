-- 28 · Panel de notificaciones dentro de la app.
-- Todo lo que se avisa por push (ventas, cambios de estado, mensajes del chat, preguntas,
-- verificación de usadas) queda guardado también en public.notificaciones, para verlo
-- desde la campanita aunque el push no haya llegado o se haya descartado.
-- Se suman avisos de reclamos resueltos y liquidaciones pagadas, y pedido_detalle() para el chat.
-- Requiere 14 (enviar_push), 24 (chat) y 27 (reclamos y liquidaciones). Usa Supabase Realtime.

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  cuerpo text NOT NULL DEFAULT '',
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notificaciones_usuario ON public.notificaciones (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notificaciones_no_leidas ON public.notificaciones (usuario_id) WHERE NOT leida;

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Cada uno ve sólo las suyas. Se crean desde la base (enviar_push) y se marcan leídas con la RPC.
DROP POLICY IF EXISTS notificaciones_select ON public.notificaciones;
CREATE POLICY notificaciones_select ON public.notificaciones
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

-- enviar_push ahora también guarda la notificación (aunque el usuario no tenga celular registrado).
-- Los mensajes del chat de un mismo pedido no se apilan: si hay una sin leer, se actualiza.
CREATE OR REPLACE FUNCTION public.enviar_push(p_usuario uuid, p_titulo text, p_cuerpo text, p_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensajes jsonb;
  v_existente bigint;
  v_extra jsonb := '{}'::jsonb;
BEGIN
  IF p_usuario IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    -- Para el panel: qué se compró (pedidos) o qué prenda es (preguntas, verificación).
    IF p_datos ? 'pedidoId' THEN
      SELECT jsonb_build_object(
               'detalle', string_agg(i.cantidad || ' × ' || i.nombre, ', ' ORDER BY i.id),
               'imagen', (array_agg(i.imagen_url ORDER BY i.id))[1])
        INTO v_extra
        FROM pedido_items i WHERE i.pedido_id = (p_datos->>'pedidoId')::bigint;
    ELSIF p_datos ? 'productoId' THEN
      SELECT jsonb_build_object('producto', pr.nombre, 'imagen', pr.imagen_url)
        INTO v_extra
        FROM productos pr WHERE pr.productoid = (p_datos->>'productoId')::bigint;
    END IF;
    v_extra := jsonb_strip_nulls(coalesce(v_extra, '{}'::jsonb)) || coalesce(p_datos, '{}'::jsonb);

    IF p_datos->>'tipo' = 'chat' AND p_datos ? 'pedidoId' THEN
      SELECT id INTO v_existente FROM notificaciones
       WHERE usuario_id = p_usuario AND NOT leida
         AND datos->>'tipo' = 'chat' AND datos->>'pedidoId' = p_datos->>'pedidoId'
       ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF v_existente IS NOT NULL THEN
      UPDATE notificaciones SET titulo = p_titulo, cuerpo = coalesce(p_cuerpo, ''), datos = v_extra, created_at = now()
       WHERE id = v_existente;
    ELSE
      INSERT INTO notificaciones (usuario_id, titulo, cuerpo, datos)
      VALUES (p_usuario, p_titulo, coalesce(p_cuerpo, ''), v_extra);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- guardar el aviso nunca debe frenar el push ni la operación que lo disparó
  END;

  SELECT jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', p_titulo, 'body', p_cuerpo, 'data', p_datos,
           'sound', 'default', 'channelId', 'publicaciones'))
    INTO v_mensajes
    FROM push_tokens t
   WHERE t.usuario_id = p_usuario;

  IF v_mensajes IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := v_mensajes,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.enviar_push(uuid, text, text, jsonb) FROM public, anon, authenticated;

-- Preguntas: el aviso lleva la pregunta completa (y la respuesta) además de la prenda.
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
      PERFORM enviar_push(v_destino, format('Nueva pregunta sobre "%s"', v_producto.nombre),
        left(NEW.texto, 120),
        jsonb_build_object('productoId', NEW.producto_id, 'tipo', 'pregunta', 'pregunta', NEW.texto));
    END LOOP;
  ELSIF NEW.respuesta IS NOT NULL AND OLD.respuesta IS NULL THEN
    PERFORM enviar_push(NEW.autor_id, format('Te respondieron sobre "%s"', v_producto.nombre),
      left(NEW.respuesta, 120),
      jsonb_build_object('productoId', NEW.producto_id, 'tipo', 'respuesta',
                         'pregunta', NEW.texto, 'respuesta', NEW.respuesta));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Marcar como leídas: unas puntuales (p_ids) o todas (p_ids NULL).
CREATE OR REPLACE FUNCTION public.marcar_notificaciones_leidas(p_ids bigint[] DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE notificaciones SET leida = true
   WHERE usuario_id = auth.uid() AND NOT leida AND (p_ids IS NULL OR id = ANY (p_ids));
$$;
REVOKE ALL ON FUNCTION public.marcar_notificaciones_leidas(bigint[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.marcar_notificaciones_leidas(bigint[]) TO authenticated;

-- Al abrir el chat de un pedido, su aviso de mensajes queda leído.
CREATE OR REPLACE FUNCTION public.notificaciones_chat_leidas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notificaciones SET leida = true
   WHERE usuario_id = NEW.usuario_id AND NOT leida
     AND datos->>'tipo' = 'chat' AND datos->>'pedidoId' = NEW.pedido_id::text;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS mensajes_lecturas_notificaciones ON public.mensajes_lecturas;
CREATE TRIGGER mensajes_lecturas_notificaciones AFTER INSERT OR UPDATE ON public.mensajes_lecturas
  FOR EACH ROW EXECUTE FUNCTION public.notificaciones_chat_leidas();

-- Reclamo resuelto: se avisa al comprador y al vendedor (o a quien gestiona pedidos en la empresa).
CREATE OR REPLACE FUNCTION public.notificar_reclamo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos;
  v_destino uuid;
  v_texto text;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = NEW.pedido_id;
  IF TG_OP = 'INSERT' THEN
    FOR v_destino IN
      SELECT v_pedido.vendedor_id WHERE v_pedido.vendedor_id IS NOT NULL
      UNION
      SELECT m.usuario_id FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'pedidos.ver'
       WHERE m.empresa_id = v_pedido.empresa_id
    LOOP
      PERFORM enviar_push(v_destino, 'Reclamo sobre un pedido',
        format('El comprador abrió un reclamo por el pedido #%s. Respondé por el chat.', v_pedido.id),
        jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'chat'));
    END LOOP;
  ELSIF NEW.estado <> 'abierto' AND OLD.estado = 'abierto' THEN
    v_texto := format('Reclamo del pedido #%s resuelto a favor del %s.', v_pedido.id,
                      CASE NEW.estado WHEN 'a_favor_comprador' THEN 'comprador' ELSE 'vendedor' END);
    PERFORM enviar_push(NEW.comprador_id, 'Reclamo resuelto', v_texto,
      jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'compra'));
    FOR v_destino IN
      SELECT v_pedido.vendedor_id WHERE v_pedido.vendedor_id IS NOT NULL
      UNION
      SELECT m.usuario_id FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'pedidos.ver'
       WHERE m.empresa_id = v_pedido.empresa_id
    LOOP
      PERFORM enviar_push(v_destino, 'Reclamo resuelto', v_texto,
        jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'venta'));
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reclamos_notificar ON public.reclamos;
CREATE TRIGGER reclamos_notificar AFTER INSERT OR UPDATE OF estado ON public.reclamos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_reclamo();

-- Liquidación pagada: se avisa al vendedor (o a quien administra la empresa).
CREATE OR REPLACE FUNCTION public.notificar_liquidacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_destino uuid;
BEGIN
  IF NEW.estado = 'pagada' AND OLD.estado IS DISTINCT FROM 'pagada' THEN
    FOR v_destino IN
      SELECT NEW.vendedor_id WHERE NEW.vendedor_id IS NOT NULL
      UNION
      SELECT m.usuario_id FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'empresa.editar'
       WHERE m.empresa_id = NEW.empresa_id
    LOOP
      PERFORM enviar_push(v_destino, 'Te transferimos tu liquidación',
        format('Depositamos $%s de la semana del %s.', round(NEW.neto, 2), to_char(NEW.semana_inicio, 'DD/MM')),
        jsonb_build_object('tipo', 'liquidacion'));
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS liquidaciones_notificar ON public.liquidaciones;
CREATE TRIGGER liquidaciones_notificar AFTER UPDATE OF estado ON public.liquidaciones
  FOR EACH ROW EXECUTE FUNCTION public.notificar_liquidacion();

-- Detalle de un pedido para mostrarlo arriba del chat (comprador, vendedor, su empresa o el admin).
CREATE OR REPLACE FUNCTION public.pedido_detalle(p_pedido bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos;
BEGIN
  IF NOT (public.puede_ver_pedido(p_pedido) OR public.es_admin_plataforma()) THEN
    RAISE EXCEPTION 'No tenés acceso a este pedido.';
  END IF;
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido;
  IF v_pedido.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.pedido_json(v_pedido);
END;
$$;
REVOKE ALL ON FUNCTION public.pedido_detalle(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pedido_detalle(bigint) TO authenticated;

-- Tiempo real: la campanita se actualiza sola (respeta la política de arriba).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
  NULL;
END $$;

NOTIFY pgrst, 'reload schema';
