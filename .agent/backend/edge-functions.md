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

Para descargas y subidas seguras en Storage.

- En lugar de hacer buckets públicos, generamos URLs firmadas con TTL de 1 hora.
- **Validación Crítica (Billing Race)**:
  1. Antes de generar Signed URL de subida (`PUT`):
  2. Calcular `Projected Usage` = `Current Storage Used` + `New File Size`.
  3. Si `Projected Usage` > `Plan quota`: Retornar `402 Payment Required`.
  4. _Optimization_: Usar contador Redis/Cache para evitar `sum(files)` en cada request.

### `whatsapp-bridge`

Si decidimos integrar API oficial (Meta) en el futuro.

- Actualmente es Client-Side (`wa.me` link), así que **no se requiere backend** por ahora.

## 4. Security Webhooks

### `storage-quota-guard` (Audit 2.4 Fix)

- **Problema**: El trigger SQL confía en el `file_size` reportado por el cliente.
- **Solución**: Webhook que se dispara `on_upload`.
- **Lógica**:
  1. Recibe evento S3/Storage.
  2. Lee metadata real (`content_length`) del objeto subido.
  3. Actualiza `case_files.file_size` con el valor real.
  4. Si excede cuota -> Borra archivo + Notifica al usuario.
