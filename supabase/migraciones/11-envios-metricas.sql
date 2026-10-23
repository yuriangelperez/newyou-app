-- Gestor de envíos (correo y código de seguimiento) y métricas de ventas.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 10-pedidos.sql).

BEGIN;

-- 1) Datos del envío y fechas clave del pedido.
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS empresa_envio text,
  ADD COLUMN IF NOT EXISTS codigo_seguimiento text,
  ADD COLUMN IF NOT EXISTS enviado_en timestamptz,
  ADD COLUMN IF NOT EXISTS entregado_en timestamptz;

-- Completa las fechas al cambiar de estado (también para los cambios hechos por cambiar_estado_pedido).
CREATE OR REPLACE FUNCTION public.pedidos_fechas_estado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'enviado' THEN
      NEW.enviado_en := coalesce(NEW.enviado_en, now());
    ELSIF NEW.estado = 'entregado' THEN
      NEW.entregado_en := coalesce(NEW.entregado_en, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_fechas_estado ON public.pedidos;
CREATE TRIGGER pedidos_fechas_estado
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_fechas_estado();

-- 2) Marca un pedido como enviado con el correo y el código de seguimiento.
--    Reusa cambiar_estado_pedido para validar la transición y el permiso.
CREATE OR REPLACE FUNCTION public.marcar_pedido_enviado(
  p_pedido bigint,
  p_empresa_envio text,
  p_codigo text DEFAULT NULL
) RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos;
  v_correo text := nullif(btrim(coalesce(p_empresa_envio, '')), '');
  v_codigo text := nullif(btrim(coalesce(p_codigo, '')), '');
BEGIN
  IF v_correo IS NULL THEN
    RAISE EXCEPTION 'Indicá con qué correo o mensajería se envía';
  END IF;

  PERFORM public.cambiar_estado_pedido(
    p_pedido, 'enviado',
    v_correo || CASE WHEN v_codigo IS NOT NULL THEN ' · seguimiento ' || v_codigo ELSE '' END);

  UPDATE pedidos SET empresa_envio = v_correo, codigo_seguimiento = v_codigo, updated_at = now()
   WHERE id = p_pedido
  RETURNING * INTO v_pedido;

  RETURN v_pedido;
END;
$$;

-- 3) pedido_json con los datos del envío.
CREATE OR REPLACE FUNCTION public.pedido_json(p public.pedidos)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'compra_id', p.compra_id,
    'numero_orden', c.numero_orden,
    'created_at', p.created_at,
    'estado', p.estado,
    'entrega', p.entrega,
    'metodo_pago', c.metodo_pago,
    'direccion_entrega', p.direccion_entrega,
    'subtotal', p.subtotal,
    'envio', p.envio,
    'total', p.total,
    'empresa_id', p.empresa_id,
    'sede_id', p.sede_id,
    'empresa_envio', p.empresa_envio,
    'codigo_seguimiento', p.codigo_seguimiento,
    'vendedor', coalesce(e.nombre_fantasia || ' (' || s.nombre || ')', pv.username),
    'comprador', pc.username,
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'productoId', i.producto_id, 'nombre', i.nombre, 'precio', i.precio_unitario,
               'cantidad', i.cantidad, 'talle', i.talle, 'color', i.color, 'imagen', i.imagen_url) ORDER BY i.id)
        FROM pedido_items i WHERE i.pedido_id = p.id), '[]'),
    'eventos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'estado', ev.estado_nuevo, 'nota', ev.nota, 'fecha', ev.created_at,
               'actor', pa.username) ORDER BY ev.created_at, ev.id)
        FROM pedido_eventos ev LEFT JOIN profiles pa ON pa.id = ev.actor_id
       WHERE ev.pedido_id = p.id), '[]'))
    FROM compras c
    LEFT JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN sedes s ON s.id = p.sede_id
    LEFT JOIN profiles pv ON pv.id = p.vendedor_id
    LEFT JOIN profiles pc ON pc.id = p.comprador_id
   WHERE c.compraid = p.compra_id;
$$;
REVOKE ALL ON FUNCTION public.pedido_json(public.pedidos) FROM PUBLIC;

-- 4) Métricas de ventas del particular (p_empresa nulo) o de una empresa (exige metricas.ver;
--    un miembro limitado a ciertas sedes sólo ve esas sedes). No cuenta pedidos cancelados.
CREATE OR REPLACE FUNCTION public.metricas_ventas(p_empresa bigint DEFAULT NULL, p_dias integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_desde date := current_date - (greatest(coalesce(p_dias, 30), 1) - 1);
  v_resultado jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  IF p_empresa IS NOT NULL AND NOT public.tiene_permiso(p_empresa, 'metricas.ver') THEN
    RAISE EXCEPTION 'Tu rol no puede ver las métricas de la empresa';
  END IF;

  WITH pedidos_periodo AS (
    SELECT p.*
      FROM pedidos p
     WHERE p.created_at >= v_desde
       AND p.estado <> 'cancelado'
       AND ((p_empresa IS NULL AND p.vendedor_id = v_uid)
            OR (p_empresa IS NOT NULL AND p.empresa_id = p_empresa
                AND public.tiene_permiso(p_empresa, 'metricas.ver', p.sede_id)))
  ),
  items_periodo AS (
    SELECT i.*, pp.sede_id FROM pedido_items i JOIN pedidos_periodo pp ON pp.id = i.pedido_id
  ),
  dias AS (
    SELECT d::date AS dia FROM generate_series(v_desde, current_date, interval '1 day') d
  )
  SELECT jsonb_build_object(
    'desde', v_desde,
    'pedidos', (SELECT count(*) FROM pedidos_periodo),
    'ingresos', (SELECT coalesce(sum(subtotal), 0) FROM pedidos_periodo),
    'unidades', (SELECT coalesce(sum(cantidad), 0) FROM items_periodo),
    'entregados', (SELECT count(*) FROM pedidos_periodo WHERE estado = 'entregado'),
    'en_curso', (SELECT count(*) FROM pedidos_periodo WHERE estado NOT IN ('entregado')),
    'cancelados', (
      SELECT count(*) FROM pedidos p
       WHERE p.created_at >= v_desde AND p.estado = 'cancelado'
         AND ((p_empresa IS NULL AND p.vendedor_id = v_uid)
              OR (p_empresa IS NOT NULL AND p.empresa_id = p_empresa
                  AND public.tiene_permiso(p_empresa, 'metricas.ver', p.sede_id)))),
    'por_dia', (
      SELECT jsonb_agg(jsonb_build_object('dia', d.dia, 'ingresos', coalesce(x.ingresos, 0), 'pedidos', coalesce(x.pedidos, 0)) ORDER BY d.dia)
        FROM dias d
        LEFT JOIN (SELECT created_at::date AS dia, sum(subtotal) AS ingresos, count(*) AS pedidos
                     FROM pedidos_periodo GROUP BY 1) x ON x.dia = d.dia),
    'top_productos', coalesce((
      SELECT jsonb_agg(t ORDER BY t.unidades DESC, t.ingresos DESC)
        FROM (SELECT i.nombre, sum(i.cantidad) AS unidades, sum(i.cantidad * i.precio_unitario) AS ingresos
                FROM items_periodo i GROUP BY i.nombre ORDER BY 2 DESC, 3 DESC LIMIT 5) t), '[]'),
    'por_sede', coalesce((
      SELECT jsonb_agg(t ORDER BY t.ingresos DESC)
        FROM (SELECT s.nombre AS sede, count(*) AS pedidos, sum(pp.subtotal) AS ingresos
                FROM pedidos_periodo pp JOIN sedes s ON s.id = pp.sede_id GROUP BY s.nombre) t), '[]'),
    'stock_bajo', coalesce((
      SELECT jsonb_agg(t ORDER BY t.stock, t.nombre)
        FROM (SELECT pr.productoid AS id, pr.nombre, pr.stock
                FROM productos pr
               WHERE pr.stock <= 2
                 AND ((p_empresa IS NULL AND pr.creado_por = v_uid AND pr.empresa_id IS NULL)
                      OR (p_empresa IS NOT NULL AND pr.empresa_id = p_empresa))
               ORDER BY pr.stock, pr.nombre LIMIT 10) t), '[]')
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_pedido_enviado(bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.metricas_ventas(bigint, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_pedido_enviado(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.metricas_ventas(bigint, integer) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
