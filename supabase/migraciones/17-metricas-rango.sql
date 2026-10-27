-- Métricas por rango de fechas: Hoy, Esta semana, Este mes y un rango personalizado.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 16-etapa1-mejoras.sql).
-- Las fechas se cuentan en la hora de Argentina, así "Hoy" no se corta a las 21 h (UTC).

BEGIN;

CREATE OR REPLACE FUNCTION public.metricas_ventas_rango(
  p_empresa bigint DEFAULT NULL,
  p_desde date DEFAULT NULL,
  p_hasta date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hoy date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_hasta date := least(coalesce(p_hasta, v_hoy), v_hoy);
  v_desde date := coalesce(p_desde, v_hasta - 29);
  v_resultado jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  IF v_desde > v_hasta THEN
    RAISE EXCEPTION 'La fecha "desde" no puede ser posterior a "hasta"';
  END IF;

  IF v_hasta - v_desde > 365 THEN
    RAISE EXCEPTION 'El rango puede ser de hasta un año';
  END IF;

  IF p_empresa IS NOT NULL AND NOT public.tiene_permiso(p_empresa, 'metricas.ver') THEN
    RAISE EXCEPTION 'Tu rol no puede ver las métricas de la empresa';
  END IF;

  WITH pedidos_vendedor AS (
    SELECT p.*, (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS dia
      FROM pedidos p
     WHERE (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date BETWEEN v_desde AND v_hasta
       AND ((p_empresa IS NULL AND p.vendedor_id = v_uid)
            OR (p_empresa IS NOT NULL AND p.empresa_id = p_empresa
                AND public.tiene_permiso(p_empresa, 'metricas.ver', p.sede_id)))
  ),
  pedidos_periodo AS (
    SELECT * FROM pedidos_vendedor WHERE estado <> 'cancelado'
  ),
  items_periodo AS (
    SELECT i.*, pp.sede_id FROM pedido_items i JOIN pedidos_periodo pp ON pp.id = i.pedido_id
  ),
  dias AS (
    SELECT d::date AS dia FROM generate_series(v_desde, v_hasta, interval '1 day') d
  )
  SELECT jsonb_build_object(
    'desde', v_desde,
    'hasta', v_hasta,
    'pedidos', (SELECT count(*) FROM pedidos_periodo),
    'ingresos', (SELECT coalesce(sum(subtotal), 0) FROM pedidos_periodo),
    'unidades', (SELECT coalesce(sum(cantidad), 0) FROM items_periodo),
    'entregados', (SELECT count(*) FROM pedidos_periodo WHERE estado = 'entregado'),
    'en_curso', (SELECT count(*) FROM pedidos_periodo WHERE estado NOT IN ('entregado')),
    'cancelados', (SELECT count(*) FROM pedidos_vendedor WHERE estado = 'cancelado'),
    'por_dia', (
      SELECT jsonb_agg(jsonb_build_object('dia', d.dia, 'ingresos', coalesce(x.ingresos, 0), 'pedidos', coalesce(x.pedidos, 0)) ORDER BY d.dia)
        FROM dias d
        LEFT JOIN (SELECT dia, sum(subtotal) AS ingresos, count(*) AS pedidos
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

REVOKE ALL ON FUNCTION public.metricas_ventas_rango(bigint, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.metricas_ventas_rango(bigint, date, date) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
