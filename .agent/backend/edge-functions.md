# Edge Functions & Webhooks - Abogado Sala

Lógica servidora que corre fuera del ciclo normal de CRUD.

## 1. Webhooks (External Events)

### `stripe-webhooks`

Maneja eventos de facturación.

- `customer.subscription.updated`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Acción**: Actualizar `organizations.plan_tier` y `plan_status`.
**Seguridad**: Validar Stripe Signature.

---

## 2. Scheduled Jobs (Cron)

### `cleanup-expired-rooms`

Corre cada noche.

- Busca `cases` con `status = 'draft'` > 30 días.
- Marca como abandonados o envía recordatorio.

---

## 3. Server-Side Features (Optional)

### `generate-signed-urls`

Para descargas seguras en Storage.

- En lugar de hacer buckets públicos, generamos URLs firmadas con TTL (Time To Live) de 1 hora.

### `whatsapp-bridge`

Si decidimos integrar API oficial (Meta) en el futuro.

- Actualmente es Client-Side (`wa.me` link), así que **no se requiere backend** por ahora.
