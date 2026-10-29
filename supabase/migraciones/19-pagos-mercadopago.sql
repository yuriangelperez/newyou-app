-- Pagos en el checkout: "Tarjeta de crédito" y "Tarjeta de débito" con la API de tarjetas
-- propia (simulada, Edge Function pago-tarjeta) y "Mercado Pago" con el Checkout Pro
-- (pago-mercadopago). Se quita "Transferencia".
-- Ejecutar en el SQL Editor de Supabase, después de 18-condicion-productos.sql.
-- Se puede volver a correr entera si ya corriste una versión anterior de este archivo.
--
-- 1) compras.estado_pago: 'no_aplica' (efectivo/transferencia), 'pendiente', 'aprobado',
--    'rechazado' o 'cancelado'. Lo fija un trigger: el cliente no puede marcarse una compra como pagada.
--    Con tarjeta se guarda sólo la marca, los últimos 4 dígitos, las cuotas y su interés
--    (interes_cuotas, ya sumado a total; lo calcula la Edge Function pago-tarjeta).
-- 2) registrar_pago_mp(): la usan sólo las Edge Functions (service_role) con el resultado del
--    pago (tarjeta o Mercado Pago). Si el pago se cancela, cancela los pedidos y devuelve el stock.
-- 3) anular_pagos_vencidos(): libera el stock de las compras que quedaron sin pagar.
-- 4) Los vendedores no pueden avanzar un pedido cuyo pago todavía no se acreditó.
-- 5) Comisión de la tarjeta de crédito (compras.comision) y confirmar_compra con los medios nuevos.

-- ===== 1) Estado del pago =====
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'no_aplica'
    CHECK (estado_pago IN ('no_aplica', 'pendiente', 'aprobado', 'rechazado', 'cancelado')),
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS pagado_at timestamptz,
  ADD COLUMN IF NOT EXISTS tarjeta_marca text,
  ADD COLUMN IF NOT EXISTS tarjeta_ultimos4 text,
  ADD COLUMN IF NOT EXISTS cuotas int,
  ADD COLUMN IF NOT EXISTS interes_cuotas numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.fijar_estado_pago_compra()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.estado_pago := CASE
    WHEN NEW.metodo_pago IN ('Tarjeta de crédito', 'Tarjeta de débito', 'Mercado Pago') THEN 'pendiente'
    ELSE 'no_aplica' END;
  NEW.mp_preference_id := NULL;
  NEW.mp_payment_id := NULL;
  NEW.pagado_at := NULL;
  NEW.tarjeta_marca := NULL;
  NEW.tarjeta_ultimos4 := NULL;
  NEW.cuotas := NULL;
  NEW.interes_cuotas := 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fijar_estado_pago_compra_trigger ON public.compras;
CREATE TRIGGER fijar_estado_pago_compra_trigger BEFORE INSERT ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.fijar_estado_pago_compra();

-- ===== 2) Resultado del pago (sólo Edge Functions) =====
CREATE OR REPLACE FUNCTION public.registrar_pago_mp(
  p_compra bigint,
  p_estado text,
  p_payment_id text DEFAULT NULL,
  p_preference_id text DEFAULT NULL
) RETURNS public.compras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra public.compras;
  v_pedido public.pedidos;
BEGIN
  IF p_estado NOT IN ('pendiente', 'aprobado', 'rechazado', 'cancelado') THEN
    RAISE EXCEPTION 'Estado de pago inválido';
  END IF;

  SELECT * INTO v_compra FROM compras WHERE compraid = p_compra FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La compra no existe';
  END IF;

  -- Un pago aprobado no se pisa, y efectivo no pasa por acá.
  IF v_compra.estado_pago IN ('aprobado', 'no_aplica') THEN
    RETURN v_compra;
  END IF;

  -- Ya anulada (stock devuelto): sólo se registra si después igual llegó un pago aprobado.
  IF v_compra.estado_pago = 'cancelado' AND p_estado <> 'aprobado' THEN
    RETURN v_compra;
  END IF;

  -- 'rechazado' no anula: el comprador puede reintentar con otra tarjeta.
  -- Sólo 'cancelado' (cerró el pago, venció o Mercado Pago lo canceló) devuelve el stock.
  IF p_estado = 'cancelado' THEN
    FOR v_pedido IN SELECT * FROM pedidos WHERE compra_id = v_compra.compraid AND estado = 'pendiente' FOR UPDATE LOOP
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

      UPDATE pedidos SET estado = 'cancelado', updated_at = now() WHERE id = v_pedido.id;
      INSERT INTO pedido_eventos (pedido_id, estado_anterior, estado_nuevo, actor_id, nota)
      VALUES (v_pedido.id, 'pendiente', 'cancelado', NULL, 'El pago no se realizó');
    END LOOP;
  END IF;

  UPDATE compras
     SET estado_pago = p_estado,
         mp_payment_id = coalesce(p_payment_id, mp_payment_id),
         mp_preference_id = coalesce(p_preference_id, mp_preference_id),
         pagado_at = CASE WHEN p_estado = 'aprobado' THEN now() ELSE pagado_at END
   WHERE compraid = v_compra.compraid
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_pago_mp(bigint, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_mp(bigint, text, text, text) TO service_role;

-- ===== 3) Compras que quedaron sin pagar =====
-- Pasada una hora sin un pago
-- aprobado ni en revisión se anula la compra y vuelve el stock (la preferencia de Mercado Pago
-- vence a los 30 minutos). La llama la Edge Function pago-mercadopago.
CREATE OR REPLACE FUNCTION public.anular_pagos_vencidos()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_compra bigint;
  v_anuladas int := 0;
BEGIN
  FOR v_compra IN
    SELECT compraid FROM compras
     WHERE (estado_pago = 'rechazado' OR (estado_pago = 'pendiente' AND mp_payment_id IS NULL))
       AND created_at < now() - interval '1 hour'
  LOOP
    PERFORM public.registrar_pago_mp(v_compra, 'cancelado');
    v_anuladas := v_anuladas + 1;
  END LOOP;
  RETURN v_anuladas;
END;
$$;
REVOKE ALL ON FUNCTION public.anular_pagos_vencidos() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anular_pagos_vencidos() TO service_role;

-- ===== 4) Sin pago acreditado no se prepara el pedido =====
CREATE OR REPLACE FUNCTION public.exigir_pago_acreditado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado <> OLD.estado AND NEW.estado <> 'cancelado' AND EXISTS (
       SELECT 1 FROM compras
        WHERE compraid = NEW.compra_id AND estado_pago IN ('pendiente', 'rechazado', 'cancelado')) THEN
    RAISE EXCEPTION 'El pago de esta compra todavía no se acreditó';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exigir_pago_acreditado_trigger ON public.pedidos;
CREATE TRIGGER exigir_pago_acreditado_trigger BEFORE UPDATE OF estado ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.exigir_pago_acreditado();

-- ===== 5) Comisión por tarjeta de crédito =====
-- Porcentaje que se suma al total (productos + envío) cuando se paga con crédito, para
-- cubrir el costo de procesar la tarjeta. Para cambiarlo, editar este número y el de
-- COMISION_CREDITO en services/pagosService.ts (la app sólo lo muestra; cobra el servidor).
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS comision numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.comision_tarjeta_credito()
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 0.06 $$;

-- Igual que en 16-etapa1-mejoras.sql, con los medios nuevos y la comisión.
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
  v_comision numeric := 0;
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

  -- Los mismos medios que ofrece la app (ya no hay transferencia bancaria).
  IF p_metodo_pago IS NULL OR p_metodo_pago NOT IN ('Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Mercado Pago') THEN
    RAISE EXCEPTION 'Medio de pago inválido';
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

    IF v_producto.estado = 'borrador' THEN
      RAISE EXCEPTION 'La prenda "%" no está publicada', v_producto.nombre;
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

  -- Recargo por pagar con tarjeta de crédito sobre productos + envío.
  IF p_metodo_pago = 'Tarjeta de crédito' THEN
    v_comision := round((v_subtotal + v_envio_total) * public.comision_tarjeta_credito());
  END IF;

  UPDATE compras SET envio = v_envio_total, comision = v_comision,
         total = v_subtotal + v_envio_total + v_comision
   WHERE compraid = v_compra.compraid
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, text, numeric, jsonb, text) TO authenticated;
