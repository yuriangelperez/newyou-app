-- Cuentas de la demo (presentación del 16/11/2026), para que la gente pruebe la app sin tocar
-- las cuentas del MVP. Pegar TODO en el SQL Editor de Supabase y ejecutar una vez.
--
--   CompradorDemo  newyou.testing+compradordemo@gmail.com  (comprador)
--   VendedorDemo   newyou.testing+vendedordemo@gmail.com   (particular)
--   EmpresaDemo    newyou.testing+empresademo@gmail.com    (empresa)
--   Contraseña de las 3: Demo123
--
-- Qué hace:
-- 1) Crea los 3 usuarios ya confirmados (no hace falta el correo de verificación).
-- 2) Copia el perfil de la cuenta del MVP equivalente (tipo de cuenta, dirección, ubicación)
--    y sus direcciones guardadas.
-- 3) Da por aceptados los términos, para que no les aparezcan al entrar ni al publicar.
-- 4) Las prendas publicadas de particulares reales se reparten mitad y mitad: una va a
--    VendedorDemo y la siguiente a la tienda de EmpresaDemo (así el catálogo demo no queda vacío,
--    porque las cuentas demo sólo ven lo demo, y las dos cuentas quedan parejas).
-- 5) EmpresaDemo: copia la empresa de newyou.testing+empresa@gmail.com (nombre con "Demo",
--    slug con "-demo"), sus sedes, sus prendas y el stock de cada sede. Además suma las prendas
--    de las demás empresas reales, en su primera sede y con el mismo stock.
-- Las copias usan las mismas fotos: borrar una prenda demo no borra la foto ni la original.
-- Se puede volver a correr: no duplica cuentas, prendas ni empresa; sólo completa lo que falte
-- y vuelve el perfil (nombre, tipo de cuenta) a como estaba. Para dejarlas como nuevas, usar
-- demo-reset.sql.

BEGIN;

-- Copia una fila cambiando algunas columnas; devuelve el id nuevo.
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

-- Copia una prenda y le deja la misma verificación que la original (el trigger de alta mandaba
-- las usadas a revisar de nuevo).
CREATE OR REPLACE FUNCTION pg_temp.clonar_producto(p_id bigint, p_cambios jsonb)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_orig public.productos;
  v_nuevo bigint;
BEGIN
  SELECT * INTO v_orig FROM public.productos WHERE productoid = p_id;
  v_nuevo := pg_temp.clonar('productos', 'productoid', p_id, p_cambios);
  PERFORM set_config('newyou.verificacion', '1', true);
  UPDATE public.productos d
     SET estado_verificacion = v_orig.estado_verificacion,
         verificacion_codigo = v_orig.verificacion_codigo,
         verificacion_foto_url = v_orig.verificacion_foto_url,
         verificacion_vence_at = v_orig.verificacion_vence_at,
         verificacion_motivo = v_orig.verificacion_motivo,
         verificado_por = v_orig.verificado_por,
         verificado_at = v_orig.verificado_at
   WHERE d.productoid = v_nuevo;
  PERFORM set_config('newyou.verificacion', '', true);
  RETURN v_nuevo;
END;
$$;

DO $$
DECLARE
  v_demos text[] := ARRAY['newyou.testing+compradordemo@gmail.com', 'newyou.testing+vendedordemo@gmail.com',
                          'newyou.testing+empresademo@gmail.com'];
  v_sede_principal bigint;
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

    -- Si ya se corrió demo-aislamiento.sql, la cuenta queda marcada como demo.
    IF to_regclass('public.cuentas_demo') IS NOT NULL THEN
      EXECUTE 'INSERT INTO public.cuentas_demo (usuario_id) VALUES ($1) ON CONFLICT DO NOTHING' USING v_nuevo;
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
      -- La mitad de las de particulares reales (no las de otras cuentas demo); la otra mitad va a la tienda.
      FOR v_prod IN
        SELECT x.productoid FROM (
          SELECT pr.productoid, row_number() OVER (ORDER BY pr.productoid) AS n
            FROM public.productos pr
           WHERE pr.empresa_id IS NULL AND pr.estado <> 'borrador' AND pr.creado_por IS NOT NULL
             AND pr.creado_por NOT IN (SELECT id FROM auth.users WHERE lower(email) = ANY (v_demos))
        ) x
         WHERE x.n % 2 = 1
         ORDER BY x.productoid
      LOOP
        PERFORM pg_temp.clonar_producto(v_prod.productoid, jsonb_build_object('creado_por', v_nuevo));
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
        v_prod_nuevo := pg_temp.clonar_producto(v_prod.productoid,
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

      -- Prendas de las demás empresas reales, en la primera sede de la empresa demo.
      SELECT min(id) INTO v_sede_principal FROM public.sedes WHERE empresa_id = v_empresa_nueva;
      IF v_sede_principal IS NOT NULL THEN
        FOR v_prod IN
          SELECT pr.* FROM public.productos pr
            JOIN public.empresas e ON e.id = pr.empresa_id
           WHERE pr.empresa_id NOT IN (v_empresa_orig, v_empresa_nueva) AND pr.estado <> 'borrador'
             AND e.creada_por NOT IN (SELECT id FROM auth.users WHERE lower(email) = ANY (v_demos))
           ORDER BY pr.productoid
        LOOP
          v_prod_nuevo := pg_temp.clonar_producto(v_prod.productoid,
            jsonb_build_object('creado_por', v_nuevo, 'empresa_id', v_empresa_nueva, 'sede_id', v_sede_principal));
          INSERT INTO public.stock_sede (producto_id, sede_id, cantidad)
          VALUES (v_prod_nuevo, v_sede_principal, greatest(coalesce(v_prod.stock, 0), 0));
        END LOOP;

        -- La otra mitad de las prendas de particulares reales (las pares), como prendas de la tienda.
        FOR v_prod IN
          SELECT x.* FROM (
            SELECT pr.*, row_number() OVER (ORDER BY pr.productoid) AS n
              FROM public.productos pr
             WHERE pr.empresa_id IS NULL AND pr.estado <> 'borrador' AND pr.creado_por IS NOT NULL
               AND pr.creado_por NOT IN (SELECT id FROM auth.users WHERE lower(email) = ANY (v_demos))
          ) x
           WHERE x.n % 2 = 0
           ORDER BY x.productoid
        LOOP
          v_prod_nuevo := pg_temp.clonar_producto(v_prod.productoid,
            jsonb_build_object('creado_por', v_nuevo, 'empresa_id', v_empresa_nueva, 'sede_id', v_sede_principal));
          INSERT INTO public.stock_sede (producto_id, sede_id, cantidad)
          VALUES (v_prod_nuevo, v_sede_principal, greatest(coalesce(v_prod.stock, 0), 0));
        END LOOP;
      END IF;
    END IF;

    RAISE NOTICE '% lista', v_cuenta.usuario;
  END LOOP;
END;
$$;

COMMIT;

-- Para revisar lo que quedó:
SELECT p.username, p.email, p.role,
       (SELECT count(*) FROM public.productos x WHERE x.creado_por = p.id) AS prendas,
       (SELECT string_agg(e.nombre_fantasia, ', ') FROM public.empresa_miembros m
          JOIN public.empresas e ON e.id = m.empresa_id WHERE m.usuario_id = p.id) AS empresa
  FROM public.profiles p
 WHERE p.username IN ('CompradorDemo', 'VendedorDemo', 'EmpresaDemo');
