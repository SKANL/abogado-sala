-- ============================================================
-- 07-storage.sql
-- Storage buckets y políticas del proyecto abogado-sala
-- Ejecutar DESPUÉS de 06-rls.sql
--
-- ⚠️  NOTA IMPORTANTE AL DESPLEGAR:
--     Los buckets se crean manualmente desde el Supabase Dashboard
--     si el comando INSERT falla por permisos. Este script reflect
--     el estado exacto del proyecto de producción (zhmkfftbvwvuqpekfvrx).
-- ============================================================

-- ── Bucket: case-files ────────────────────────────────────────
-- Almacena todos los documentos legales del portal cliente-abogado
-- Privado: acceso controlado vía políticas RLS de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-files',
  'case-files',
  false,        -- privado, acceso solo via signed URLs o RLS
  52428800,     -- 50 MB por archivo
  NULL          -- sin restricción de MIME type
)
ON CONFLICT (id) DO NOTHING;

-- ── Bucket: organization-assets ───────────────────────────────
-- Logos, imágenes de marca de las organizaciones
-- Público: los logos son accesibles sin autenticación
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-assets',
  'organization-assets',
  true,   -- público, assets de branding accesibles por todos
  NULL,   -- sin límite de tamaño
  NULL    -- sin restricción de MIME type
)
ON CONFLICT (id) DO NOTHING;

-- ── Bucket: zip-exports ───────────────────────────────────────
-- Exportaciones ZIP generadas por el job de descarga de expedientes
-- Privado: solo accesible por service_role
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zip-exports',
  'zip-exports',
  false,      -- privado
  1073741824, -- 1 GB
  ARRAY['application/zip']
)
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- Políticas de Storage: case-files
-- ══════════════════════════════════════════════════════════════

-- Staff (usuarios autenticados) tienen acceso completo a case-files
CREATE POLICY "Staff can do everything on case files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'case-files')
  WITH CHECK (bucket_id = 'case-files');

-- Portal anónimo (clientes sin login) puede ver archivos de sus casos
CREATE POLICY "Portal users can select case files"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'case-files');

-- Portal anónimo puede subir archivos
CREATE POLICY "Portal users can upload case files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'case-files');

-- Portal anónimo puede actualizar archivos (re-subir rechazados)
CREATE POLICY "Portal users can update case files"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'case-files');


-- ══════════════════════════════════════════════════════════════
-- Políticas de Storage: organization-assets
-- ══════════════════════════════════════════════════════════════

-- Lectura pública (logos de orgs visibles para todos)
CREATE POLICY "Public Read for Org Assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organization-assets');

-- Usuarios autenticados pueden subir assets de org
CREATE POLICY "Auth users can upload org assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');

-- Usuarios autenticados pueden actualizar assets de org
CREATE POLICY "Auth users can update org assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');

-- Usuarios autenticados pueden eliminar assets de org
CREATE POLICY "Auth users can delete org assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');


-- ══════════════════════════════════════════════════════════════
-- Políticas de Storage: zip-exports
-- ══════════════════════════════════════════════════════════════

-- Solo service_role puede acceder a los ZIP exports (generados por Edge Functions)
CREATE POLICY "Service Role Full Access"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'zip-exports')
  WITH CHECK (bucket_id = 'zip-exports');
