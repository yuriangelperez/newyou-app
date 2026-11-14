-- Nadie puede comprarse sus propias prendas.
-- Antes un vendedor (o un miembro de una empresa) podía comprar lo que él mismo publicó:
-- inflaba sus métricas y sus ventas, y la liquidación semanal le pagaba esa "venta".
-- confirmar_compra arma un pedido por vendedor o sede, así que la regla vive en pedidos.
--
-- Correr en el SQL Editor de Supabase después de 28-notificaciones.sql. Para deshacerlo:
--   DROP TRIGGER IF EXISTS pedidos_sin_autocompra ON public.pedidos;
--   DROP FUNCTION IF EXISTS public.pedidos_sin_autocompra();

CREATE OR REPLACE FUNCTION public.pedidos_sin_autocompra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comprador_id = NEW.vendedor_id
     OR (NEW.empresa_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM empresa_miembros m
            WHERE m.empresa_id = NEW.empresa_id AND m.usuario_id = NEW.comprador_id)) THEN
    RAISE EXCEPTION 'No podés comprar tus propias prendas.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_sin_autocompra ON public.pedidos;
CREATE TRIGGER pedidos_sin_autocompra BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_sin_autocompra();
