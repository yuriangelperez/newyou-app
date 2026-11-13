-- Compras y ventas de muestra para la demo (presentación del 16/11/2026), así las métricas,
-- "Mis ventas" y "Mis compras" muestran números. Correr DESPUÉS de demo-cuentas.sql.
-- Pegar TODO en el SQL Editor de Supabase y ejecutar.
--
-- - Compra siempre CompradorDemo (newyou.testing+compradordemo@gmail.com).
-- - Le compra a VendedorDemo (25 pedidos) y a la empresa de EmpresaDemo (45 pedidos).
-- - Repartidas en los últimos 30 días, de 10 a 22 h, con más movimiento en los últimos días.
-- - Casi todas entregadas; las de los últimos días quedan en curso y algunas canceladas.
-- - Medios de pago variados (efectivo sólo con retiro en el local), ya acreditados.
-- - No descuenta stock ni manda avisos ni mensajes de chat.
-- Se puede volver a correr: primero borra las compras de muestra anteriores (las marcadas
-- con operation_key "demo-ventas-...") y vuelve a generarlas.

BEGIN;

DO $$
DECLARE
  v_comprador uuid;
  v_vendedor uuid;
  v_empresa bigint;
  v_destino record;
  v_i int;
  v_dias int;
  v_cuando timestamptz;
  v_entrega text;
  v_metodo text;
  v_estado text;
  v_prod record;
  v_lineas jsonb;
  v_subtotal numeric;
  v_original numeric;
  v_envio numeric;
  v_sede bigint;
  v_direccion text;
  v_compra bigint;
  v_pedido bigint;
  v_cant int;
  v_precio numeric;
  v_n int := 0;
BEGIN
  SELECT id INTO v_comprador FROM auth.users WHERE lower(email) = 'newyou.testing+compradordemo@gmail.com';
  SELECT id INTO v_vendedor FROM auth.users WHERE lower(email) = 'newyou.testing+vendedordemo@gmail.com';
  SELECT m.empresa_id INTO v_empresa
    FROM public.empresa_miembros m
    JOIN auth.users u ON u.id = m.usuario_id
   WHERE lower(u.email) = 'newyou.testing+empresademo@gmail.com' AND m.rol = 'propietario'
   ORDER BY m.empresa_id LIMIT 1;

  IF v_comprador IS NULL THEN
    RAISE EXCEPTION 'Falta CompradorDemo: corré primero demo-cuentas.sql';
  END IF;

  DELETE FROM public.compras WHERE operation_key LIKE 'demo-ventas-%';

  FOR v_destino IN
    SELECT * FROM (VALUES ('vendedor', 25), ('empresa', 45)) AS t(tipo, cantidad)
  LOOP
    IF (v_destino.tipo = 'vendedor' AND v_vendedor IS NULL) OR (v_destino.tipo = 'empresa' AND v_empresa IS NULL) THEN
      RAISE NOTICE 'Sin % demo: se saltea', v_destino.tipo;
      CONTINUE;
    END IF;

    FOR v_i IN 1..v_destino.cantidad LOOP
      -- Día (más peso a los últimos) y hora local entre 10 y 22.
      v_dias := floor(power(random(), 1.6) * 30)::int;
      v_cuando := ((date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                    - make_interval(days => v_dias)
                    + make_interval(hours => 10 + floor(random() * 12)::int, mins => floor(random() * 60)::int))
                   AT TIME ZONE 'America/Argentina/Buenos_Aires');
      IF v_cuando > now() THEN
        v_cuando := now() - make_interval(mins => 5 + floor(random() * 120)::int);
      END IF;

      v_entrega := CASE WHEN random() < 0.55 THEN 'domicilio' ELSE 'local' END;
      v_metodo := CASE
        WHEN v_entrega = 'local' AND random() < 0.3 THEN 'Efectivo'
        ELSE (ARRAY['Mercado Pago', 'Mercado Pago', 'Tarjeta de débito', 'Tarjeta de crédito'])[1 + floor(random() * 4)::int]
      END;

      v_estado := CASE
        WHEN v_dias >= 4 THEN CASE WHEN random() < 0.9 THEN 'entregado' ELSE 'cancelado' END
        WHEN v_dias >= 1 THEN (ARRAY['preparando', CASE WHEN v_entrega = 'domicilio' THEN 'enviado' ELSE 'listo_para_retirar' END, 'entregado'])[1 + floor(random() * 3)::int]
        ELSE (ARRAY['pendiente', 'confirmado', 'preparando'])[1 + floor(random() * 3)::int]
      END;

      -- 1 o 2 prendas del mismo vendedor (y de la misma sede, si es empresa).
      v_lineas := '[]';
      v_subtotal := 0;
      v_original := 0;
      v_sede := NULL;
      FOR v_prod IN
        SELECT pr.*, to_jsonb(pr) AS j
          FROM public.productos pr
         WHERE pr.estado <> 'borrador'
           AND (pr.condicion IS DISTINCT FROM 'usado' OR pr.estado_verificacion = 'aprobada')
           AND CASE WHEN v_destino.tipo = 'vendedor'
                    THEN pr.creado_por = v_vendedor AND pr.empresa_id IS NULL
                    ELSE pr.empresa_id = v_empresa END
         ORDER BY random()
      LOOP
        EXIT WHEN jsonb_array_length(v_lineas) >= CASE WHEN random() < 0.3 THEN 2 ELSE 1 END;
        CONTINUE WHEN v_sede IS NOT NULL AND v_prod.sede_id IS DISTINCT FROM v_sede;
        v_sede := v_prod.sede_id;
        v_cant := CASE WHEN random() < 0.8 THEN 1 ELSE 2 END;
        v_precio := round(v_prod.precio * (1 - coalesce(v_prod.descuento_porcentaje, 0) / 100.0));
        v_subtotal := v_subtotal + v_precio * v_cant;
        v_original := v_original + v_prod.precio * v_cant;
        v_lineas := v_lineas || jsonb_build_object(
          'productoId', v_prod.productoid,
          'producto_id', v_prod.productoid,
          'nombre', v_prod.nombre,
          'precio', v_precio,
          'cantidad', v_cant,
          'talle', v_prod.j ->> 'talle',
          'color', v_prod.j ->> 'color',
          'imagen_url', coalesce(v_prod.imagenes[1], v_prod.j ->> 'imagen_url'));
      END LOOP;

      IF jsonb_array_length(v_lineas) = 0 THEN
        RAISE NOTICE 'El % demo no tiene prendas para vender: se saltea', v_destino.tipo;
        EXIT;
      END IF;

      IF v_entrega = 'domicilio' THEN
        v_envio := CASE WHEN v_sede IS NULL THEN 1500
                        ELSE coalesce((SELECT costo_envio FROM public.sedes WHERE id = v_sede), 1500) END;
        v_direccion := (ARRAY['Av. Tomás Márquez 1200, Pilar', 'Belgrano 450, Pilar', 'Rivadavia 980, Del Viso',
                              'Av. Caamaño 1350, Villa Rosa'])[1 + floor(random() * 4)::int];
      ELSE
        v_envio := 0;
        v_direccion := NULL;
      END IF;

      v_n := v_n + 1;
      INSERT INTO public.compras
        (usuario_id, numero_orden, entrega, metodo_pago, subtotal_original, descuentos, envio, impuestos,
         total, items, operation_key, direccion_entrega, created_at)
      VALUES
        (v_comprador, nextval('public.compras_numero_orden_seq'), v_entrega, v_metodo, v_original,
         v_original - v_subtotal, v_envio, 0, v_subtotal + v_envio, v_lineas,
         'demo-ventas-' || v_destino.tipo || '-' || v_i, v_direccion, v_cuando)
      RETURNING compraid INTO v_compra;

      -- El pago queda acreditado (el trigger de alta lo deja "pendiente").
      IF v_metodo <> 'Efectivo' THEN
        UPDATE public.compras
           SET estado_pago = CASE WHEN v_estado = 'cancelado' THEN 'cancelado' ELSE 'aprobado' END,
               pagado_at = v_cuando + interval '1 minute',
               tarjeta_marca = CASE WHEN v_metodo LIKE 'Tarjeta%' THEN 'visa' END,
               tarjeta_ultimos4 = CASE WHEN v_metodo LIKE 'Tarjeta%' THEN '4242' END,
               cuotas = CASE WHEN v_metodo = 'Tarjeta de crédito' THEN 1 END
         WHERE compraid = v_compra;
      END IF;

      INSERT INTO public.pedidos
        (compra_id, comprador_id, vendedor_id, empresa_id, sede_id, estado, entrega, direccion_entrega,
         subtotal, envio, total, created_at, updated_at, enviado_en, entregado_en)
      VALUES
        (v_compra, v_comprador,
         CASE WHEN v_destino.tipo = 'vendedor' THEN v_vendedor END,
         CASE WHEN v_destino.tipo = 'empresa' THEN v_empresa END,
         v_sede, v_estado, v_entrega,
         coalesce(v_direccion, (SELECT direccion FROM public.sedes WHERE id = v_sede), 'Retiro a coordinar con el vendedor'),
         v_subtotal, v_envio, v_subtotal + v_envio, v_cuando, v_cuando,
         CASE WHEN v_estado IN ('enviado', 'entregado') AND v_entrega = 'domicilio' THEN v_cuando + interval '1 day' END,
         CASE WHEN v_estado = 'entregado' THEN v_cuando + make_interval(days => least(v_dias, 2)) END)
      RETURNING id INTO v_pedido;

      INSERT INTO public.pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad, talle, color, imagen_url)
      SELECT v_pedido, (l ->> 'producto_id')::bigint, l ->> 'nombre', (l ->> 'precio')::numeric,
             (l ->> 'cantidad')::int, l ->> 'talle', l ->> 'color', l ->> 'imagen_url'
        FROM jsonb_array_elements(v_lineas) AS l;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Listo: % compras de muestra', v_n;
END;
$$;

COMMIT;

-- Resumen de lo generado:
SELECT CASE WHEN p.empresa_id IS NULL THEN 'VendedorDemo' ELSE 'EmpresaDemo' END AS vende,
       count(*) AS pedidos,
       count(*) FILTER (WHERE p.estado = 'entregado') AS entregados,
       count(*) FILTER (WHERE p.estado = 'cancelado') AS cancelados,
       sum(p.subtotal) FILTER (WHERE p.estado <> 'cancelado') AS ingresos
  FROM public.pedidos p
  JOIN public.compras c ON c.compraid = p.compra_id
 WHERE c.operation_key LIKE 'demo-ventas-%'
 GROUP BY 1;
