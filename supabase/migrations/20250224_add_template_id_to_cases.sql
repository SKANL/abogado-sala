-- Migration: add_template_id_to_cases
-- SAFE: columna nullable, ON DELETE SET NULL no elimina casos
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS template_id UUID
  REFERENCES public.templates(id)
  ON DELETE SET NULL;

-- Índice para la query de verificación (performance)
CREATE INDEX IF NOT EXISTS idx_cases_template_id ON public.cases(template_id)
  WHERE template_id IS NOT NULL;
