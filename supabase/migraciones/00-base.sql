-- REFERENCIA, NO EJECUTAR. Estado de Supabase al 2026-10-23, antes de 05-particular.sql,
-- exportado con supabase/consultas/exportar-esquema.sql. Las tablas están en .claude/tablas-sql-etapa2.sql.
-- 05-particular.sql limpia las políticas duplicadas marcadas abajo.

-- ===== RLS activado =====
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;   -- sin políticas: nadie la lee ni escribe por la API
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direcciones ENABLE ROW LEVEL SECURITY;

-- ===== productos =====
CREATE POLICY "Productos son publicos" ON public.productos AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden ver productos" ON public.productos AS PERMISSIVE FOR SELECT TO authenticated USING (true);  -- duplicada
CREATE POLICY productos_select_authenticated ON public.productos AS PERMISSIVE FOR SELECT TO authenticated USING (true);               -- duplicada

CREATE POLICY "Vendedores crean sus productos" ON public.productos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((creado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM profiles
    WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'vendedor'::text))))));
CREATE POLICY "Usuarios autenticados pueden crear productos" ON public.productos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = creado_por));   -- anula el control de rol: cualquier comprador puede publicar
CREATE POLICY productos_insert_own ON public.productos AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((creado_por = auth.uid()));   -- ídem

CREATE POLICY "Vendedores editan sus productos" ON public.productos AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((creado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM profiles
    WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'vendedor'::text))))))
  WITH CHECK (((creado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM profiles
    WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'vendedor'::text))))));
CREATE POLICY "Usuarios autenticados pueden actualizar sus productos" ON public.productos AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = creado_por)) WITH CHECK ((auth.uid() = creado_por));   -- duplicada, sin rol
CREATE POLICY productos_update_own ON public.productos AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((creado_por = auth.uid())) WITH CHECK ((creado_por = auth.uid()));   -- duplicada, sin rol

CREATE POLICY "Vendedores eliminan sus productos" ON public.productos AS PERMISSIVE FOR DELETE TO authenticated
  USING (((creado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1 FROM profiles
    WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'vendedor'::text))))));
CREATE POLICY "Usuarios autenticados pueden eliminar sus productos" ON public.productos AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = creado_por));   -- duplicada, sin rol
CREATE POLICY productos_delete_own ON public.productos AS PERMISSIVE FOR DELETE TO authenticated
  USING ((creado_por = auth.uid()));   -- duplicada, sin rol

-- ===== compras =====
CREATE POLICY compras_select_propias ON public.compras AS PERMISSIVE FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));
CREATE POLICY "Los usuarios pueden ver sus compras" ON public.compras AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = usuario_id));  -- duplicada
CREATE POLICY "Los usuarios pueden crear sus compras" ON public.compras AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = usuario_id));   -- permite saltear confirmar_compra (totales y stock arbitrarios)

-- ===== direcciones =====
CREATE POLICY direcciones_propias ON public.direcciones AS PERMISSIVE FOR ALL TO authenticated
  USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));

-- ===== profiles =====
CREATE POLICY "Usuarios leen su perfil" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((id = auth.uid()));
CREATE POLICY "Usuarios actualizan su perfil" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

-- ===== Funciones que no están en otras migraciones =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, username, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data ->> 'username', 'usuario'),
        CASE
            WHEN new.raw_user_meta_data ->> 'role' = 'vendedor' THEN 'vendedor'
            ELSE 'comprador'
        END
    );
    RETURN new;
END;
$function$;

-- Numeración por usuario si numero_orden llega nulo (confirmar_compra siempre lo manda desde la secuencia).
CREATE OR REPLACE FUNCTION public.asignar_numero_orden_compra()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform pg_advisory_xact_lock(hashtextextended(NEW.usuario_id::text, 0));

  if NEW.numero_orden is null then
    select coalesce(max(numero_orden), 0) + 1
      into NEW.numero_orden
    from public.compras
    where usuario_id = NEW.usuario_id;
  end if;

  return NEW;
end;
$function$;

-- confirmar_compra, mis_ventas, direcciones_retiro y productos_direccion_por_defecto
-- coinciden con 03-direcciones.sql, 02-historial.sql y 04-mis-direcciones.sql.

-- ===== Triggers =====
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER asignar_numero_orden_compra_trigger BEFORE INSERT ON public.compras FOR EACH ROW EXECUTE FUNCTION asignar_numero_orden_compra();
CREATE TRIGGER productos_direccion_por_defecto BEFORE INSERT ON public.productos FOR EACH ROW EXECUTE FUNCTION productos_direccion_por_defecto();
