-- Deja las cuentas demo como nuevas (presentación del 16/11/2026). Correrlo la mañana de la
-- presentación o cuando un invitado haya desarmado algo. Pegar TODO en el SQL Editor y ejecutar.
--
-- 1) Borra lo que generaron o tocaron las cuentas demo (CompradorDemo, VendedorDemo, EmpresaDemo):
--    compras y pedidos (con sus mensajes, calificaciones y reclamos), prendas, la empresa demo con
--    sus sedes y equipo, preguntas, direcciones, datos bancarios, notificaciones y liquidaciones.
-- 2) Las vuelve a armar como demo-cuentas.sql: perfil, direcciones, prendas, empresa, sedes y stock
--    copiados de las cuentas del MVP.
-- 3) Genera de nuevo las ventas de muestra como demo-ventas.sql.
-- Los usuarios NO se borran: quien tenga la sesión abierta sigue adentro. Las cuentas del MVP no
-- se tocan. Si algo falla, no se cambia nada (todo va en una sola transacción).
-- Archivo armado con partes/reset-borrar.sql + demo-cuentas.sql + demo-ventas.sql.

BEGIN;

DO $$
DECLARE
  v_usuarios uuid[];
  v_empresas bigint[];
  v_liquidaciones bigint[];
BEGIN
  SELECT coalesce(array_agg(id), '{}') INTO v_usuarios
    FROM auth.users
   WHERE lower(email) IN ('newyou.testing+compradordemo@gmail.com', 'newyou.testing+vendedordemo@gmail.com',
                          'newyou.testing+empresademo@gmail.com');

  IF cardinality(v_usuarios) = 0 THEN
    RAISE NOTICE 'No hay cuentas demo todavía: se crean de cero';
    RETURN;
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_empresas FROM public.empresas WHERE creada_por = ANY (v_usuarios);

  -- Compras de los demo (borra sus pedidos en cascada) y pedidos que les hicieron a los vendedores demo.
  DELETE FROM public.compras WHERE usuario_id = ANY (v_usuarios);
  DELETE FROM public.pedidos WHERE vendedor_id = ANY (v_usuarios) OR empresa_id = ANY (v_empresas);

  -- Liquidaciones y cargos de los vendedores demo.
  SELECT coalesce(array_agg(id), '{}') INTO v_liquidaciones
    FROM public.liquidaciones WHERE vendedor_id = ANY (v_usuarios) OR empresa_id = ANY (v_empresas);
  UPDATE public.pedidos SET liquidacion_id = NULL WHERE liquidacion_id = ANY (v_liquidaciones);
  DELETE FROM public.cargos_vendedor
   WHERE vendedor_id = ANY (v_usuarios) OR empresa_id = ANY (v_empresas) OR liquidacion_id = ANY (v_liquidaciones);
  DELETE FROM public.liquidaciones WHERE id = ANY (v_liquidaciones);

  -- Prendas (su stock por sede, preguntas y verificaciones se van en cascada).
  DELETE FROM public.productos WHERE creado_por = ANY (v_usuarios) OR empresa_id = ANY (v_empresas);
  DELETE FROM public.preguntas WHERE autor_id = ANY (v_usuarios);

  -- Empresa demo (sedes, equipo, invitaciones y datos bancarios en cascada) y membresías en otras.
  DELETE FROM public.empresas WHERE id = ANY (v_empresas);
  DELETE FROM public.empresa_miembros WHERE usuario_id = ANY (v_usuarios);
  DELETE FROM public.invitaciones WHERE creada_por = ANY (v_usuarios);

  DELETE FROM public.datos_bancarios WHERE usuario_id = ANY (v_usuarios);
  DELETE FROM public.direcciones WHERE usuario_id = ANY (v_usuarios);
  DELETE FROM public.notificaciones WHERE usuario_id = ANY (v_usuarios);

  RAISE NOTICE 'Cuentas demo vaciadas: % usuarios, % empresas', cardinality(v_usuarios), cardinality(v_empresas);
END;
$$;

-- ===== 2) Volver a armar las cuentas (igual que demo-cuentas.sql) =====

CREATE OR REPLACE FUNCTION pg_temp.clonar(p_tabla text, p_id_col text, p_id bigint, p_cambios jsonb)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_cols text;
  v_nuevo bigint;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = p_tabla
     AND column_name <> p_id_col
     AND is_generated = 'NEVER';

  EXECUTE format(
    'INSERT INTO public.%1$I (%2$s)
     SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I,
       (SELECT to_jsonb(s) FROM public.%1$I s WHERE %3$I = $1) || $2)
     RETURNING %3$I',
    p_tabla, v_cols, p_id_col)
  INTO v_nuevo
  USING p_id, p_cambios;
  RETURN v_nuevo;
END;
$$;

DO $$
DECLARE
  v_cuenta record;
  v_nuevo uuid;
  v_original uuid;
  v_cols text;
  v_empresa_orig bigint;
  v_empresa_nueva bigint;
  v_sede record;
  v_sedes jsonb := '{}';
  v_dir record;
  v_prod record;
  v_prod_nuevo bigint;
BEGIN
  FOR v_cuenta IN
    SELECT * FROM (VALUES
      ('newyou.testing+compradordemo@gmail.com', 'CompradorDemo', 'comprador',  'newyou.testing+comprador@gmail.com'),
      ('newyou.testing+vendedordemo@gmail.com',  'VendedorDemo',  'particular', 'newyou.testing+vendedor@gmail.com'),
      ('newyou.testing+empresademo@gmail.com',   'EmpresaDemo',   'comprador',  'newyou.testing+empresa@gmail.com')
    ) AS t(correo, usuario, rol, correo_original)
  LOOP
    -- 1) Usuario confirmado (el trigger handle_new_user crea el perfil). Si ya existe, se usa ése.
    v_nuevo := NULL;
    SELECT id INTO v_nuevo FROM auth.users WHERE lower(email) = v_cuenta.correo;
    IF v_nuevo IS NULL THEN
    v_nuevo := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_nuevo, 'authenticated', 'authenticated',
      v_cuenta.correo, extensions.crypt('Demo123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', v_cuenta.usuario, 'role', v_cuenta.rol),
      now(), now(), '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_nuevo, v_nuevo::text,
      jsonb_build_object('sub', v_nuevo::text, 'email', v_cuenta.correo, 'email_verified', true),
      'email', now(), now(), now()
    );
    END IF;

    -- 3) Términos aceptados (comprador y vendedor).
    INSERT INTO public.terminos_aceptaciones (usuario_id, tipo, version)
    VALUES (v_nuevo, 'comprador', '2026-11-09'), (v_nuevo, 'vendedor', '2026-11-09')
    ON CONFLICT DO NOTHING;

    v_original := NULL;
    SELECT id INTO v_original FROM auth.users WHERE lower(email) = v_cuenta.correo_original;
    IF v_original IS NULL THEN
      RAISE NOTICE 'No encontré % : % queda creada pero vacía', v_cuenta.correo_original, v_cuenta.usuario;
      CONTINUE;
    END IF;

    -- 2) Perfil igual al original, salvo id, correo y nombre de usuario.
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
      INTO v_cols
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'profiles'
       AND column_name NOT IN ('id', 'email', 'username', 'created_at', 'updated_at')
       AND is_generated = 'NEVER';
    EXECUTE format('UPDATE public.profiles SET (%1$s) = (SELECT %1$s FROM public.profiles WHERE id = $1) WHERE id = $2', v_cols)
      USING v_original, v_nuevo;
    UPDATE public.profiles SET username = v_cuenta.usuario WHERE id = v_nuevo;

    -- Direcciones guardadas (para comprar con envío sin cargar una).
    IF NOT EXISTS (SELECT 1 FROM public.direcciones WHERE usuario_id = v_nuevo) THEN
      FOR v_dir IN SELECT id FROM public.direcciones WHERE usuario_id = v_original ORDER BY id LOOP
        PERFORM pg_temp.clonar('direcciones', 'id', v_dir.id, jsonb_build_object('usuario_id', v_nuevo));
      END LOOP;
    END IF;

    -- 4) Prendas de particular (sin empresa), menos los borradores.
    IF v_cuenta.usuario = 'VendedorDemo'
       AND NOT EXISTS (SELECT 1 FROM public.productos WHERE creado_por = v_nuevo AND empresa_id IS NULL) THEN
      FOR v_prod IN
        SELECT * FROM public.productos
         WHERE creado_por = v_original AND empresa_id IS NULL AND estado <> 'borrador'
      LOOP
        v_prod_nuevo := pg_temp.clonar('productos', 'productoid', v_prod.productoid,
          jsonb_build_object('creado_por', v_nuevo));
        -- Las usadas quedan con la misma verificación que la original (el trigger las mandaba a revisar).
        PERFORM set_config('newyou.verificacion', '1', true);
        UPDATE public.productos d
           SET estado_verificacion = v_prod.estado_verificacion,
               verificacion_codigo = v_prod.verificacion_codigo,
               verificacion_foto_url = v_prod.verificacion_foto_url,
               verificacion_vence_at = v_prod.verificacion_vence_at,
               verificacion_motivo = v_prod.verificacion_motivo,
               verificado_por = v_prod.verificado_por,
               verificado_at = v_prod.verificado_at
         WHERE d.productoid = v_prod_nuevo;
        PERFORM set_config('newyou.verificacion', '', true);
      END LOOP;
    END IF;

    -- 5) Empresa, sedes, prendas y stock por sede.
    IF v_cuenta.usuario = 'EmpresaDemo'
       AND NOT EXISTS (SELECT 1 FROM public.empresa_miembros WHERE usuario_id = v_nuevo AND rol = 'propietario') THEN
      SELECT e.id INTO v_empresa_orig
        FROM public.empresas e
        JOIN public.empresa_miembros m ON m.empresa_id = e.id
       WHERE m.usuario_id = v_original AND m.rol = 'propietario'
       ORDER BY e.id
       LIMIT 1;

      IF v_empresa_orig IS NULL THEN
        RAISE NOTICE '% no es dueña de ninguna empresa: EmpresaDemo queda sin empresa', v_cuenta.correo_original;
        CONTINUE;
      END IF;

      v_empresa_nueva := pg_temp.clonar('empresas', 'id', v_empresa_orig, (
        SELECT jsonb_build_object(
          'razon_social', razon_social || ' Demo',
          'nombre_fantasia', nombre_fantasia || ' Demo',
          'slug', slug || '-demo',
          'cuit', '30' || lpad((floor(random() * 1000000000))::bigint::text, 9, '0'),
          'creada_por', v_nuevo)
        FROM public.empresas WHERE id = v_empresa_orig));

      INSERT INTO public.empresa_miembros (empresa_id, usuario_id, rol)
      VALUES (v_empresa_nueva, v_nuevo, 'propietario');

      FOR v_sede IN SELECT id FROM public.sedes WHERE empresa_id = v_empresa_orig ORDER BY id LOOP
        v_sedes := v_sedes || jsonb_build_object(v_sede.id::text,
          pg_temp.clonar('sedes', 'id', v_sede.id, jsonb_build_object('empresa_id', v_empresa_nueva)));
      END LOOP;

      FOR v_prod IN
        SELECT * FROM public.productos WHERE empresa_id = v_empresa_orig AND estado <> 'borrador'
      LOOP
        v_prod_nuevo := pg_temp.clonar('productos', 'productoid', v_prod.productoid,
          jsonb_build_object(
            'creado_por', v_nuevo,
            'empresa_id', v_empresa_nueva,
            'sede_id', v_sedes ->> v_prod.sede_id::text));

        INSERT INTO public.stock_sede (producto_id, sede_id, cantidad)
        SELECT v_prod_nuevo, (v_sedes ->> s.sede_id::text)::bigint, s.cantidad
          FROM public.stock_sede s
         WHERE s.producto_id = v_prod.productoid
           AND v_sedes ? s.sede_id::text;
      END LOOP;
    END IF;

    RAISE NOTICE '% lista', v_cuenta.usuario;
  END LOOP;
END;
$$;



-- ===== 3) Ventas de muestra (igual que demo-ventas.sql) =====

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
