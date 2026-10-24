-- Calificaciones: el comprador califica cada pedido entregado (una vez) y el vendedor puede responder.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 11-envios-metricas.sql).

BEGIN;

CREATE TABLE IF NOT EXISTS public.calificaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL UNIQUE REFERENCES public.pedidos(id) ON DELETE CASCADE,
  comprador_id uuid NOT NULL REFERENCES auth.users(id),
  vendedor_id uuid REFERENCES auth.users(id),
  empresa_id bigint REFERENCES public.empresas(id),
  puntaje smallint NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario text CHECK (char_length(comentario) <= 500),
  respuesta text CHECK (char_length(respuesta) <= 500),
  respondida_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calificaciones_empresa ON public.calificaciones (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calificaciones_vendedor ON public.calificaciones (vendedor_id, created_at DESC);

-- Las opiniones son públicas (se ven en la tienda y en la prenda); se escriben sólo con las funciones.
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calificaciones_lectura ON public.calificaciones;
CREATE POLICY calificaciones_lectura ON public.calificaciones FOR SELECT TO anon, authenticated USING (true);

-- Califica un pedido propio ya entregado.
CREATE OR REPLACE FUNCTION public.calificar_pedido(p_pedido bigint, p_puntaje integer, p_comentario text DEFAULT NULL)
RETURNS public.calificaciones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos;
  v_calificacion public.calificaciones;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido;
  IF NOT FOUND OR v_pedido.comprador_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sólo podés calificar tus propios pedidos';
  END IF;

  IF v_pedido.estado <> 'entregado' THEN
    RAISE EXCEPTION 'Vas a poder calificar cuando el pedido esté entregado';
  END IF;

  IF p_puntaje NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'El puntaje va de 1 a 5';
  END IF;

  IF EXISTS (SELECT 1 FROM calificaciones WHERE pedido_id = p_pedido) THEN
    RAISE EXCEPTION 'Ya calificaste este pedido';
  END IF;

  INSERT INTO calificaciones (pedido_id, comprador_id, vendedor_id, empresa_id, puntaje, comentario)
  VALUES (p_pedido, v_pedido.comprador_id, v_pedido.vendedor_id, v_pedido.empresa_id, p_puntaje,
          nullif(btrim(coalesce(p_comentario, '')), ''))
  RETURNING * INTO v_calificacion;

  RETURN v_calificacion;
END;
$$;

-- Responde una opinión: el particular que vendió o un miembro con pedidos.estado en esa sede.
CREATE OR REPLACE FUNCTION public.responder_calificacion(p_calificacion bigint, p_respuesta text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calificacion public.calificaciones;
  v_sede bigint;
BEGIN
  SELECT * INTO v_calificacion FROM calificaciones WHERE id = p_calificacion FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La opinión no existe';
  END IF;

  SELECT sede_id INTO v_sede FROM pedidos WHERE id = v_calificacion.pedido_id;

  -- coalesce: con vendedor_id nulo (pedido de empresa) la comparación da NULL y el IF no saltaría.
  IF NOT coalesce(v_calificacion.vendedor_id = auth.uid()
          OR (v_calificacion.empresa_id IS NOT NULL
              AND public.tiene_permiso(v_calificacion.empresa_id, 'pedidos.estado', v_sede)), false) THEN
    RAISE EXCEPTION 'No podés responder esta opinión';
  END IF;

  IF btrim(coalesce(p_respuesta, '')) = '' THEN
    RAISE EXCEPTION 'Escribí la respuesta';
  END IF;

  UPDATE calificaciones SET respuesta = btrim(p_respuesta), respondida_en = now() WHERE id = p_calificacion;
END;
$$;

-- Reputación de una empresa o de un particular, con las últimas opiniones.
CREATE OR REPLACE FUNCTION public.reputacion(p_empresa bigint DEFAULT NULL, p_vendedor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT * FROM calificaciones
     WHERE (p_empresa IS NOT NULL AND empresa_id = p_empresa)
        OR (p_empresa IS NULL AND p_vendedor IS NOT NULL AND vendedor_id = p_vendedor)
  )
  SELECT jsonb_build_object(
    'promedio', (SELECT round(avg(puntaje)::numeric, 1) FROM c),
    'cantidad', (SELECT count(*) FROM c),
    'ultimas', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'puntaje', x.puntaje, 'comentario', x.comentario, 'respuesta', x.respuesta,
               'fecha', x.created_at, 'autor', p.username) ORDER BY x.created_at DESC)
        FROM (SELECT * FROM c ORDER BY created_at DESC LIMIT 5) x
        LEFT JOIN profiles p ON p.id = x.comprador_id), '[]'));
$$;

-- Promedio de una prenda: las opiniones de los pedidos que la incluyeron.
CREATE OR REPLACE FUNCTION public.reputacion_producto(p_producto bigint)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'promedio', round(avg(c.puntaje)::numeric, 1),
    'cantidad', count(*))
    FROM calificaciones c
   WHERE EXISTS (SELECT 1 FROM pedido_items i WHERE i.pedido_id = c.pedido_id AND i.producto_id = p_producto);
$$;

-- pedido_json con la calificación (el comprador ve si ya calificó; el vendedor, la opinión).
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
    'calificacion', (
      SELECT jsonb_build_object('id', ca.id, 'puntaje', ca.puntaje, 'comentario', ca.comentario,
                                'respuesta', ca.respuesta)
        FROM calificaciones ca WHERE ca.pedido_id = p.id),
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

REVOKE ALL ON FUNCTION public.calificar_pedido(bigint, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.responder_calificacion(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calificar_pedido(bigint, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.responder_calificacion(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reputacion(bigint, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reputacion_producto(bigint) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
