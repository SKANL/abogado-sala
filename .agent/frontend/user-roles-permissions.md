# User Roles & Permissions - Abogado Sala

Definición estricta de los actores del sistema y sus alcances en la interfaz.

## 1. Actores del Sistema

### A. Owner (Admin & Super-Lawyer)

- **Rol Técnico**: `admin`.
- **Naturaleza**: Es un "Abogado con Superpoderes". Puede hacer todo lo que hace un abogado, PLUS gestión del negocio.
- **Visibilidad (Data Scope)**: `Global (Org Level)`. Ve los clientes de TODOS sus empleados.
- **Acceso UI**: Dashboard Completo (Operativo + Administrativo).

### B. Lawyer (Abogado Empleado)

- **Rol Técnico**: `member`.
- **Naturaleza**: Operador individual.
- **Visibilidad (Data Scope)**: `Siloed (User Level)`. **ESTRICTO**: Solo ve sus propios clientes y expedientes. No puede ver lo que hacen otros abogados del mismo despacho.
- **Acceso UI**: Dashboard Operativo Limitado.

### C. Client (Cliente Final)

- **Rol Técnico**: `guest_token`.
- **Naturaleza**: Efímero. Entra, cumple trámite, sale.
- **Acceso UI**: Portal Aislado (`/sala/[token]`).

---

## 2. Matriz de Permisos (Frontend Gates)

| Feature                        | Owner (Admin) | Lawyer (Member) | Client (Guest) |
| ------------------------------ | ------------- | --------------- | -------------- |
| **Login/Registro**             | ✅            | ✅              | ❌             |
| **Ver Métricas Globales**      | ✅            | ❌              | ❌             |
| **Gestionar Usuarios**         | ✅            | ❌              | ❌             |
| **Crear Clientes**             | ✅            | ✅              | ❌             |
| **Ver Mis Clientes**           | ✅            | ✅              | ❌             |
| **Ver Clientes de Otros**      | ✅            | ❌ (Estricto)   | ❌             |
| **Crear Plantillas Globales**  | ✅            | ❌              | ❌             |
| **Crear Plantillas Privadas**  | ✅            | ✅              | ❌             |
| **Borrar Plantillas Globales** | ✅            | ❌              | ❌             |
| **Subir Docs (Portal)**        | ❌            | ❌              | ✅             |
| **Firmar (Portal)**            | ❌            | ❌              | ✅             |

---

## 3. Interfaces Diferenciadas

### A. Interfaz Dashboard (Owner)

- **View**: Org-Wide.
- **Listas**: Filtro opcional "Ver por Abogado" en tablas.
- **Plantillas**: Ve/Edita TODAS (Globales y Privadas propias).

### B. Interfaz Dashboard (Lawyer)

- **View**: Personal ("My Workspace").
- **Listas**: No ve filtros de usuarios. La query a DB siempre lleva `WHERE owner_id = me`.
- **Plantillas**:
  - `Globales` (Read-Only): Las usa pero no las borra.
  - `Personales` (Full Control): Crea, edita y destruye sus propias herramientas.

### C. Interfaz Portal

- Sin estado persistente. Contexto derivado puramente del Token URL.

---

## 4. Ciclo de Vida Crítico (Manejo de Bajas)

### Prevención de "Zombie Users" (Security Warning)

Al eliminar un miembro (`removeMemberAction`):

1.  **Soft Delete (SQL)**: Borrar fila en tabla `profiles`.
2.  **Hard Ban (Supabase Auth)**: **OBLIGATORIO** llamar a `supabase.auth.admin.deleteUser(uid)` en el backend.
    - _Razón_: Si solo borramos el perfil, el JWT del usuario sigue siendo válido hasta expirar. Borrar el Auth User invalida el token inmediatamente.
