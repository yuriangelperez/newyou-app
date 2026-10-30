-- Alinea la base de datos con el contrato actual de la app:
-- 1) publico puede recibir una o varias opciones (Femenino, Masculino, etc.)
-- 2) condicion acepta nuevo/usado
--
-- Si la tabla ya existe con un tipo/scalar viejo, esta migración lo corrige.

ALTER TABLE public.productos
  DROP CONSTRAINT IF EXISTS productos_publico_valido,
  DROP CONSTRAINT IF EXISTS productos_publico_check,
  DROP CONSTRAINT IF EXISTS productos_publico_valida;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'productos'
      AND column_name = 'publico'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.productos
      ALTER COLUMN publico TYPE text[] USING (
        CASE
          WHEN publico IS NULL OR publico = '' THEN '{}'::text[]
          ELSE ARRAY[publico]
        END
      );
  END IF;
END $$;

UPDATE public.productos
SET publico = ARRAY['Adulto']
WHERE publico IS NULL OR cardinality(publico) = 0;

ALTER TABLE public.productos
  ADD CONSTRAINT productos_publico_valido
  CHECK (
    cardinality(publico) > 0
    AND publico <@ ARRAY['Adulto', 'Femenino', 'Masculino', 'Infantil', 'Unisex']::text[]
  );

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS condicion text NOT NULL DEFAULT 'nuevo';

UPDATE public.productos
SET condicion = 'nuevo'
WHERE condicion IS NULL OR condicion NOT IN ('nuevo', 'usado');

ALTER TABLE public.productos
  DROP CONSTRAINT IF EXISTS productos_condicion_valida,
  DROP CONSTRAINT IF EXISTS productos_condicion_check;

ALTER TABLE public.productos
  ADD CONSTRAINT productos_condicion_valida CHECK (condicion IN ('nuevo', 'usado'));

CREATE INDEX IF NOT EXISTS productos_condicion ON public.productos (condicion);
