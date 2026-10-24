-- Consulta de sólo lectura para versionar lo que hoy existe sólo en Supabase.
-- Ejecutar en el SQL Editor y guardar el resultado en supabase/migraciones/00-base.sql
-- (como referencia: políticas RLS, funciones y triggers del esquema public).

-- 1) Políticas RLS
SELECT format(
         'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
         policyname, schemaname, tablename, permissive, cmd,
         array_to_string(roles, ', '),
         CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END,
         CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END
       ) AS sentencia
  FROM pg_policies
 WHERE schemaname = 'public'
UNION ALL
-- 2) Tablas con RLS activado
SELECT format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', relname)
  FROM pg_class
 WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity
UNION ALL
-- 3) Funciones
SELECT pg_get_functiondef(p.oid) || ';'
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
UNION ALL
-- 4) Triggers (incluye los de auth.users, como el alta de perfiles)
SELECT pg_get_triggerdef(t.oid) || ';'
  FROM pg_trigger t
 WHERE NOT t.tgisinternal
   AND t.tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace IN ('public'::regnamespace, 'auth'::regnamespace));
