-- Pedidos por vendedor con estados e historial.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 09-imagenes.sql) y publicar
-- junto con la versión de la app que usa pedidos.
--
-- Una compra (la orden del checkout) se divide en un pedido por vendedor: cada particular
-- o cada sede de empresa recibe el suyo, con su estado, su envío y su historial.

BEGIN;

-- 1) Tablas.
CREATE TABLE IF NOT EXISTS public.pedidos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  compra_id bigint NOT NULL REFERENCES public.compras(compraid) ON DELETE CASCADE,
  comprador_id uuid NOT NULL REFERENCES auth.users(id),
  -- Particular que vende (nulo si vende una empresa).
  vendedor_id uuid REFERENCES auth.users(id),
  empresa_id bigint REFERENCES public.empresas(id),
  sede_id bigint REFERENCES public.sedes(id),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN
    ('pendiente', 'confirmado', 'preparando', 'listo_para_retirar', 'enviado', 'entregado', 'cancelado')),
  entrega text NOT NULL CHECK (entrega IN ('domicilio', 'local')),
  direccion_entrega text,
  subtotal numeric NOT NULL DEFAULT 0,
  envio numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((empresa_id IS NULL AND vendedor_id IS NOT NULL) OR (empresa_id IS NOT NULL AND sede_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS pedidos_comprador ON public.pedidos (comprador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_vendedor ON public.pedidos (vendedor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_empresa ON public.pedidos (empresa_id, sede_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pedidos_compra ON public.pedidos (compra_id);

-- Copia de nombre y precio al momento de la compra (la prenda puede cambiar o borrarse después).
CREATE TABLE IF NOT EXISTS public.pedido_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id bigint REFERENCES public.productos(productoid) ON DELETE SET NULL,
  nombre text NOT NULL,
  precio_unitario numeric NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  talle text,
  color text,
  imagen_url text
);
CREATE INDEX IF NOT EXISTS pedido_items_pedido ON public.pedido_items (pedido_id);

CREATE TABLE IF NOT EXISTS public.pedido_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_nuevo text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  nota text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pedido_eventos_pedido ON public.pedido_eventos (pedido_id, created_at);

-- 2) Quién ve un pedido: el comprador, el particular que vende, o un miembro con pedidos.ver en esa sede.
CREATE OR REPLACE FUNCTION public.puede_ver_pedido(p_pedido bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pedidos p
     WHERE p.id = p_pedido
       AND (p.comprador_id = auth.uid()
            OR p.vendedor_id = auth.uid()
            OR (p.empresa_id IS NOT NULL AND public.tiene_permiso(p.empresa_id, 'pedidos.ver', p.sede_id)))
  );
$$;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_eventos ENABLE ROW LEVEL SECURITY;

-- Sólo lectura desde la app: altas por confirmar_compra y cambios por cambiar_estado_pedido.
DROP POLICY IF EXISTS pedidos_lectura ON public.pedidos;
CREATE POLICY pedidos_lectura ON public.pedidos FOR SELECT TO authenticated USING (public.puede_ver_pedido(id));
DROP POLICY IF EXISTS pedido_items_lectura ON public.pedido_items;
CREATE POLICY pedido_items_lectura ON public.pedido_items FOR SELECT TO authenticated USING (public.puede_ver_pedido(pedido_id));
DROP POLICY IF EXISTS pedido_eventos_lectura ON public.pedido_eventos;
CREATE POLICY pedido_eventos_lectura ON public.pedido_eventos FOR SELECT TO authenticated USING (public.puede_ver_pedido(pedido_id));

-- 3) Transiciones válidas. Retiro: preparando -> listo_para_retirar; envío: preparando -> enviado.
CREATE OR REPLACE FUNCTION public.transicion_valida(p_entrega text, p_desde text, p_hacia text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_desde
    WHEN 'pendiente' THEN p_hacia IN ('confirmado', 'cancelado')
    WHEN 'confirmado' THEN p_hacia IN ('preparando', 'cancelado')
    WHEN 'preparando' THEN p_hacia = 'cancelado'
      OR (p_entrega = 'local' AND p_hacia = 'listo_para_retirar')
      OR (p_entrega = 'domicilio' AND p_hacia = 'enviado')
    WHEN 'listo_para_retirar' THEN p_hacia = 'entregado'
    WHEN 'enviado' THEN p_hacia = 'entregado'
    ELSE false
  END;
$$;

-- 4) Dirección de retiro y condiciones de entrega de cada prenda del carrito (reemplaza la de 08):
--    suma la sede y su costo de envío para que el checkout muestre el total estimado.
DROP FUNCTION IF EXISTS public.direcciones_retiro(bigint[]);
CREATE OR REPLACE FUNCTION public.direcciones_retiro(p_producto_ids bigint[])
RETURNS TABLE (
  productoid bigint,
  vendedor text,
  direccion text,
  sede_id bigint,
  hace_retiro boolean,
  hace_envio boolean,
  costo_envio numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.productoid,
         coalesce(e.nombre_fantasia || ' (' || s.nombre || ')', p.username),
         NULLIF(btrim(coalesce(
           s.direccion,
           pr.direccion_retiro,
           (SELECT d.direccion FROM public.direcciones d
             WHERE d.usuario_id = pr.creado_por AND d.es_principal LIMIT 1)
         )), ''),
         s.id,
         coalesce(s.hace_retiro, true),
         coalesce(s.hace_envio, true),
         coalesce(CASE WHEN s.hace_envio THEN s.costo_envio END, 0)
    FROM public.productos pr
    JOIN public.profiles p ON p.id = pr.creado_por
    LEFT JOIN public.empresas e ON e.id = pr.empresa_id
    LEFT JOIN public.sedes s ON s.id = pr.sede_id
   WHERE pr.productoid = ANY (p_producto_ids);
$$;
GRANT EXECUTE ON FUNCTION public.direcciones_retiro(bigint[]) TO authenticated;

-- 5) confirmar_compra: descuenta stock (igual que 08), crea la compra y un pedido por vendedor o sede.
--    El envío lo calcula el servidor: el costo de cada sede de empresa (los particulares, $0).
--    p_envio se mantiene en la firma por compatibilidad y se ignora.
CREATE OR REPLACE FUNCTION public.confirmar_compra(
  p_operation_key text,
  p_entrega text,
  p_metodo_pago text,
  p_envio numeric,
  p_items jsonb,
  p_direccion_entrega text DEFAULT NULL
) RETURNS public.compras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_compra public.compras;
  v_item jsonb;
  v_producto public.productos;
  v_cantidad int;
  v_sede bigint;
  v_lineas jsonb := '[]'::jsonb;
  v_grupo record;
  v_sede_row public.sedes;
  v_envio numeric;
  v_subtotal numeric := 0;
  v_envio_total numeric := 0;
  v_pedido bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  SELECT * INTO v_compra FROM compras
   WHERE operation_key = p_operation_key AND usuario_id = v_uid;
  IF FOUND THEN
    RETURN v_compra;
  END IF;

  IF p_entrega NOT IN ('domicilio', 'local') THEN
    RAISE EXCEPTION 'Forma de entrega inválida';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cantidad := (v_item->>'cantidad')::int;
    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para "%"', v_item->>'nombre';
    END IF;

    SELECT * INTO v_producto FROM productos
     WHERE productoid = (v_item->>'productoId')::bigint
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La prenda "%" ya no existe', v_item->>'nombre';
    END IF;

    v_sede := NULL;
    IF v_producto.empresa_id IS NULL THEN
      UPDATE productos SET stock = stock - v_cantidad, updated_at = now()
       WHERE productoid = v_producto.productoid AND stock >= v_cantidad;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para "%"', v_producto.nombre;
      END IF;
    ELSE
      SELECT ss.sede_id INTO v_sede
        FROM stock_sede ss
        JOIN sedes s ON s.id = ss.sede_id AND s.activa
             AND (CASE WHEN p_entrega = 'domicilio' THEN s.hace_envio ELSE s.hace_retiro END)
       WHERE ss.producto_id = v_producto.productoid
         AND ss.cantidad >= v_cantidad
       ORDER BY (ss.sede_id = v_producto.sede_id) DESC, ss.cantidad DESC
       LIMIT 1
       FOR UPDATE OF ss;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay stock de "%" en una sede que haga %', v_producto.nombre,
          CASE WHEN p_entrega = 'domicilio' THEN 'envíos a domicilio' ELSE 'retiro en el local' END;
      END IF;

      UPDATE stock_sede SET cantidad = cantidad - v_cantidad
       WHERE producto_id = v_producto.productoid AND sede_id = v_sede;
    END IF;

    v_lineas := v_lineas || jsonb_build_object(
      'empresa_id', v_producto.empresa_id,
      'sede_id', v_sede,
      'vendedor_id', CASE WHEN v_producto.empresa_id IS NULL THEN v_producto.creado_por END,
      'producto_id', v_producto.productoid,
      'nombre', v_producto.nombre,
      'precio', v_producto.precio,
      'cantidad', v_cantidad,
      'talle', v_item->>'talle',
      'color', v_item->>'color',
      'imagen_url', nullif(v_producto.imagen_url, ''));
    v_subtotal := v_subtotal + v_producto.precio * v_cantidad;
  END LOOP;

  INSERT INTO compras
    (usuario_id, numero_orden, entrega, metodo_pago, subtotal_original,
     descuentos, envio, impuestos, total, items, operation_key, direccion_entrega)
  VALUES
    (v_uid, nextval('public.compras_numero_orden_seq'), p_entrega, p_metodo_pago,
     v_subtotal, 0, 0, 0, v_subtotal, p_items, p_operation_key, p_direccion_entrega)
  RETURNING * INTO v_compra;

  FOR v_grupo IN
    SELECT (l->>'empresa_id')::bigint AS empresa_id,
           (l->>'sede_id')::bigint AS sede_id,
           (l->>'vendedor_id')::uuid AS vendedor_id,
           sum((l->>'precio')::numeric * (l->>'cantidad')::int) AS subtotal
      FROM jsonb_array_elements(v_lineas) AS l
     GROUP BY 1, 2, 3
  LOOP
    v_envio := 0;
    IF v_grupo.sede_id IS NOT NULL AND p_entrega = 'domicilio' THEN
      SELECT * INTO v_sede_row FROM sedes WHERE id = v_grupo.sede_id;
      v_envio := v_sede_row.costo_envio;
    END IF;
    v_envio_total := v_envio_total + v_envio;

    INSERT INTO pedidos (compra_id, comprador_id, vendedor_id, empresa_id, sede_id, entrega,
                         direccion_entrega, subtotal, envio, total)
    VALUES (v_compra.compraid, v_uid, v_grupo.vendedor_id, v_grupo.empresa_id, v_grupo.sede_id, p_entrega,
            CASE WHEN p_entrega = 'domicilio' THEN p_direccion_entrega
                 ELSE (SELECT direccion FROM sedes WHERE id = v_grupo.sede_id) END,
            v_grupo.subtotal, v_envio, v_grupo.subtotal + v_envio)
    RETURNING id INTO v_pedido;

    INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad, talle, color, imagen_url)
    SELECT v_pedido, (l->>'producto_id')::bigint, l->>'nombre', (l->>'precio')::numeric,
           (l->>'cantidad')::int, l->>'talle', l->>'color', l->>'imagen_url'
      FROM jsonb_array_elements(v_lineas) AS l
     WHERE (l->>'empresa_id')::bigint IS NOT DISTINCT FROM v_grupo.empresa_id
       AND (l->>'sede_id')::bigint IS NOT DISTINCT FROM v_grupo.sede_id
       AND (l->>'vendedor_id')::uuid IS NOT DISTINCT FROM v_grupo.vendedor_id;

    INSERT INTO pedido_eventos (pedido_id, estado_anterior, estado_nuevo, actor_id)
    VALUES (v_pedido, NULL, 'pendiente', v_uid);
  END LOOP;

  UPDATE compras SET envio = v_envio_total, total = v_subtotal + v_envio_total
   WHERE compraid = v_compra.compraid
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, text, numeric, jsonb, text) TO authenticated;

-- 6) Cambio de estado. El comprador sólo puede cancelar mientras está pendiente.
--    Al cancelar se devuelve el stock a donde salió (la sede o la publicación del particular).
CREATE OR REPLACE FUNCTION public.cambiar_estado_pedido(p_pedido bigint, p_estado text, p_nota text DEFAULT NULL)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pedido public.pedidos;
  v_anterior text;
  v_permitido boolean;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;

  IF NOT public.transicion_valida(v_pedido.entrega, v_pedido.estado, p_estado) THEN
    RAISE EXCEPTION 'No se puede pasar de "%" a "%"', v_pedido.estado, p_estado;
  END IF;

  v_permitido :=
    v_pedido.vendedor_id = v_uid
    OR (v_pedido.empresa_id IS NOT NULL AND (
          public.tiene_permiso(v_pedido.empresa_id, 'pedidos.estado', v_pedido.sede_id)
          OR (p_estado IN ('enviado', 'entregado') AND v_pedido.entrega = 'domicilio'
              AND public.tiene_permiso(v_pedido.empresa_id, 'envios.gestionar', v_pedido.sede_id))))
    OR (v_pedido.comprador_id = v_uid AND v_pedido.estado = 'pendiente' AND p_estado = 'cancelado');

  IF NOT coalesce(v_permitido, false) THEN
    RAISE EXCEPTION 'No tenés permiso para cambiar este pedido';
  END IF;

  IF p_estado = 'cancelado' THEN
    IF v_pedido.empresa_id IS NULL THEN
      UPDATE productos pr
         SET stock = pr.stock + i.cantidad, updated_at = now()
        FROM pedido_items i
       WHERE i.pedido_id = v_pedido.id AND pr.productoid = i.producto_id;
    ELSE
      INSERT INTO stock_sede (producto_id, sede_id, cantidad)
      SELECT i.producto_id, v_pedido.sede_id, sum(i.cantidad)
        FROM pedido_items i
        JOIN productos pr ON pr.productoid = i.producto_id
       WHERE i.pedido_id = v_pedido.id
       GROUP BY i.producto_id
      ON CONFLICT (producto_id, sede_id) DO UPDATE SET cantidad = stock_sede.cantidad + EXCLUDED.cantidad;
    END IF;
  END IF;

  v_anterior := v_pedido.estado;

  UPDATE pedidos SET estado = p_estado, updated_at = now() WHERE id = v_pedido.id
  RETURNING * INTO v_pedido;

  INSERT INTO pedido_eventos (pedido_id, estado_anterior, estado_nuevo, actor_id, nota)
  VALUES (v_pedido.id, v_anterior, p_estado, v_uid, nullif(btrim(coalesce(p_nota, '')), ''));

  RETURN v_pedido;
END;
$$;

-- 7) Listados con nombres (profiles no es legible entre usuarios), ítems e historial.
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

CREATE OR REPLACE FUNCTION public.mis_compras_pedidos()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pedido_json(p) FROM pedidos p
   WHERE p.comprador_id = auth.uid()
   ORDER BY p.created_at DESC, p.id;
$$;

-- Ventas del particular (p_empresa nulo) o de una empresa, sólo de las sedes que el miembro puede ver.
CREATE OR REPLACE FUNCTION public.pedidos_venta(p_empresa bigint DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.pedido_json(p) FROM pedidos p
   WHERE (p_empresa IS NULL AND p.vendedor_id = auth.uid())
      OR (p_empresa IS NOT NULL AND p.empresa_id = p_empresa
          AND public.tiene_permiso(p_empresa, 'pedidos.ver', p.sede_id))
   ORDER BY p.created_at DESC, p.id;
$$;

-- mis_ventas() queda reemplazada por pedidos_venta().
DROP FUNCTION IF EXISTS public.mis_ventas();

REVOKE ALL ON FUNCTION public.cambiar_estado_pedido(bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mis_compras_pedidos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedidos_venta(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mis_compras_pedidos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedidos_venta(bigint) TO authenticated;

-- 8) Compras anteriores: un pedido por vendedor o sede, "entregado" si tiene más de 14 días
--    y "confirmado" si no. Los ítems de prendas ya borradas no se pueden atribuir y se omiten.
DO $$
DECLARE
  v_compra record;
  v_grupo record;
  v_pedido bigint;
  v_estado text;
BEGIN
  FOR v_compra IN
    SELECT c.* FROM compras c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.compra_id = c.compraid)
  LOOP
    v_estado := CASE WHEN v_compra.created_at < now() - interval '14 days' THEN 'entregado' ELSE 'confirmado' END;

    FOR v_grupo IN
      SELECT pr.empresa_id,
             CASE WHEN pr.empresa_id IS NOT NULL THEN pr.sede_id END AS sede_id,
             CASE WHEN pr.empresa_id IS NULL THEN pr.creado_por END AS vendedor_id,
             jsonb_agg(i.item || jsonb_build_object('_img', pr.imagen_url, '_precio', pr.precio)) AS items,
             sum(coalesce((i.item->>'precio')::numeric, pr.precio) * (i.item->>'cantidad')::int) AS subtotal
        FROM jsonb_array_elements(v_compra.items) AS i(item)
        JOIN productos pr ON pr.productoid = (i.item->>'productoId')::bigint
       GROUP BY 1, 2, 3
    LOOP
      INSERT INTO pedidos (compra_id, comprador_id, vendedor_id, empresa_id, sede_id, estado, entrega,
                           direccion_entrega, subtotal, envio, total, created_at, updated_at)
      VALUES (v_compra.compraid, v_compra.usuario_id, v_grupo.vendedor_id, v_grupo.empresa_id, v_grupo.sede_id,
              v_estado, v_compra.entrega, v_compra.direccion_entrega, v_grupo.subtotal, 0, v_grupo.subtotal,
              v_compra.created_at, v_compra.created_at)
      RETURNING id INTO v_pedido;

      INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad, talle, color, imagen_url)
      SELECT v_pedido, (it->>'productoId')::bigint, coalesce(it->>'nombre', 'Prenda'),
             coalesce((it->>'precio')::numeric, (it->>'_precio')::numeric), (it->>'cantidad')::int, it->>'talle', it->>'color',
             nullif(it->>'_img', '')
        FROM jsonb_array_elements(v_grupo.items) AS it;

      INSERT INTO pedido_eventos (pedido_id, estado_anterior, estado_nuevo, nota, created_at)
      VALUES (v_pedido, NULL, v_estado, 'Pedido migrado de una compra anterior', v_compra.created_at);
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
