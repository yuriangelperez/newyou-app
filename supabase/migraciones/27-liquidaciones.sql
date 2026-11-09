-- Liquidaciones semanales, datos bancarios, reclamos y cargos al vendedor.
-- New You cobra tarjeta y Mercado Pago y le paga a cada vendedor (particular o empresa)
-- una vez por semana: ventas cobradas online − comisión 10% − comisión de las ventas en
-- efectivo − cargos + saldo negativo de la semana anterior.
-- Un pedido entra a la liquidación de la semana en que se entregó, salvo que tenga un
-- reclamo abierto (espera a que se resuelva). Cada pedido se liquida una sola vez.
-- Reclamo resuelto a favor del comprador: cargo administrativo 10% del pedido y, si se
-- cobró online, el reintegro al comprador también se descuenta al vendedor.
--
-- Correr en el SQL Editor de Supabase después de 26-verificacion-usadas.sql.

-- ===== 1) Datos bancarios =====
CREATE OR REPLACE FUNCTION public.cbu_valido(p_cbu text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_p1 int[] := ARRAY[7, 1, 3, 9, 7, 1, 3];
  v_p2 int[] := ARRAY[3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
  v_suma int := 0;
BEGIN
  IF p_cbu !~ '^\d{22}$' THEN
    RETURN false;
  END IF;
  FOR i IN 1..7 LOOP
    v_suma := v_suma + substr(p_cbu, i, 1)::int * v_p1[i];
  END LOOP;
  IF (10 - v_suma % 10) % 10 <> substr(p_cbu, 8, 1)::int THEN
    RETURN false;
  END IF;
  v_suma := 0;
  FOR i IN 1..13 LOOP
    v_suma := v_suma + substr(p_cbu, 8 + i, 1)::int * v_p2[i];
  END LOOP;
  RETURN (10 - v_suma % 10) % 10 = substr(p_cbu, 22, 1)::int;
END;
$$;

CREATE TABLE IF NOT EXISTS public.datos_bancarios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id bigint REFERENCES public.empresas(id) ON DELETE CASCADE,
  titular text NOT NULL CHECK (char_length(btrim(titular)) > 2),
  cuit text NOT NULL CHECK (public.cuit_valido(cuit)),
  cbu text NOT NULL CHECK (public.cbu_valido(cbu)),
  alias text CHECK (alias IS NULL OR alias ~ '^[A-Za-z0-9.\-]{6,20}$'),
  banco text,
  -- Un cambio de cuenta frena los pagos 48 h (por si alguien entró a la cuenta del vendedor).
  retener_hasta timestamptz,
  actualizado_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((usuario_id IS NULL) <> (empresa_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS datos_bancarios_usuario ON public.datos_bancarios (usuario_id) WHERE usuario_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS datos_bancarios_empresa ON public.datos_bancarios (empresa_id) WHERE empresa_id IS NOT NULL;

ALTER TABLE public.datos_bancarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS datos_bancarios_lectura ON public.datos_bancarios;
CREATE POLICY datos_bancarios_lectura ON public.datos_bancarios FOR SELECT TO authenticated
  USING (usuario_id = auth.uid()
         OR (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'empresa.editar'))
         OR public.es_admin_plataforma());
-- Sin políticas de escritura: se guarda con guardar_datos_bancarios.

CREATE OR REPLACE FUNCTION public.guardar_datos_bancarios(
  p_empresa bigint, p_titular text, p_cuit text, p_cbu text, p_alias text, p_banco text
) RETURNS public.datos_bancarios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual public.datos_bancarios;
  v_fila public.datos_bancarios;
  v_cuit text := regexp_replace(coalesce(p_cuit, ''), '\D', '', 'g');
  v_cbu text := regexp_replace(coalesce(p_cbu, ''), '\D', '', 'g');
  v_alias text := nullif(btrim(coalesce(p_alias, '')), '');
  v_cuit_empresa text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión.';
  END IF;
  IF p_empresa IS NOT NULL AND NOT public.tiene_permiso(p_empresa, 'empresa.editar') THEN
    RAISE EXCEPTION 'Sólo el propietario o un administrador de la empresa carga la cuenta bancaria.';
  END IF;
  IF NOT public.cuit_valido(v_cuit) THEN
    RAISE EXCEPTION 'El CUIT/CUIL no es válido.';
  END IF;
  IF NOT public.cbu_valido(v_cbu) THEN
    RAISE EXCEPTION 'El CBU/CVU no es válido. Revisá los 22 números.';
  END IF;
  IF p_empresa IS NOT NULL THEN
    SELECT cuit INTO v_cuit_empresa FROM empresas WHERE id = p_empresa;
    IF v_cuit_empresa <> v_cuit THEN
      RAISE EXCEPTION 'La cuenta tiene que estar a nombre de la empresa (mismo CUIT).';
    END IF;
  END IF;

  SELECT * INTO v_actual FROM datos_bancarios
   WHERE (p_empresa IS NULL AND usuario_id = auth.uid()) OR (p_empresa IS NOT NULL AND empresa_id = p_empresa);

  IF FOUND THEN
    UPDATE datos_bancarios
       SET titular = btrim(p_titular), cuit = v_cuit, cbu = v_cbu, alias = v_alias,
           banco = nullif(btrim(coalesce(p_banco, '')), ''),
           retener_hasta = CASE WHEN v_actual.cbu <> v_cbu THEN now() + interval '48 hours' ELSE v_actual.retener_hasta END,
           actualizado_at = now()
     WHERE id = v_actual.id
    RETURNING * INTO v_fila;
  ELSE
    INSERT INTO datos_bancarios (usuario_id, empresa_id, titular, cuit, cbu, alias, banco)
    VALUES (CASE WHEN p_empresa IS NULL THEN auth.uid() END, p_empresa, btrim(p_titular), v_cuit, v_cbu, v_alias,
            nullif(btrim(coalesce(p_banco, '')), ''))
    RETURNING * INTO v_fila;
  END IF;
  RETURN v_fila;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_datos_bancarios(bigint, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_datos_bancarios(bigint, text, text, text, text, text) TO authenticated;

-- ===== 2) Reclamos y cargos =====
CREATE TABLE IF NOT EXISTS public.reclamos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  comprador_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  motivo text NOT NULL CHECK (motivo IN ('no_llego', 'distinto', 'defectuoso', 'otro')),
  descripcion text NOT NULL CHECK (char_length(btrim(descripcion)) BETWEEN 10 AND 1000),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'a_favor_comprador', 'a_favor_vendedor')),
  resolucion text,
  resuelto_por uuid REFERENCES auth.users(id),
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reclamos_uno_abierto ON public.reclamos (pedido_id) WHERE estado = 'abierto';

CREATE TABLE IF NOT EXISTS public.cargos_vendedor (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendedor_id uuid REFERENCES auth.users(id),
  empresa_id bigint REFERENCES public.empresas(id),
  pedido_id bigint REFERENCES public.pedidos(id) ON DELETE SET NULL,
  reclamo_id bigint REFERENCES public.reclamos(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('cargo_reclamo', 'reintegro', 'ajuste')),
  monto numeric NOT NULL CHECK (monto > 0),
  motivo text NOT NULL,
  liquidacion_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((vendedor_id IS NULL) <> (empresa_id IS NULL))
);

ALTER TABLE public.reclamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos_vendedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reclamos_lectura ON public.reclamos;
CREATE POLICY reclamos_lectura ON public.reclamos FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(pedido_id) OR public.es_admin_plataforma());

DROP POLICY IF EXISTS cargos_lectura ON public.cargos_vendedor;
CREATE POLICY cargos_lectura ON public.cargos_vendedor FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid()
         OR (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'empresa.editar'))
         OR public.es_admin_plataforma());

-- Momento en que se entregó un pedido (último evento "entregado").
CREATE OR REPLACE FUNCTION public.pedido_entregado_at(p_pedido bigint)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(created_at) FROM pedido_eventos WHERE pedido_id = p_pedido AND estado_nuevo = 'entregado';
$$;

CREATE OR REPLACE FUNCTION public.abrir_reclamo(p_pedido bigint, p_motivo text, p_descripcion text)
RETURNS public.reclamos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos;
  v_reclamo public.reclamos;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido;
  IF NOT FOUND OR v_pedido.comprador_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sólo quien compró puede hacer un reclamo.';
  END IF;
  IF v_pedido.estado NOT IN ('enviado', 'listo_para_retirar', 'entregado') THEN
    RAISE EXCEPTION 'Podés hacer un reclamo cuando el pedido fue enviado o entregado.';
  END IF;
  IF v_pedido.estado = 'entregado' AND public.pedido_entregado_at(p_pedido) < now() - interval '10 days' THEN
    RAISE EXCEPTION 'Pasaron más de 10 días desde la entrega.';
  END IF;
  IF EXISTS (SELECT 1 FROM reclamos WHERE pedido_id = p_pedido AND estado = 'abierto') THEN
    RAISE EXCEPTION 'Ya hay un reclamo abierto para este pedido.';
  END IF;

  INSERT INTO reclamos (pedido_id, comprador_id, motivo, descripcion)
  VALUES (p_pedido, auth.uid(), p_motivo, btrim(p_descripcion))
  RETURNING * INTO v_reclamo;

  -- Queda en el chat del pedido para que el vendedor lo vea y responda.
  INSERT INTO mensajes_pedido (pedido_id, texto, sistema)
  VALUES (p_pedido, 'El comprador abrió un reclamo: ' || btrim(p_descripcion)
                    || ' El vendedor tiene 48 horas para responder por este chat.', true);
  RETURN v_reclamo;
END;
$$;
REVOKE ALL ON FUNCTION public.abrir_reclamo(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abrir_reclamo(bigint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reclamos(p_estado text DEFAULT 'abierto')
RETURNS TABLE (
  reclamo_id bigint, pedido_id bigint, motivo text, descripcion text, estado text, resolucion text,
  created_at timestamptz, total numeric, metodo_pago text, comprador text, vendedor text
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
  SELECT r.id, r.pedido_id, r.motivo, r.descripcion, r.estado, r.resolucion, r.created_at, p.total,
         c.metodo_pago, pc.username::text, coalesce(e.nombre_fantasia, pv.username)::text
    FROM reclamos r
    JOIN pedidos p ON p.id = r.pedido_id
    JOIN compras c ON c.compraid = p.compra_id
    LEFT JOIN profiles pc ON pc.id = p.comprador_id
    LEFT JOIN profiles pv ON pv.id = p.vendedor_id
    LEFT JOIN empresas e ON e.id = p.empresa_id
   WHERE p_estado IS NULL OR r.estado = p_estado
   ORDER BY r.created_at;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_reclamos(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reclamos(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolver_reclamo(p_reclamo bigint, p_a_favor text, p_resolucion text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reclamo reclamos;
  v_pedido pedidos;
  v_compra compras;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores de la plataforma.';
  END IF;
  IF p_a_favor NOT IN ('comprador', 'vendedor') THEN
    RAISE EXCEPTION 'Indicá a favor de quién se resuelve.';
  END IF;
  IF btrim(coalesce(p_resolucion, '')) = '' THEN
    RAISE EXCEPTION 'Escribí la resolución (la ven las dos partes).';
  END IF;
  SELECT * INTO v_reclamo FROM reclamos WHERE id = p_reclamo FOR UPDATE;
  IF NOT FOUND OR v_reclamo.estado <> 'abierto' THEN
    RAISE EXCEPTION 'El reclamo no existe o ya se resolvió.';
  END IF;
  SELECT * INTO v_pedido FROM pedidos WHERE id = v_reclamo.pedido_id;
  SELECT * INTO v_compra FROM compras WHERE compraid = v_pedido.compra_id;

  UPDATE reclamos
     SET estado = 'a_favor_' || p_a_favor, resolucion = btrim(p_resolucion),
         resuelto_por = auth.uid(), resuelto_at = now()
   WHERE id = p_reclamo;

  IF p_a_favor = 'comprador' THEN
    INSERT INTO cargos_vendedor (vendedor_id, empresa_id, pedido_id, reclamo_id, tipo, monto, motivo)
    VALUES (v_pedido.vendedor_id, v_pedido.empresa_id, v_pedido.id, p_reclamo, 'cargo_reclamo',
            round(v_pedido.total * 0.10, 2), format('Cargo administrativo 10%% por reclamo del pedido #%s', v_pedido.id));
    -- Si New You cobró el pedido, le devuelve la plata al comprador y la descuenta al vendedor.
    IF v_compra.estado_pago = 'aprobado' THEN
      INSERT INTO cargos_vendedor (vendedor_id, empresa_id, pedido_id, reclamo_id, tipo, monto, motivo)
      VALUES (v_pedido.vendedor_id, v_pedido.empresa_id, v_pedido.id, p_reclamo, 'reintegro',
              v_pedido.subtotal + v_pedido.envio, format('Reintegro al comprador del pedido #%s', v_pedido.id));
    END IF;
  END IF;

  INSERT INTO mensajes_pedido (pedido_id, texto, sistema)
  VALUES (v_pedido.id, format('New You resolvió el reclamo a favor del %s: %s', p_a_favor, btrim(p_resolucion)), true);
END;
$$;
REVOKE ALL ON FUNCTION public.resolver_reclamo(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_reclamo(bigint, text, text) TO authenticated;

-- ===== 3) Liquidaciones =====
CREATE TABLE IF NOT EXISTS public.liquidaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendedor_id uuid REFERENCES auth.users(id),
  empresa_id bigint REFERENCES public.empresas(id),
  semana_inicio date NOT NULL,
  ventas_online numeric NOT NULL DEFAULT 0,
  comision numeric NOT NULL DEFAULT 0,
  comision_efectivo numeric NOT NULL DEFAULT 0,
  cargos numeric NOT NULL DEFAULT 0,
  saldo_anterior numeric NOT NULL DEFAULT 0,
  neto numeric NOT NULL DEFAULT 0,
  pedidos int NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'retenida', 'saldo_negativo')),
  motivo_retencion text,
  -- Copia de la cuenta al momento de liquidar.
  titular text,
  cuit text,
  cbu text,
  alias text,
  comprobante text,
  pagada_at timestamptz,
  pagada_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((vendedor_id IS NULL) <> (empresa_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS liquidaciones_semana
  ON public.liquidaciones (coalesce(vendedor_id::text, 'e' || empresa_id::text), semana_inicio);

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS liquidacion_id bigint REFERENCES public.liquidaciones(id);
ALTER TABLE public.cargos_vendedor
  DROP CONSTRAINT IF EXISTS cargos_vendedor_liquidacion_fk,
  ADD CONSTRAINT cargos_vendedor_liquidacion_fk FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones(id);

ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS liquidaciones_lectura ON public.liquidaciones;
CREATE POLICY liquidaciones_lectura ON public.liquidaciones FOR SELECT TO authenticated
  USING (vendedor_id = auth.uid()
         OR (empresa_id IS NOT NULL AND public.tiene_permiso(empresa_id, 'empresa.editar'))
         OR public.es_admin_plataforma());

-- Genera las liquidaciones de la semana que empieza el lunes p_semana (idempotente:
-- una semana ya generada no se vuelve a generar).
CREATE OR REPLACE FUNCTION public.generar_liquidaciones(p_semana date)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio date := date_trunc('week', p_semana)::date;
  v_fin timestamptz := (date_trunc('week', p_semana) + interval '7 days');
  v_grupo record;
  v_liq public.liquidaciones;
  v_cuenta public.datos_bancarios;
  v_saldo numeric;
  v_cargos numeric;
  v_neto numeric;
  v_creadas int := 0;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores de la plataforma.';
  END IF;
  IF v_fin > now() THEN
    RAISE EXCEPTION 'La semana todavía no terminó.';
  END IF;

  FOR v_grupo IN
    WITH candidatos AS (
      SELECT p.id, p.vendedor_id, p.empresa_id, p.subtotal, p.envio, c.estado_pago, c.metodo_pago
        FROM pedidos p
        JOIN compras c ON c.compraid = p.compra_id
       WHERE p.estado = 'entregado'
         AND p.liquidacion_id IS NULL
         AND public.pedido_entregado_at(p.id) < v_fin
         AND NOT EXISTS (SELECT 1 FROM reclamos r WHERE r.pedido_id = p.id AND r.estado = 'abierto')
         AND (c.estado_pago = 'aprobado' OR c.metodo_pago = 'Efectivo')
    ),
    beneficiarios AS (
      SELECT vendedor_id, empresa_id FROM candidatos
      UNION
      SELECT vendedor_id, empresa_id FROM cargos_vendedor WHERE liquidacion_id IS NULL AND created_at < v_fin
    )
    SELECT b.vendedor_id, b.empresa_id,
           coalesce((SELECT sum(subtotal + envio) FROM candidatos k
                      WHERE k.vendedor_id IS NOT DISTINCT FROM b.vendedor_id AND k.empresa_id IS NOT DISTINCT FROM b.empresa_id
                        AND k.estado_pago = 'aprobado'), 0) AS ventas,
           coalesce((SELECT sum(round(subtotal * 0.10, 2)) FROM candidatos k
                      WHERE k.vendedor_id IS NOT DISTINCT FROM b.vendedor_id AND k.empresa_id IS NOT DISTINCT FROM b.empresa_id
                        AND k.estado_pago = 'aprobado'), 0) AS comision,
           coalesce((SELECT sum(round(subtotal * 0.10, 2)) FROM candidatos k
                      WHERE k.vendedor_id IS NOT DISTINCT FROM b.vendedor_id AND k.empresa_id IS NOT DISTINCT FROM b.empresa_id
                        AND k.metodo_pago = 'Efectivo'), 0) AS comision_efectivo,
           (SELECT count(*) FROM candidatos k
             WHERE k.vendedor_id IS NOT DISTINCT FROM b.vendedor_id AND k.empresa_id IS NOT DISTINCT FROM b.empresa_id) AS cantidad
      FROM beneficiarios b
  LOOP
    -- Ya liquidada esta semana: se saltea.
    IF EXISTS (SELECT 1 FROM liquidaciones l
                WHERE l.semana_inicio = v_inicio
                  AND l.vendedor_id IS NOT DISTINCT FROM v_grupo.vendedor_id
                  AND l.empresa_id IS NOT DISTINCT FROM v_grupo.empresa_id) THEN
      CONTINUE;
    END IF;

    SELECT coalesce(sum(monto), 0) INTO v_cargos FROM cargos_vendedor
     WHERE liquidacion_id IS NULL AND created_at < v_fin
       AND vendedor_id IS NOT DISTINCT FROM v_grupo.vendedor_id AND empresa_id IS NOT DISTINCT FROM v_grupo.empresa_id;

    -- Saldo negativo de la última liquidación (se arrastra).
    SELECT least(l.neto, 0) INTO v_saldo FROM liquidaciones l
     WHERE l.vendedor_id IS NOT DISTINCT FROM v_grupo.vendedor_id AND l.empresa_id IS NOT DISTINCT FROM v_grupo.empresa_id
     ORDER BY l.semana_inicio DESC LIMIT 1;
    v_saldo := coalesce(v_saldo, 0);

    v_neto := v_grupo.ventas - v_grupo.comision - v_grupo.comision_efectivo - v_cargos + v_saldo;

    SELECT * INTO v_cuenta FROM datos_bancarios d
     WHERE (v_grupo.empresa_id IS NULL AND d.usuario_id = v_grupo.vendedor_id)
        OR (v_grupo.empresa_id IS NOT NULL AND d.empresa_id = v_grupo.empresa_id);

    INSERT INTO liquidaciones (vendedor_id, empresa_id, semana_inicio, ventas_online, comision, comision_efectivo,
                               cargos, saldo_anterior, neto, pedidos, estado, motivo_retencion,
                               titular, cuit, cbu, alias)
    VALUES (v_grupo.vendedor_id, v_grupo.empresa_id, v_inicio, v_grupo.ventas, v_grupo.comision, v_grupo.comision_efectivo,
            v_cargos, v_saldo, v_neto, v_grupo.cantidad,
            CASE WHEN v_neto <= 0 THEN 'saldo_negativo'
                 WHEN v_cuenta.id IS NULL OR v_cuenta.retener_hasta > now() THEN 'retenida'
                 ELSE 'pendiente' END,
            CASE WHEN v_neto <= 0 THEN NULL
                 WHEN v_cuenta.id IS NULL THEN 'El vendedor no cargó sus datos bancarios.'
                 WHEN v_cuenta.retener_hasta > now() THEN 'Cambió el CBU hace menos de 48 horas.'
                 END,
            v_cuenta.titular, v_cuenta.cuit, v_cuenta.cbu, v_cuenta.alias)
    RETURNING * INTO v_liq;

    UPDATE pedidos p SET liquidacion_id = v_liq.id
      FROM compras c
     WHERE c.compraid = p.compra_id
       AND p.estado = 'entregado' AND p.liquidacion_id IS NULL
       AND public.pedido_entregado_at(p.id) < v_fin
       AND NOT EXISTS (SELECT 1 FROM reclamos r WHERE r.pedido_id = p.id AND r.estado = 'abierto')
       AND (c.estado_pago = 'aprobado' OR c.metodo_pago = 'Efectivo')
       AND p.vendedor_id IS NOT DISTINCT FROM v_grupo.vendedor_id AND p.empresa_id IS NOT DISTINCT FROM v_grupo.empresa_id;

    UPDATE cargos_vendedor SET liquidacion_id = v_liq.id
     WHERE liquidacion_id IS NULL AND created_at < v_fin
       AND vendedor_id IS NOT DISTINCT FROM v_grupo.vendedor_id AND empresa_id IS NOT DISTINCT FROM v_grupo.empresa_id;

    v_creadas := v_creadas + 1;
  END LOOP;
  RETURN v_creadas;
END;
$$;
REVOKE ALL ON FUNCTION public.generar_liquidaciones(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generar_liquidaciones(date) TO authenticated;

-- Liquidaciones de una semana para el panel de admin (con el nombre del vendedor).
CREATE OR REPLACE FUNCTION public.admin_liquidaciones(p_semana date)
RETURNS TABLE (
  id bigint, beneficiario text, es_empresa boolean, ventas_online numeric, comision numeric,
  comision_efectivo numeric, cargos numeric, saldo_anterior numeric, neto numeric, pedidos int,
  estado text, motivo_retencion text, titular text, cuit text, cbu text, alias text, comprobante text, pagada_at timestamptz
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
  SELECT l.id, coalesce(e.nombre_fantasia, pr.username)::text, l.empresa_id IS NOT NULL,
         l.ventas_online, l.comision, l.comision_efectivo, l.cargos, l.saldo_anterior, l.neto, l.pedidos,
         l.estado, l.motivo_retencion, l.titular, l.cuit, l.cbu, l.alias, l.comprobante, l.pagada_at
    FROM liquidaciones l
    LEFT JOIN empresas e ON e.id = l.empresa_id
    LEFT JOIN profiles pr ON pr.id = l.vendedor_id
   WHERE l.semana_inicio = date_trunc('week', p_semana)::date
   ORDER BY l.estado, l.neto DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_liquidaciones(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_liquidaciones(date) TO authenticated;

-- El admin registra la transferencia hecha (o reintenta una retenida con datos ya cargados).
CREATE OR REPLACE FUNCTION public.marcar_liquidacion_pagada(p_liquidacion bigint, p_comprobante text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liq liquidaciones;
  v_cuenta datos_bancarios;
BEGIN
  IF NOT public.es_admin_plataforma() THEN
    RAISE EXCEPTION 'Sólo para administradores de la plataforma.';
  END IF;
  IF btrim(coalesce(p_comprobante, '')) = '' THEN
    RAISE EXCEPTION 'Ingresá el número de comprobante de la transferencia.';
  END IF;
  SELECT * INTO v_liq FROM liquidaciones WHERE id = p_liquidacion FOR UPDATE;
  IF NOT FOUND OR v_liq.estado NOT IN ('pendiente', 'retenida') THEN
    RAISE EXCEPTION 'Esta liquidación no se puede pagar.';
  END IF;
  -- Una retenida se paga sólo si ya tiene cuenta y pasaron las 48 h del cambio.
  SELECT * INTO v_cuenta FROM datos_bancarios d
   WHERE (v_liq.empresa_id IS NULL AND d.usuario_id = v_liq.vendedor_id) OR d.empresa_id = v_liq.empresa_id;
  IF v_cuenta.id IS NULL OR v_cuenta.retener_hasta > now() THEN
    RAISE EXCEPTION 'El vendedor no tiene una cuenta habilitada para cobrar.';
  END IF;

  UPDATE liquidaciones
     SET estado = 'pagada', comprobante = btrim(p_comprobante), pagada_at = now(), pagada_por = auth.uid(),
         motivo_retencion = NULL, titular = v_cuenta.titular, cuit = v_cuenta.cuit, cbu = v_cuenta.cbu, alias = v_cuenta.alias
   WHERE id = p_liquidacion;
END;
$$;
REVOKE ALL ON FUNCTION public.marcar_liquidacion_pagada(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_liquidacion_pagada(bigint, text) TO authenticated;
