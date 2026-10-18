-- Historial de compras y ventas. Ejecutar UNA VEZ en el SQL Editor de Supabase.

-- Cada usuario puede leer sus propias compras.
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compras_select_propias ON public.compras;
CREATE POLICY compras_select_propias ON public.compras
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

-- Ventas del vendedor: compras que incluyen productos creados por él.
-- SECURITY DEFINER porque el vendedor no puede leer compras ajenas por RLS;
-- sólo devuelve SUS ítems y el nombre del comprador.
CREATE OR REPLACE FUNCTION public.mis_ventas()
RETURNS TABLE (
  compraid bigint,
  numero_orden integer,
  created_at timestamptz,
  entrega text,
  metodo_pago text,
  comprador text,
  items jsonb,
  total_vendedor numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.compraid, c.numero_orden, c.created_at, c.entrega, c.metodo_pago,
         p.username,
         jsonb_agg(i.item),
         sum((i.item->>'precio')::numeric * (i.item->>'cantidad')::int)
    FROM public.compras c
    CROSS JOIN LATERAL jsonb_array_elements(c.items) AS i(item)
    JOIN public.productos pr
      ON pr.productoid = (i.item->>'productoId')::bigint
     AND pr.creado_por = auth.uid()
    LEFT JOIN public.profiles p ON p.id = c.usuario_id
   GROUP BY c.compraid, p.username
   ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.mis_ventas() TO authenticated;
