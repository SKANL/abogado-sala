# Admin Module - Abogado Sala

Gestión avanzada de organización y gobernanza de datos. **MODULO EXCLUSIVO PARA OWNER**.

## 1. Arquitectura (`src/features/admin/`)

Este módulo es una "Area VIP". Todo componente aquí asume que el usuario es `ADMIN`.

## 2. Flujos de Usuario (Owner Persona)

### A. Gestión de Equipo (El Despacho)

1. **Invitar Abogado**:
   - Input: Email.
   - Action: Sistema envía invitación.
   - UI: El abogado aparece "Pendiente" en la lista de equipo.
2. **Monitoreo de Actividad**:
   - Owner ve tabla "Actividad Reciente".
   - Filtro: "Ver actividad de [Abogado Jr.]".
   - Dato: "Abogado Jr. creó el expediente X".

### B. Configuración del Negocio (Branding & Defaults)

1. **Personalización**:
   - Owner sube Logo y elige Color Primario.
   - **Feedback**: El dashboard del Owner Y el de los Lawyers se actualiza automáticamente con el nuevo logo/color.

1. **Plantillas de Comunicación [NUEVO]**:
   - **WhatsApp Default**: Definir el mensaje base que usarán todos los abogados.
   - **Variables Disponibles**: `{client_name}`, `{lawyer_name}`, `{case_name}`, `{portal_link}`.
   - **Editor**: El admin define el texto predeterminado con placeholders.

### C. Métricas de Negocio

- "Clientes Totales" (Global).
- "Expedientes Cerrados este mes" (Global).
- "Expedientes Cerrados este mes" (Global).
- "Almacenamiento usado" (Global).

### D. Facturación (Billing)

Gestionado en un módulo dedicado. Ver [**Billing Module**](file:///c:/code/WEB/astro/abogados/abogado-sala/.agent/frontend/billing-module.md).

- El Owner gestiona su suscripción SaaS.
- Los Lawyers NO tienen acceso a esta información.

---

## 3. Restricciones Técnicas (Lawyer View)

Si un Lawyer logra invocar estas acciones vía API (bypass UI):

- `PermissionsGuard`: El backend debe rechazar la transacción.
- La UI simplemente **no renderiza** el link "Ajustes de Equipo" en el Sidebar del Lawyer.

---

## 4. Diferencias de Interfaz Visibles

| Elemento          | Owner                  | Lawyer           |
| ----------------- | ---------------------- | ---------------- |
| **Sidebar**       | Menu completo "Admin"  | Oculto           |
| **Top Bar**       | Badge "Admin Mode" (?) | Badge "Member"   |
| **User Dropdown** | "Configurar Org"       | "Solo Mi Perfil" |
