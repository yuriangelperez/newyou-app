-- Efectivo solo para retiro en el local.
-- El efectivo se paga en mano al retirar la prenda. Si la compra es con envío a
-- domicilio, sólo se acepta tarjeta de crédito, tarjeta de débito o Mercado Pago.
-- La app ya deshabilita la opción, pero la regla vive acá para que no se pueda saltear.
--
-- Correr en el SQL Editor de Supabase después de 20-metricas-por-hora.sql.

CREATE OR REPLACE FUNCTION public.validar_efectivo_solo_retiro()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.metodo_pago = 'Efectivo' AND NEW.entrega = 'domicilio' THEN
    RAISE EXCEPTION 'El pago en efectivo es solo para retiro en el local. Para envíos a domicilio pagá con tarjeta o Mercado Pago.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_efectivo_solo_retiro_trigger ON public.compras;
CREATE TRIGGER validar_efectivo_solo_retiro_trigger BEFORE INSERT ON public.compras
  FOR EACH ROW EXECUTE FUNCTION public.validar_efectivo_solo_retiro();
