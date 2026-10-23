-- Publicar como empresa: stock por sede y permisos de publicación por rol.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 07-admin.sql).
-- Las prendas de particulares no cambian: siguen usando productos.stock.

BEGIN;

-- 1) Stock de cada prenda de empresa en cada sede. productos.stock pasa a ser la suma
--    (lo mantiene un trigger), así el catálogo y el carrito siguen leyendo `stock`.
CREATE TABLE IF NOT EXISTS public.stock_sede (
  producto_id bigint NOT NULL REFERENCES public.productos(productoid) ON DELETE CASCADE,
  sede_id bigint NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (producto_id, sede_id)
);
CREATE INDEX IF NOT EXISTS stock_sede_sede ON public.stock_sede (sede_id);

CREATE OR REPLACE FUNCTION public.empresa_de_producto(p_producto bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM productos WHERE productoid = p_producto;
$$;

-- La sede tiene que ser de la misma empresa que la prenda.
CREATE OR REPLACE FUNCTION public.stock_sede_validar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM productos p JOIN sedes s ON s.empresa_id = p.empresa_id
     WHERE p.productoid = NEW.producto_id AND s.id = NEW.sede_id) THEN
    RAISE EXCEPTION 'La sede no pertenece a la empresa de la prenda';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_sede_validar ON public.stock_sede;
CREATE TRIGGER stock_sede_validar
  BEFORE INSERT OR UPDATE ON public.stock_sede
  FOR EACH ROW EXECUTE FUNCTION public.stock_sede_validar();

-- Recalcula productos.stock. SECURITY DEFINER: quien edita stock puede no tener permiso
-- para editar la prenda (y la guarda de abajo ignora cambios de stock hechos por la app).
CREATE OR REPLACE FUNCTION public.stock_sede_sincronizar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto bigint := CASE WHEN TG_OP = 'DELETE' THEN OLD.producto_id ELSE NEW.producto_id END;
BEGIN
  UPDATE productos
     SET stock = (SELECT coalesce(sum(cantidad), 0) FROM stock_sede WHERE producto_id = v_producto),
         updated_at = now()
   WHERE productoid = v_producto;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS stock_sede_sincronizar ON public.stock_sede;
CREATE TRIGGER stock_sede_sincronizar
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_sede
  FOR EACH ROW EXECUTE FUNCTION public.stock_sede_sincronizar();

ALTER TABLE public.stock_sede ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_sede_lectura ON public.stock_sede;
CREATE POLICY stock_sede_lectura ON public.stock_sede FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS stock_sede_gestion ON public.stock_sede;
CREATE POLICY stock_sede_gestion ON public.stock_sede FOR ALL TO authenticated
  USING (public.tiene_permiso(public.empresa_de_producto(producto_id), 'stock.editar', sede_id))
  WITH CHECK (public.tiene_permiso(public.empresa_de_producto(producto_id), 'stock.editar', sede_id));

-- 2) Políticas de productos para miembros de empresa. Las de particulares ("Vendedores ...") siguen igual.
--    Sólo publican empresas verificadas (también lo exige la restrictiva, porque un propietario que es
--    particular entraría por "Vendedores crean sus productos"); la sede tiene que estar en su alcance.
DROP POLICY IF EXISTS "Empresas publican productos" ON public.productos;
CREATE POLICY "Empresas publican productos" ON public.productos FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IS NOT NULL
    AND creado_por = auth.uid()
    AND public.tiene_permiso(empresa_id, 'productos.publicar', sede_id)
    AND EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id AND e.estado = 'verificada')
  );
DROP POLICY IF EXISTS "Empresas editan productos" ON public.productos;
CREATE POLICY "Empresas editan productos" ON public.productos FOR UPDATE TO authenticated
  USING (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'productos.publicar'))
  WITH CHECK (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'productos.publicar', sede_id));
DROP POLICY IF EXISTS "Empresas eliminan productos" ON public.productos;
CREATE POLICY "Empresas eliminan productos" ON public.productos FOR DELETE TO authenticated
  USING (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'productos.publicar', sede_id));

-- La restrictiva de 06 era FOR ALL; se separa por comando para cubrir también UPDATE/DELETE
-- sin ocultar las prendas en las lecturas públicas.
DROP POLICY IF EXISTS productos_empresa_permitida ON public.productos;
DROP POLICY IF EXISTS productos_empresa_alta ON public.productos;
CREATE POLICY productos_empresa_alta ON public.productos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id IS NULL
    OR (public.tiene_permiso(empresa_id, 'productos.publicar', sede_id)
        AND EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = empresa_id AND e.estado = 'verificada')
        AND EXISTS (SELECT 1 FROM public.sedes s WHERE s.id = sede_id AND s.empresa_id = productos.empresa_id))
  );
DROP POLICY IF EXISTS productos_empresa_edicion ON public.productos;
CREATE POLICY productos_empresa_edicion ON public.productos AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (empresa_id IS NULL OR public.tiene_permiso(empresa_id, 'productos.publicar'))
  WITH CHECK (
    empresa_id IS NULL
    OR (public.tiene_permiso(empresa_id, 'productos.publicar', sede_id)
        AND EXISTS (SELECT 1 FROM public.sedes s WHERE s.id = sede_id AND s.empresa_id = productos.empresa_id))
  );
DROP POLICY IF EXISTS productos_empresa_baja ON public.productos;
CREATE POLICY productos_empresa_baja ON public.productos AS RESTRICTIVE FOR DELETE TO authenticated
  USING (empresa_id IS NULL OR public.tiene_permiso(empresa_id, 'productos.publicar', sede_id));

-- 3) Guardas de prendas de empresa hechas desde la app:
--    - el stock sólo cambia por stock_sede (al crear arranca en 0);
--    - precio y descuento exigen el permiso productos.precio (el vendedor no lo tiene);
--    - una prenda no cambia de empresa.
CREATE OR REPLACE FUNCTION public.productos_guardas_empresa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.empresa_id IS NOT NULL THEN
      NEW.stock := 0;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
    RAISE EXCEPTION 'Una prenda no puede cambiar de empresa';
  END IF;

  IF NEW.empresa_id IS NOT NULL THEN
    NEW.stock := OLD.stock;
    IF (NEW.precio IS DISTINCT FROM OLD.precio OR NEW.descuento_porcentaje IS DISTINCT FROM OLD.descuento_porcentaje)
       AND NOT public.tiene_permiso(NEW.empresa_id, 'productos.precio') THEN
      RAISE EXCEPTION 'Tu rol no puede cambiar precios';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_guardas_empresa ON public.productos;
CREATE TRIGGER productos_guardas_empresa
  BEFORE INSERT OR UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_guardas_empresa();

-- 4) Dirección de retiro: para prendas de empresa, la de su sede.
CREATE OR REPLACE FUNCTION public.productos_direccion_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sede_id IS NOT NULL THEN
    SELECT s.direccion INTO NEW.direccion_retiro FROM sedes s WHERE s.id = NEW.sede_id;
  ELSIF btrim(coalesce(NEW.direccion_retiro, '')) = '' THEN
    SELECT d.direccion INTO NEW.direccion_retiro
      FROM direcciones d
     WHERE d.usuario_id = NEW.creado_por AND d.es_principal
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_direccion_por_defecto ON public.productos;
CREATE TRIGGER productos_direccion_por_defecto
  BEFORE INSERT OR UPDATE OF sede_id ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_direccion_por_defecto();

-- En el checkout, el vendedor de una prenda de empresa es la tienda (no la persona que la cargó).
DROP FUNCTION IF EXISTS public.direcciones_retiro(bigint[]);
CREATE OR REPLACE FUNCTION public.direcciones_retiro(p_producto_ids bigint[])
RETURNS TABLE (productoid bigint, vendedor text, direccion text)
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
         )), '')
    FROM public.productos pr
    JOIN public.profiles p ON p.id = pr.creado_por
    LEFT JOIN public.empresas e ON e.id = pr.empresa_id
    LEFT JOIN public.sedes s ON s.id = pr.sede_id
   WHERE pr.productoid = ANY (p_producto_ids);
$$;
GRANT EXECUTE ON FUNCTION public.direcciones_retiro(bigint[]) TO authenticated;

-- 5) confirmar_compra: las prendas de empresa descuentan de stock_sede (primero la sede principal,
--    después la que más tenga). El resto es igual a 03-direcciones.sql.
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
  v_producto public.productos;
  v_cantidad int;
  v_sede bigint;
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
    v_cantidad := (v_item->>'cantidad')::int;

    SELECT * INTO v_producto FROM public.productos
     WHERE productoid = (v_item->>'productoId')::bigint
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La prenda "%" ya no existe', v_item->>'nombre';
    END IF;

    IF v_producto.empresa_id IS NULL THEN
      UPDATE public.productos
         SET stock = stock - v_cantidad,
             updated_at = now()
       WHERE productoid = v_producto.productoid
         AND stock >= v_cantidad;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para "%"', v_item->>'nombre';
      END IF;
    ELSE
      SELECT ss.sede_id INTO v_sede
        FROM public.stock_sede ss
        JOIN public.sedes s ON s.id = ss.sede_id AND s.activa
       WHERE ss.producto_id = v_producto.productoid
         AND ss.cantidad >= v_cantidad
       ORDER BY (ss.sede_id = v_producto.sede_id) DESC, ss.cantidad DESC
       LIMIT 1
       FOR UPDATE OF ss;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para "%"', v_item->>'nombre';
      END IF;

      UPDATE public.stock_sede
         SET cantidad = cantidad - v_cantidad
       WHERE producto_id = v_producto.productoid AND sede_id = v_sede;
    END IF;

    v_precio := v_producto.precio;
    v_subtotal := v_subtotal + v_precio * v_cantidad;
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

COMMIT;

NOTIFY pgrst, 'reload schema';
