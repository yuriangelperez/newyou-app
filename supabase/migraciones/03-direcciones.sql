-- Direcciones de entrega y de tienda. Ejecutar UNA VEZ en el SQL Editor de Supabase
-- (después de migracion-checkout.sql).

-- Dirección del comprador y dirección de la tienda del vendedor (en su cuenta).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS direccion_tienda text;

-- Dirección a la que se entrega (domicilio) o donde se retira (tienda).
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS direccion_entrega text;

-- Direcciones de las tiendas de los vendedores de un conjunto de productos.
-- SECURITY DEFINER: un comprador no puede leer perfiles ajenos por RLS, y aquí
-- sólo se expone el nombre de usuario y la dirección de la tienda.
CREATE OR REPLACE FUNCTION public.direcciones_tiendas(p_producto_ids bigint[])
RETURNS TABLE (vendedor_id uuid, vendedor text, direccion_tienda text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.username, p.direccion_tienda
    FROM public.productos pr
    JOIN public.profiles p ON p.id = pr.creado_por
   WHERE pr.productoid = ANY (p_producto_ids);
$$;
GRANT EXECUTE ON FUNCTION public.direcciones_tiendas(bigint[]) TO authenticated;

-- confirmar_compra ahora guarda la dirección de entrega (cambia la firma).
DROP FUNCTION IF EXISTS public.confirmar_compra(text, text, text, numeric, jsonb);

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
  v_subtotal numeric := 0;
  v_precio numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida';
  END IF;

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
     descuentos, envio, impuestos, total, items, operation_key, direccion_entrega)
  VALUES
    (v_uid, nextval('public.compras_numero_orden_seq'), p_entrega, p_metodo_pago,
     v_subtotal, 0, p_envio, 0, v_subtotal + p_envio, p_items, p_operation_key,
     p_direccion_entrega)
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, text, numeric, jsonb, text) TO authenticated;
