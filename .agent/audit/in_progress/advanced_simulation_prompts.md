# Prompts Avanzados de Auditoría y Simulación SaaS

Estos prompts han sido extendidos para cubrir el 100% de la arquitectura SaaS (Auth, Billing, Multi-tenancy, Storage, Edge Functions) y las especificaciones actuales del proyecto.

---

## PROMPT 1: Auditoría de Integridad Sistémica y Robustez ("Deep Scan")

**Contexto:**
Actúa como un **Principal Software Architect & Lead SDET (Software Development Engineer in Test)** con especialización en sistemas distribuidos y Supabase. Tienes acceso total a las especificaciones vivas en `[.agent/backend]`, `[.agent/frontend]` y `[.agent/sql]`.

**Objetivo:**
Realizar una "Auditoría de Caja Blanca" exhaustiva. No busques solo bugs superficiales; busca **fallos estructurales**, **inconsistencias en el modelo de datos** y **brechas de lógica SaaS** que podrían colapsar el sistema bajo carga real.

### FASE 1: El Escuadrón de Pruebas (Personas Extendidas)

Ejecuta simulaciones mentales profundas asumiendo estos 5 roles críticos:

1.  **El Usuario "Torpe" (UX & State Resilience):**
    - **Comportamiento:** Usa el botón de "Atrás" del navegador en medio de un Wizard de varios pasos. Cierra la pestaña mientras se sube un archivo de 500MB. Hace doble clic frenético en "Pagar Suscripción". Deja abiertos los formularios por 24 horas antes de enviar (Token Expirado).
    - **Foco:** Persistencia de estado (Wizard), manejo de uploads interrumpidos (TUS protocol), idempotencia en pagos (Stripe), renovación de sesiones.

2.  **El Usuario Malicioso (SaaS Security & Isolate):**
    - **Comportamiento:** Intenta cambiar el `org_id` en el LocalStorage. Modifica los payloads JSON para inyectar metadatos (`role: 'admin'`). Intenta acceder a buckets de Storage de otros 'Cases' adivinando UUIDs. Intenta usar una Invitación dos veces.
    - **Foco:** Bypass de RLS, Validación de metadatos en Triggers, Fugas de Multi-tenancy (ver datos de otra Org), Seguridad de Signed URLs.

3.  **El "Quota Crusher" (Billing & Limits):**
    - **Comportamiento:** Intenta crear el cliente #11 en un plan que permite 10. Sube archivos hasta llenar el Storage cap. Intenta invitar miembros teniendo la suscripción "Past Due".
    - **Foco:** Enforcement de límites (Db vs App logic), comportamiento ante degradación de plan, manejo de errores de cuota.

4.  **El "Network Ghost" (Connectivity & Race Conditions):**
    - **Comportamiento:** Tiene una conexión 3G inestable. Envía peticiones que llegan en desorden (la petición de "Completar Caso" llega antes que la de "Subir Archivo"). Se desconecta justo después de recibir el "Upload Token" pero antes de subir el archivo.
    - **Foco:** Transactionalidad (Atomicidad), Optimistic Updates vs Server Truth, Huérfanos en Storage (archivos sin registro en DB).

5.  **El Arquitecto Escéptico (Consistency Check):**
    - **Comportamiento:** Analiza cada campo en `01-tables.sql` vs las interfaces de `[.agent/frontend]`.
    - **Foco:** "Type Mismatches" (Frontend manda string, DB espera UUID), Nullability (Frontend asume obligatorio, DB permite null), Foreign Keys faltantes (¿Se puede borrar una Template en uso?).

### FASE 2: Vectores de Ataque Específicos SaaS

Para cada simulación, somete la arquitectura a estos vectores:

- **Tenant Isolation Leak:** ¿Existe ALGUNA consulta o policy que no filtre por `org_id`? ¿Qué pasa con las tablas globales (ej. `subscriptions`)?
- **Zombie Resources:** Si borro una `Organization`, ¿Qué pasa con sus `Subscriptions` en Stripe y sus archivos en `Storage`? ¿Quién limpia eso?
- **Privilege Escalation (Vertical & Horizontal):** ¿Puede un 'Member' invitar a otros? ¿Puede un 'Lawyer' ver casos no asignados manipulando la URL?
- **Edge Function Limits:** ¿El proceso de generación de PDFs o Zips respeta los timeouts de 50s de las Edge Functions? ¿Qué pasa con archivos grandes?
- **Invite/Auth Race:** El usuario acepta una invitación, pero el Admin la revoca milisegundos antes. ¿El sistema crea el usuario huérfano?

### FASE 3: Matriz de Integridad

Genera una tabla priorizada por RIESGO ARQUITECTÓNICO:

| Gravedad    | Módulo(s) | Escenario de Falla                  | Impacto Técnico                     | Solución Robusta Recomendada                                                |
| :---------- | :-------- | :---------------------------------- | :---------------------------------- | :-------------------------------------------------------------------------- |
| **CRÍTICA** | SQL/RLS   | Malicioso cambia `org_id` en INSERT | Inyección de datos en Tenant ajeno  | Forzar `org_id` desde `auth.jwt()` en RLS o Triggers (nunca desde payload). |
| **ALTA**    | Billing   | Downgrade de Plan con exceso de uso | Datos inaccesibles o inconsistentes | Definir política de "Soft Block" o "Data Retention" post-downgrade.         |
| **MEDIA**   | Flux/UX   | Refresh en Paso 3 del Wizard        | Pérdida de datos ingresados         | Implementar persistencia borrador en `sessionStorage` o DB (`draft_data`).  |

**Conclusión Final:** Evalúa si la arquitectura actual es "Production Ready" o "MVP Frágil".

---

## PROMPT 2: Simulación "War Games" y Pruebas de Estrés (Roles & Concurrencia)

**Contexto:**
Actúa como un **Experto en Ciberseguridad (Red Teamer) y Arquitecto de Producto**. Tienes las especificaciones completas. Vamos a jugar "War Games" con el sistema propuesto.

**Objetivo:**
Simular escenarios de conflicto de **alta complejidad** donde interactúan múltiples roles, estados de facturación y procesos en segundo plano. Validar que el sistema "falle de forma segura" (Fail-Safe) y no catastrófica.

### FASE 1: Escenarios de "Vida Real" (Roles Interactivos)

Analiza la lógica y responde: **¿Sobrevive el sistema?**

**1. ESCENARIO: "El Golpe de Estado" (Admin vs Organización)**

- **Situación:** El Owner original (Admin A) invita a un Socio (Admin B). Se pelean. Admin B intenta borrar a Admin A.
- **La Prueba:** ¿Permite el sistema que una Org se quede sin Admins? ¿Puede Admin B revocar el acceso de Admin A inmediatamente (token revocation) o Admin A puede seguir borrando datos por 1 hora hasta que expire su JWT?
- **Vector:** Token Liveness vs Database State.

**2. ESCENARIO: "El Abogado que se lleva los datos" (Data Exfiltration)**

- **Situación:** Un abogado sabe que lo van a despedir. Intenta descargar TODOS los expedientes asignados y sus archivos en batch.
- **La Prueba:** ¿Existe Rate Limiting en los endpoints de descarga? ¿El sistema alerta de actividad inusual? ¿Puede descargar casos que no son suyos simplemente iterando IDs secuenciales (si los hay) o UUIDs filtrados?

**3. ESCENARIO: "El Cliente en el Limbo" (Portal & Auth)**

- **Situación:** Un cliente recibe un Magic Link para el "Caso A". Entra, sube archivos. El Abogado borra el "Caso A" _mientras_ el cliente está subiendo el archivo #3.
- **La Prueba:** ¿El archivo queda huérfano en Storage? ¿El cliente recibe un error 404 feo o un mensaje amigable? ¿La URL firmada sigue siendo válida post-borrado del caso?

**4. ESCENARIO: "El Webhook Perdido" (System Failure)**

- **Situación:** Un pago de renovación de Stripe ocurre, pero el Webhook de confirmación falla (500 Server Error) o llega 4 horas tarde.
- **La Prueba:** ¿La Organización pierde acceso inmediatamente? ¿Existe un periodo de gracia? ¿El sistema reintenta procesar el webhook o requiere intervención manual?

### FASE 2: Pruebas de Fuego (Cross-Module Integration)

Evalúa la coherencia entre módulos dispares:

1.  **Billing <-> Storage:** El plan "Básico" tiene 5GB. La Org tiene 4.9GB. Dos abogados intentan subir un archivo de 200MB al mismo tiempo.
    - _¿Race Condition?_ ¿Ambos suben y la Org queda en 5.3GB (violando contrato)? ¿O uno falla?
2.  **Auth <-> Invitations:** Un usuario es invitado a la "Org A" y a la "Org B" con el mismo email. Acepta ambas.
    - _Context Switching:_ ¿Cómo maneja el Frontend el cambio de Org? ¿El JWT contiene el `org_id` actual? ¿Qué pasa si intenta ver datos de Org A estando logueado en Org B?

### FASE 3: El Informe de Vulnerabilidades y Resiliencia

Genera una tabla de "Hallazgos de Guerra":

| Actor   | Tipo de Conflicto | Escenario Ganador     | ¿Por qué ganó el ataque/fallo?                  | Parche Recomendado                                                   |
| :------ | :---------------- | :-------------------- | :---------------------------------------------- | :------------------------------------------------------------------- |
| Admin B | Takeover          | Borró al último Admin | Faltó constraint `CheckMinAdmins` SQL triggers. | Trigger `before delete` que impida dejar Org sin Admins.             |
| System  | Billing Race      | Exceso de Storage     | Check de cuota se hace en App, no en DB.        | Mover lógica de cuota a RLS/Trigger o aceptar "Soft Limit" temporal. |

**Veredicto Final:** Califica la madurez de seguridad del sistema:

- **Nivel 1 (Queso Suizo):** Agujeros obvios.
- **Nivel 2 (Estándar):** Seguro en uso normal, frágil bajo ataque.
- **Nivel 3 (Fortaleza):** Fail-safe, validación redundante, manejo de concurrencia.
