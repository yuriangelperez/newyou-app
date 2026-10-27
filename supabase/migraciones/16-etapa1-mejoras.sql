-- Mejoras de Etapa 1 (criterios ⚠ e ideas marcadas en el documento).
-- Ejecutar UNA VEZ en el SQL Editor de Supabase, DESPUÉS de 15-vendedores-equipo.sql.
-- La app nueva lee columnas de esta migración (productos.estado): correrla antes de abrirla.
--
-- 1) Usuarios: nombre único sin distinguir mayúsculas, ingreso con nombre de usuario y correo sincronizado.
-- 2) Preferencias de notificaciones en el perfil (correo de compra y promociones).
-- 3) Categorías con grupo e imagen: una categoría nueva con grupo aparece sola en la app.
--    "Pantalones" pasa a ser una categoría propia (antes compartía el id con "Jeans").
-- 4) Borradores: una prenda sin foto no se publica; queda como borrador 7 días y después se borra.
-- 5) confirmar_compra: valida el medio de pago y no vende borradores.
-- 6) compras.correo_enviado_at para no mandar dos veces el correo de la compra.

BEGIN;

-- ===== 1) Usuarios =====

-- Si ya hay nombres repetidos (sin distinguir mayúsculas), se les agrega un número para poder
-- crear el índice único. Cada cambio queda informado en NOTICE.
DO $$
DECLARE
  v_fila record;
  v_nuevo text;
  v_n int;
BEGIN
  FOR v_fila IN
    SELECT id, username
      FROM (SELECT id, username,
                   row_number() OVER (PARTITION BY lower(btrim(username)) ORDER BY created_at, id) AS orden
              FROM public.profiles) AS t
     WHERE orden > 1
  LOOP
    v_n := 2;
    LOOP
      v_nuevo := left(btrim(v_fila.username), 13) || v_n;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(btrim(username)) = lower(v_nuevo));
      v_n := v_n + 1;
    END LOOP;
    UPDATE public.profiles SET username = v_nuevo WHERE id = v_fila.id;
    RAISE NOTICE 'Usuario repetido: "%" pasa a "%"', v_fila.username, v_nuevo;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unico ON public.profiles (lower(btrim(username)));

-- Disponibilidad del nombre al registrarse o editar el perfil (sin exponer datos).
CREATE OR REPLACE FUNCTION public.usuario_disponible(p_usuario text, p_excepto uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles
     WHERE lower(btrim(username)) = lower(btrim(p_usuario))
       AND (p_excepto IS NULL OR id <> p_excepto)
  );
$$;

-- Ingreso con nombre de usuario: devuelve el correo para hacer el login con Supabase Auth.
-- Ojo: permite saber el correo de un nombre de usuario; la contraseña la sigue validando Auth.
CREATE OR REPLACE FUNCTION public.correo_de_usuario(p_usuario text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE lower(btrim(username)) = lower(btrim(p_usuario)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.usuario_disponible(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.correo_de_usuario(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_disponible(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correo_de_usuario(text) TO anon, authenticated;

-- Cuando el usuario confirma un correo nuevo (Editar perfil), profiles.email se actualiza.
CREATE OR REPLACE FUNCTION public.sincronizar_email_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sincronizar_email_perfil();

-- ===== 2) Preferencias =====

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notif_correo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_promos boolean NOT NULL DEFAULT false;

-- ===== 3) Categorías =====

ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS imagen_url text,
  ADD COLUMN IF NOT EXISTS orden int NOT NULL DEFAULT 0;

ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_grupo_valido;
ALTER TABLE public.categorias ADD CONSTRAINT categorias_grupo_valido
  CHECK (grupo IS NULL OR grupo IN ('TORSO', 'PIERNAS', 'INTERIOR', 'ACCESORIOS', 'CALZADO'));

-- Las categorías de la app con su grupo. Las que ya existen conservan su id (y sus prendas);
-- las que faltan (por ejemplo "Pantalones") se crean. Sólo se ven en la app las que tienen grupo.
WITH base (nombre, grupo, orden) AS (
  VALUES ('Camisas', 'TORSO', 1), ('Camperas', 'TORSO', 2), ('Buzos', 'TORSO', 3), ('Vestidos', 'TORSO', 4),
         ('Faldas', 'PIERNAS', 5), ('Pantalones', 'PIERNAS', 6), ('Short', 'PIERNAS', 7), ('Jeans', 'PIERNAS', 8),
         ('Brasieres', 'INTERIOR', 9), ('Boxers', 'INTERIOR', 10),
         ('Cinturones', 'ACCESORIOS', 11), ('Carteras', 'ACCESORIOS', 12), ('Gorras', 'ACCESORIOS', 13),
         ('Lentes', 'ACCESORIOS', 14), ('Mochilas', 'ACCESORIOS', 15),
         ('Botas', 'CALZADO', 16), ('Zapatillas', 'CALZADO', 17), ('Sandalias', 'CALZADO', 18), ('Mocasines', 'CALZADO', 19)
),
actualizadas AS (
  UPDATE public.categorias c
     SET grupo = coalesce(c.grupo, b.grupo), orden = b.orden
    FROM base b
   WHERE lower(c.nombre) = lower(b.nombre)
  RETURNING lower(c.nombre) AS nombre
)
INSERT INTO public.categorias (nombre, grupo, orden)
SELECT b.nombre, b.grupo, b.orden
  FROM base b
 WHERE NOT EXISTS (SELECT 1 FROM public.categorias c WHERE lower(c.nombre) = lower(b.nombre))
   AND lower(b.nombre) NOT IN (SELECT nombre FROM actualizadas);

-- Para sumar una categoría nueva desde Supabase:
--   INSERT INTO categorias (nombre, grupo, imagen_url) VALUES ('Trajes de baño', 'TORSO', 'https://...');

-- ===== 4) Borradores =====

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'publicada',
  ADD COLUMN IF NOT EXISTS borrador_vence timestamptz;

ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_estado_valido;
ALTER TABLE public.productos ADD CONSTRAINT productos_estado_valido CHECK (estado IN ('publicada', 'borrador'));

CREATE INDEX IF NOT EXISTS productos_estado ON public.productos (estado);

-- Sin foto no se publica (al crear, o al pasar de borrador a publicada) y el borrador vence a los 7 días.
-- Las prendas publicadas antes de esta migración sin foto siguen publicadas.
CREATE OR REPLACE FUNCTION public.productos_estado_borrador()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'publicada'
     AND coalesce(NEW.imagen_url, '') = ''
     AND coalesce(cardinality(NEW.imagenes), 0) = 0
     AND (TG_OP = 'INSERT' OR OLD.estado = 'borrador') THEN
    NEW.estado := 'borrador';
  END IF;

  IF NEW.estado = 'borrador' THEN
    IF TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'borrador' OR NEW.borrador_vence IS NULL THEN
      NEW.borrador_vence := now() + interval '7 days';
    END IF;
  ELSE
    NEW.borrador_vence := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_estado_borrador ON public.productos;
CREATE TRIGGER productos_estado_borrador
  BEFORE INSERT OR UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_estado_borrador();

-- Restrictiva (se suma con AND a "Productos son publicos"): los borradores sólo los ve quien los
-- creó o un miembro de la empresa con permiso para publicar.
DROP POLICY IF EXISTS productos_borradores_privados ON public.productos;
CREATE POLICY productos_borradores_privados ON public.productos AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (
    estado = 'publicada'
    OR (auth.uid() IS NOT NULL
        AND (creado_por = auth.uid()
             OR (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'productos.publicar'))))
  );

-- Borra los borradores vencidos. La app la llama al abrir "Mis publicaciones" y pg_cron todos los días.
CREATE OR REPLACE FUNCTION public.limpiar_borradores_vencidos()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_borrados int;
BEGIN
  DELETE FROM productos WHERE estado = 'borrador' AND borrador_vence < now();
  GET DIAGNOSTICS v_borrados = ROW_COUNT;
  RETURN v_borrados;
END;
$$;
REVOKE ALL ON FUNCTION public.limpiar_borradores_vencidos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpiar_borradores_vencidos() TO authenticated;

-- ===== 5) confirmar_compra: medio de pago válido y sin borradores =====
-- Igual que en 13-descuentos.sql, más esas dos validaciones.
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

  -- Los mismos cuatro medios que ofrece la app (el pago es simulado).
  IF p_metodo_pago IS NULL OR p_metodo_pago NOT IN ('Efectivo', 'Tarjeta', 'Mercado Pago', 'Transferencia') THEN
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

  UPDATE compras SET envio = v_envio_total, total = v_subtotal + v_envio_total
   WHERE compraid = v_compra.compraid
  RETURNING * INTO v_compra;

  RETURN v_compra;
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(text, text, text, numeric, jsonb, text) TO authenticated;

-- ===== 6) Correo de la compra =====

ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS correo_enviado_at timestamptz;

COMMIT;

-- ===== Tarea diaria (fuera de la transacción) =====
-- Borra los borradores vencidos todos los días a las 4 AM (UTC). Si pg_cron no está activado
-- (Database > Extensions > pg_cron), sólo avisa: la app igual los borra al abrir Mis publicaciones.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'limpiar-borradores';
  PERFORM cron.schedule('limpiar-borradores', '0 4 * * *', 'SELECT public.limpiar_borradores_vencidos()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible (%): los borradores se limpian desde la app.', SQLERRM;
END;
$$;
