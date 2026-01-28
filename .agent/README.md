# 📂 Abogado Sala - Documentation Index

Este directorio contiene la **Fuente de la Verdad** para el proyecto. Cada decisión técnica, de negocio y de seguridad está documentada aquí.

## 🚀 Inicio Rápido (Execution)

Si vas a construir el proyecto, empieza aquí:

- **[execution-plan.md](execution-plan.md)**: El "Paso a Paso" secuencial para construir todo desde cero.

---

## 🏗️ 1. Backend & Infrastructure (`.agent/backend`)

La lógica del servidor, contratos y seguridad.

- **[architecture.md](../frontend/architecture.md)**: Reglas de Arquitectura Clean/SOLID (Ref frontend, pero aplica global).
- **[backend-contracts.md](backend/backend-contracts.md)**: Definición de APIs y Claims esperados por el frontend.
- **[environment-variables.md](backend/environment-variables.md)**: Lista de claves de configuración requeridas.
- **[error-dictionary.md](backend/error-dictionary.md)**: Códigos de error estándar (`AUTH_FAILED`, etc).
- **[schema-design.md](backend/schema-design.md)**: Diseño de Base de Datos y relaciones.
- **[security-model.md](backend/security-model.md)**: RLS, Policies, y "War Games" remediations.
- **[edge-functions.md](backend/edge-functions.md)**: Definición de Serverless Functions (Cronjobs, Webhooks).

---

## 💾 2. Database (SQL) (`.agent/sql`)

Los "Planos" ejecutables de la base de datos. Se ejecutan en orden numérico:

1. `00-init.sql`: Configuración inicial.
2. `01-tables.sql`: Tablas Core.
3. `02-indexes.sql`: Performance.
4. `03-rls.sql`: Seguridad.
5. `04-triggers.sql`: Automatización y Cuotas.
6. `05-functions.sql`: Lógica compleja (RPCs).

---

## 🎨 3. Frontend Specifications (`.agent/frontend`)

Cómo se ve y se comporta la aplicación.

### Core

- **[AGENTS.md](frontend/AGENTS.md)**: **🗺️ Manifiesto y Mapa de Navegación Frontend**.
- **[architecture.md](frontend/architecture.md)**: Reglas de Arquitectura Clean/SOLID.
- **[foundation-module.md](frontend/foundation-module.md)**: Setup inicial, librerías base.
- **[branding.md](frontend/branding.md)**: Guía de Marca (Logos, Tono de voz).
- **[layout-module.md](frontend/layout-module.md)**: Estructura visual principal (Shell, Sidebar).

...

### Operational

- **[components-registry.md](frontend/components-registry.md)**: Lista de componentes reutilizables.
- **[security-performance.md](frontend/security-performance.md)**: Seguridad Frontend (XSS, CSRF) y Web Vitals.
- **[data-fetching-mutations.md](frontend/data-fetching-mutations.md)**: Patrones de Server Actions.
- **[ui-design-rules.md](frontend/ui-design-rules.md)**: Sistema de Diseño (Colores, Spacing).
- **[state-management.md](frontend/state-management.md)**: Manejo de estado (Server vs Client).
- **[route-map.md](frontend/route-map.md)**: Mapa de URLs y Navegación.

### Features (Módulos)

- **[auth-module.md](frontend/auth-module.md)**: Login, Registro, Recuperación.
- **[dashboard-module.md](frontend/dashboard-module.md)**: Pantalla principal y KPIs.
- **[clients-module.md](frontend/clients-module.md)**: Gestión de clientes (CRUD).
- **[billing-module.md](frontend/billing-module.md)**: Suscripciones y Pagos (Stripe).
- **[portal-module.md](frontend/portal-module.md)**: Experiencia del Cliente Final (Uploads, Firmas).
- **[templates-module.md](frontend/templates-module.md)**: Editor de flujos y documentos.
- **[admin-module.md](frontend/admin-module.md)**: Consola de Super Admin (si aplica).

### Operational

- **[components-registry.md](frontend/components-registry.md)**: Lista de componentes reutilizables.
- **[data-fetching-mutations.md](frontend/data-fetching-mutations.md)**: Patrones de Server Actions.
- **[error-handling.md](frontend/error-handling-monitoring.md)**: Estrategia de errores y logs.
- **[realtime-strategy.md](frontend/realtime-strategy.md)**: WebSockets y eventos en vivo.
- **[testing-strategy.md](frontend/testing-strategy.md)**: Plan de pruebas.
- **[user-roles.md](frontend/user-roles-permissions.md)**: Matriz de permisos Frontend.
