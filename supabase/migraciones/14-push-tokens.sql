-- Notificaciones push de pedidos (Clase 10, con EAS Build).
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 13-descuentos.sql).
-- Antes: Database → Extensions → habilitar "pg_net" (la usa el trigger para llamar a Expo).
--
-- 1) push_tokens: un token de Expo por dispositivo, del usuario que lo registró en Ajustes.
-- 2) registrar_push_token: alta del token (si el celular lo usaba otra cuenta, pasa a la actual).
-- 3) Trigger en pedido_eventos: pedido nuevo → push al particular que vende;
--    cambio de estado → push al comprador (salvo que lo haya hecho él mismo).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.push_tokens (
  token text PRIMARY KEY,
  usuario_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plataforma text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_usuario ON public.push_tokens (usuario_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_propios ON public.push_tokens;
CREATE POLICY push_tokens_propios ON public.push_tokens FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.registrar_push_token(p_token text, p_plataforma text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  INSERT INTO push_tokens (token, usuario_id, plataforma)
  VALUES (p_token, auth.uid(), p_plataforma)
  ON CONFLICT (token) DO UPDATE
    SET usuario_id = excluded.usuario_id, plataforma = excluded.plataforma, created_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_push_token(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registrar_push_token(text, text) TO authenticated;

-- Envía un push a todos los dispositivos de un usuario con la API de Expo.
CREATE OR REPLACE FUNCTION public.enviar_push(p_usuario uuid, p_titulo text, p_cuerpo text, p_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mensajes jsonb;
BEGIN
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

CREATE OR REPLACE FUNCTION public.notificar_evento_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = NEW.pedido_id;

  IF NEW.estado_anterior IS NULL THEN
    -- Pedido nuevo (no los migrados de compras viejas, que no tienen actor).
    IF v_pedido.vendedor_id IS NOT NULL AND NEW.actor_id IS NOT NULL THEN
      PERFORM enviar_push(v_pedido.vendedor_id, 'Nueva venta',
        format('Tenés un pedido nuevo (#%s) por $%s.', v_pedido.id, v_pedido.total),
        jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'venta'));
    END IF;
  ELSIF NEW.actor_id IS DISTINCT FROM v_pedido.comprador_id THEN
    PERFORM enviar_push(v_pedido.comprador_id, 'Tu pedido cambió de estado',
      format('El pedido #%s ahora está: %s.', v_pedido.id, replace(NEW.estado_nuevo, '_', ' ')),
      jsonb_build_object('pedidoId', v_pedido.id, 'tipo', 'compra'));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Un push que falla nunca debe frenar la compra ni el cambio de estado.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_eventos_push ON public.pedido_eventos;
CREATE TRIGGER pedido_eventos_push AFTER INSERT ON public.pedido_eventos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_evento_pedido();

COMMIT;
