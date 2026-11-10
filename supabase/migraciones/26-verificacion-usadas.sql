-- Verificación de prendas usadas en el panel de administrador.
-- Toda prenda "usado" queda "pendiente" al publicarse (o al cambiar sus fotos) y no se
-- puede comprar hasta que un administrador de la plataforma la apruebe.
-- Anti IA: la base genera un código de 4 dígitos y el vendedor sube una foto de la prenda
-- con ese código escrito a mano (prueba de que la tiene). Plazo: 3 días hábiles.
-- Las usadas que ya estaban publicadas quedan aprobadas para no esconderlas de golpe.
--
-- Correr en el SQL Editor de Supabase después de 25-cercania.sql.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS estado_verificacion text NOT NULL DEFAULT 'no_aplica'
    CHECK (estado_verificacion IN ('no_aplica', 'pendiente', 'aprobada', 'rechazada', 'requiere_cambios')),
  ADD COLUMN IF NOT EXISTS verificacion_codigo text,
  ADD COLUMN IF NOT EXISTS verificacion_foto_url text,
  ADD COLUMN IF NOT EXISTS verificacion_vence_at timestamptz,
  ADD COLUMN IF NOT EXISTS verificacion_motivo text,
  ADD COLUMN IF NOT EXISTS verificado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verificado_at timestamptz;

UPDATE public.productos
   SET estado_verificacion = CASE WHEN condicion = 'usado' THEN 'aprobada' ELSE 'no_aplica' END
 WHERE estado_verificacion = 'no_aplica';

CREATE INDEX IF NOT EXISTS productos_verificacion_cola
  ON public.productos (verificacion_vence_at) WHERE estado_verificacion IN ('pendiente', 'requiere_cambios');

-- Historial de revisiones (quién decidió qué y por qué).
CREATE TABLE IF NOT EXISTS public.verificacion_eventos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id bigint NOT NULL REFERENCES public.productos(productoid) ON DELETE CASCADE,
  estado text NOT NULL,
  motivo text,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verificacion_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verificacion_eventos_lectura ON public.verificacion_eventos;
CREATE POLICY verificacion_eventos_lectura ON public.verificacion_eventos FOR SELECT TO authenticated
  USING (public.es_admin_plataforma() OR public.puede_responder_producto(producto_id));

-- Suma días hábiles (lunes a viernes) a una fecha.
CREATE OR REPLACE FUNCTION public.sumar_dias_habiles(p_desde timestamptz, p_dias int)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v timestamptz := p_desde;
  v_resto int := p_dias;
BEGIN
  WHILE v_resto > 0 LOOP
    v := v + interval '1 day';
    IF extract(isodow FROM v) < 6 THEN
      v_resto := v_resto - 1;
    END IF;
  END LOOP;
  RETURN v;
END;
$$;

-- Al publicar una usada, al pasarla a usada o al cambiarle las fotos: vuelve a la cola.
-- Los campos de verificación sólo los cambian las funciones de abajo (no el vendedor).
CREATE OR REPLACE FUNCTION public.productos_verificacion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_interna boolean := coalesce(current_setting('newyou.verificacion', true), '') = '1';
BEGIN
  IF TG_OP = 'UPDATE' AND NOT v_interna THEN
    NEW.estado_verificacion := OLD.estado_verificacion;
    NEW.verificacion_codigo := OLD.verificacion_codigo;
    NEW.verificacion_foto_url := OLD.verificacion_foto_url;
    NEW.verificacion_vence_at := OLD.verificacion_vence_at;
    NEW.verificacion_motivo := OLD.verificacion_motivo;
    NEW.verificado_por := OLD.verificado_por;
    NEW.verificado_at := OLD.verificado_at;
  END IF;

  IF NEW.condicion IS DISTINCT FROM 'usado' THEN
    NEW.estado_verificacion := 'no_aplica';
  ELSIF TG_OP = 'INSERT'
     OR OLD.condicion IS DISTINCT FROM 'usado'
     OR NEW.imagenes IS DISTINCT FROM OLD.imagenes
     OR NEW.imagen_url IS DISTINCT FROM OLD.imagen_url THEN
    NEW.estado_verificacion := 'pendiente';
    NEW.verificacion_codigo := lpad((floor(random() * 10000))::int::text, 4, '0');
    NEW.verificacion_foto_url := NULL;
    NEW.verificacion_vence_at := public.sumar_dias_habiles(now(), 3);
    NEW.verificacion_motivo := NULL;
    NEW.verificado_por := NULL;
    NEW.verificado_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_verificacion_trigger ON public.productos;
CREATE TRIGGER productos_verificacion_trigger BEFORE INSERT OR UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.productos_verificacion();

-- Una usada sin aprobar no se puede comprar (confirmar_compra inserta pedido_items).
CREATE OR REPLACE FUNCTION public.validar_prenda_verificada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto productos;
BEGIN
  SELECT * INTO v_producto FROM productos WHERE productoid = NEW.producto_id;
  IF FOUND AND v_producto.condicion = 'usado' AND v_producto.estado_verificacion <> 'aprobada' THEN
    RAISE EXCEPTION 'La prenda "%" todavía está en verificación y no se puede comprar.', v_producto.nombre;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_items_verificada ON public.pedido_items;
CREATE TRIGGER pedido_items_verificada BEFORE INSERT ON public.pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.validar_prenda_verificada();

-- El vendedor sube la foto con el código (la imagen ya está en el bucket de productos).
CREATE OR REPLACE FUNCTION public.cargar_foto_verificacion(p_producto bigint, p_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto productos;
BEGIN
  SELECT * INTO v_producto FROM productos WHERE productoid = p_producto;
  IF NOT FOUND OR NOT public.puede_responder_producto(p_producto) THEN
    RAISE EXCEPTION 'No tenés permiso para hacer esto.';
  END IF;
  IF v_producto.estado_verificacion NOT IN ('pendiente', 'requiere_cambios') THEN
    RAISE EXCEPTION 'Esta prenda no está esperando verificación.';
  END IF;
  IF btrim(coalesce(p_url, '')) = '' THEN
    RAISE EXCEPTION 'Falta la foto.';
  END IF;

  PERFORM set_config('newyou.verificacion', '1', true);
  UPDATE productos
     SET verificacion_foto_url = p_url,
         estado_verificacion = 'pendiente',
         -- Si pedimos cambios, el plazo vuelve a correr desde la foto nueva.
         verificacion_vence_at = CASE WHEN v_producto.estado_verificacion = 'requiere_cambios'
                                      THEN public.sumar_dias_habiles(now(), 3)
                                      ELSE v_producto.verificacion_vence_at END
   WHERE productoid = p_producto;
  PERFORM set_config('newyou.verificacion', '', true);

  INSERT INTO verificacion_eventos (producto_id, estado, motivo, actor_id)
  VALUES (p_producto, 'foto_cargada', NULL, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.cargar_foto_verificacion(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cargar_foto_verificacion(bigint, text) TO authenticated;

-- Cola del panel de admin: primero las que vencen antes.
CREATE OR REPLACE FUNCTION public.admin_verificaciones(p_estado text DEFAULT 'pendiente')
RETURNS TABLE (
  producto_id bigint,
  nombre text,
  descripcion text,
  imagenes text[],
  imagen_url text,
  estado text,
  codigo text,
  foto_codigo text,
  vence_at timestamptz,
  vencida boolean,
  motivo text,
  vendedor text,
  publicada_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores de la plataforma.';
  END IF;
  RETURN QUERY
  SELECT p.productoid, p.nombre, p.descripcion, p.imagenes, p.imagen_url, p.estado_verificacion,
         p.verificacion_codigo, p.verificacion_foto_url, p.verificacion_vence_at,
         p.verificacion_vence_at < now(), p.verificacion_motivo,
         coalesce(e.nombre_fantasia, pr.username, u.email)::text,
         (SELECT min(v.created_at) FROM verificacion_eventos v WHERE v.producto_id = p.productoid)
    FROM productos p
    LEFT JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN profiles pr ON pr.id = p.creado_por
    LEFT JOIN auth.users u ON u.id = p.creado_por
   WHERE p.condicion = 'usado'
     AND (p_estado IS NULL OR p.estado_verificacion = p_estado)
   ORDER BY p.verificacion_vence_at NULLS LAST, p.productoid;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_verificaciones(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_verificaciones(text) TO authenticated;

-- Decisión del administrador: aprobada, rechazada o requiere_cambios (con motivo).
CREATE OR REPLACE FUNCTION public.resolver_verificacion(p_producto bigint, p_estado text, p_motivo text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto productos;
  v_destino uuid;
  v_titulo text;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores de la plataforma.';
  END IF;
  IF p_estado NOT IN ('aprobada', 'rechazada', 'requiere_cambios') THEN
    RAISE EXCEPTION 'Estado inválido.';
  END IF;
  IF p_estado <> 'aprobada' AND btrim(coalesce(p_motivo, '')) = '' THEN
    RAISE EXCEPTION 'Indicá el motivo para el vendedor.';
  END IF;
  SELECT * INTO v_producto FROM productos WHERE productoid = p_producto;
  IF NOT FOUND OR v_producto.condicion <> 'usado' THEN
    RAISE EXCEPTION 'La prenda no existe o no es usada.';
  END IF;
  IF p_estado = 'aprobada' AND v_producto.verificacion_foto_url IS NULL THEN
    RAISE EXCEPTION 'El vendedor todavía no subió la foto con el código.';
  END IF;

  PERFORM set_config('newyou.verificacion', '1', true);
  UPDATE productos
     SET estado_verificacion = p_estado,
         verificacion_motivo = nullif(btrim(coalesce(p_motivo, '')), ''),
         verificado_por = auth.uid(),
         verificado_at = now()
   WHERE productoid = p_producto;
  PERFORM set_config('newyou.verificacion', '', true);

  INSERT INTO verificacion_eventos (producto_id, estado, motivo, actor_id)
  VALUES (p_producto, p_estado, nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid());

  -- Aviso al vendedor (o a quienes publican en la empresa).
  v_titulo := CASE p_estado WHEN 'aprobada' THEN 'Prenda verificada'
                            WHEN 'rechazada' THEN 'Prenda rechazada'
                            ELSE 'Faltan datos de tu prenda' END;
  BEGIN
    FOR v_destino IN
      SELECT v_producto.creado_por WHERE v_producto.empresa_id IS NULL
      UNION
      SELECT m.usuario_id FROM empresa_miembros m
        JOIN rol_permisos rp ON rp.rol = m.rol AND rp.permiso = 'productos.publicar'
       WHERE m.empresa_id = v_producto.empresa_id
    LOOP
      PERFORM enviar_push(v_destino, v_titulo,
        format('"%s": %s', v_producto.nombre,
               CASE WHEN p_estado = 'aprobada' THEN 'ya se puede comprar.' ELSE p_motivo END),
        jsonb_build_object('productoId', p_producto, 'tipo', 'verificacion'));
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.resolver_verificacion(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_verificacion(bigint, text, text) TO authenticated;

-- Primer evento de las que entren a la cola (para "publicada el").
CREATE OR REPLACE FUNCTION public.evento_verificacion_inicial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado_verificacion = 'pendiente'
     AND (TG_OP = 'INSERT' OR OLD.estado_verificacion IS DISTINCT FROM 'pendiente'
          OR NEW.verificacion_codigo IS DISTINCT FROM OLD.verificacion_codigo) THEN
    INSERT INTO verificacion_eventos (producto_id, estado, actor_id)
    VALUES (NEW.productoid, 'pendiente', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS productos_verificacion_evento ON public.productos;
CREATE TRIGGER productos_verificacion_evento AFTER INSERT OR UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.evento_verificacion_inicial();
