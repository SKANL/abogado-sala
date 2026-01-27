# Route Map - Abogado Sala (Role-Aware)

Mapa completo de navegación con segmentación por rol.

## Estructura de Rutas

| Ruta             | Acceso Permitido | Componente Layout | Comportamiento                             |
| ---------------- | ---------------- | ----------------- | ------------------------------------------ |
| **(marketing)**  | Público          | `MarketingLayout` | Landing page                               |
| `/`              | Todos            | -                 | -                                          |
| **(auth)**       | Guest            | `AuthLayout`      | Si está logueado, redirige a `/dashboard`  |
| `/login`         | Guest            | -                 | -                                          |
| `/registro`      | Guest            | -                 | -                                          |
| `/setup`         | Owner (Nuevo)    | -                 | Configuración inicial del despacho         |
| **(dashboard)**  | Auth Required    | `DashboardLayout` | -                                          |
| `/dashboard`     | Owner, Lawyer    | -                 | Renderizado condicional de widgets         |
| `/clientes`      | Owner, Lawyer    | -                 | Tabla completa                             |
| `/clientes/[id]` | Owner, Lawyer    | -                 | Expediente                                 |
| `/equipo`        | **Owner Only**   | -                 | Lawyer ve 403 o Redirect si intenta entrar |
| `/configuracion` | **Owner Only**   | -                 | Branding y Ajustes Generales               |
| `/facturacion`   | **Owner Only**   | -                 | Suscripción y Método de Pago               |
| `/perfil`        | Owner, Lawyer    | -                 | Editar datos propios (Nombre, Foto)        |
| **(portal)**     | Token Holder     | `PortalLayout`    | Cliente Final                              |
| `/sala/[token]`  | Client           | -                 | Vista única                                |

## Lógica de Redirección Inteligente

1. **Al Login**:
   - `Owner` -> `/dashboard` (Vista completa).
   - `Lawyer` -> `/dashboard` (Vista operativa).
2. **Acceso Denegado**:
   - `Lawyer` intenta entrar a `/configuracion` -> Toast "Acceso restringido a administradores".

## Breadcrumbs Dinámicos

- `Owner`: Inicio > Configuración > Facturación
- `Lawyer`: Inicio > (No ve Configuración)
