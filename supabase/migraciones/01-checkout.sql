-- Migración Fase 3 (checkout idempotente + descuento de stock).
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.

-- 1) Clave de idempotencia: una misma operación no puede registrarse dos veces.
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS operation_key text UNIQUE;

-- 2) Numeración de órdenes (numero_orden es NOT NULL y no tenía default).
CREATE SEQUENCE IF NOT EXISTS public.compras_numero_orden_seq;

-- 3) Compra atómica: inserta la orden y descuenta stock en una sola transacción.
--    SECURITY DEFINER porque un comprador no puede (por RLS) editar productos ajenos.
--    El stock vive en `productos.stock`; `disponible` se deriva de stock > 0.
CREATE OR REPLACE FUNCTION public.confirmar_compra(
  p_operation_key text,
  p_entrega text,
  p_metodo_pago text,
  p_envio numeric,
  p_items jsonb
) RETURNS public.compras
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_compra public.compras;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_precio numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

  -- Idempotencia: si la operación ya existe, devolvemos la misma orden.
  SELECT * INTO v_compra FROM public.compras
   WHERE operation_key = p_operation_key AND usuario_id = v_uid;
  IF FOUND THEN
    RETURN v_compra;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.productos
       SET stock = stock - (v_item->>'cantidad')::int,
           updated_at = now()
     WHERE productoid = (v_item->>'productoId')::bigint
       AND stock >= (v_item->>'cantidad')::int
    RETURNING precio INTO v_precio;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para "%"', v_item->>'nombre';
    END IF;

    v_subtotal := v_subtotal + v_precio * (v_item->>'cantidad')::int;
  END LOOP;

  INSERT INTO public.compras
    (usuario_id, numero_orden, entrega, metodo_pago, subtotal_original,
     descuentos, envio, impuestos, total, items, operation_key)
  VALUES
    (v_uid, nextval('public.compras_numero_orden_seq'), p_entrega, p_metodo_pago,
     v_subtotal, 0, p_envio, 0, v_subtotal + p_envio, p_items, p_operation_key)
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, text, numeric, jsonb) TO authenticated;
