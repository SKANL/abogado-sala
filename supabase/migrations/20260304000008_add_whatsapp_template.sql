-- Add customizable WhatsApp message template to organizations.
-- Variables supported: {client_name}, {org_name}, {link}

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_template TEXT
    DEFAULT 'Hola {client_name} 👋, te compartimos el enlace para acceder a tu expediente en el portal de *{org_name}*:

{link}

Por favor revisa los documentos y completa la información solicitada. ¡Estamos para apoyarte!';
