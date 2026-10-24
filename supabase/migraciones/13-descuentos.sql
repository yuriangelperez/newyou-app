-- Descuentos por prenda (rescatados del commit 6dfd36d de main).
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 12-calificaciones.sql).
-- 1) Columna descuento_porcentaje (si ya existe, sólo se asegura el valor por defecto y el rango).
-- 2) confirmar_compra cobra el precio con descuento y registra el descuento en la compra.

BEGIN;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS descuento_porcentaje numeric NOT NULL DEFAULT 0;

UPDATE public.productos SET descuento_porcentaje = 0 WHERE descuento_porcentaje IS NULL;
ALTER TABLE public.productos ALTER COLUMN descuento_porcentaje SET DEFAULT 0;
ALTER TABLE public.productos ALTER COLUMN descuento_porcentaje SET NOT NULL;

ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_descuento_rango;
ALTER TABLE public.productos
  ADD CONSTRAINT productos_descuento_rango CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100);

-- Igual que en 10-pedidos.sql, salvo el precio: se aplica el descuento de cada prenda.
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
  v_precio numeric;
  v_subtotal_original numeric := 0;
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

    -- Precio con descuento, redondeado igual que calcularPrecioFinal() en la app.
    v_precio := round(v_producto.precio * (1 - coalesce(v_producto.descuento_porcentaje, 0) / 100.0));

    v_lineas := v_lineas || jsonb_build_object(
      'empresa_id', v_producto.empresa_id,
      'sede_id', v_sede,
      'vendedor_id', CASE WHEN v_producto.empresa_id IS NULL THEN v_producto.creado_por END,
      'producto_id', v_producto.productoid,
      'nombre', v_producto.nombre,
      'precio', v_precio,
      'cantidad', v_cantidad,
      'talle', v_item->>'talle',
      'color', v_item->>'color',
      'imagen_url', nullif(v_producto.imagen_url, ''));
    v_subtotal_original := v_subtotal_original + v_producto.precio * v_cantidad;
    v_subtotal := v_subtotal + v_precio * v_cantidad;
  END LOOP;

  INSERT INTO compras
    (usuario_id, numero_orden, entrega, metodo_pago, subtotal_original,
     descuentos, envio, impuestos, total, items, operation_key, direccion_entrega)
  VALUES
    (v_uid, nextval('public.compras_numero_orden_seq'), p_entrega, p_metodo_pago,
     v_subtotal_original, v_subtotal_original - v_subtotal, 0, 0, v_subtotal, p_items, p_operation_key, p_direccion_entrega)
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

COMMIT;
