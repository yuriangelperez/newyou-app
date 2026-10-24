-- Hasta 5 imágenes por prenda. Ejecutar UNA VEZ en el SQL Editor de Supabase (después de 08).
-- La primera de `imagenes` es la principal y se copia en `imagen_url` (la usan las tarjetas y el carrito).

BEGIN;

-- Publicaciones viejas: si no tienen `imagenes`, se completa con `imagen_url`; si tienen más de 5, se recortan.
UPDATE public.productos
   SET imagenes = ARRAY[imagen_url]
 WHERE cardinality(imagenes) = 0 AND btrim(coalesce(imagen_url, '')) <> '';

UPDATE public.productos
   SET imagenes = imagenes[1:5]
 WHERE cardinality(imagenes) > 5;

ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_maximo_5_imagenes;
ALTER TABLE public.productos
  ADD CONSTRAINT productos_maximo_5_imagenes CHECK (cardinality(imagenes) <= 5);

COMMIT;
