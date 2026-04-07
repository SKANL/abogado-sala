-- ============================================================
-- 00-extensions.sql
-- Extensiones requeridas por el proyecto abogado-sala
-- Ejecutar PRIMERO antes que cualquier otra migración
-- ============================================================

-- Búsqueda por similitud de texto (usado en búsqueda de clientes/casos)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

-- Búsqueda semántica / embeddings (preparado para AI features)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- HTTP requests desde triggers (usado por process-zip-job)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Net requests async (alternativa a http para edge functions)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
