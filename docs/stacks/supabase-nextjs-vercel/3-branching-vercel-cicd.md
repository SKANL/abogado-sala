# 3. Flujo de Trabajo: Git, Ramas y Despliegues

> **📚 Contexto:** Esta guía implementa los conceptos de:
>
> - [Control de Versiones](../../universal/1-version-control.md) - Git y estrategias de branching
> - [CI/CD y Despliegues](../../universal/4-cicd-deployment.md) - Automatización con Vercel
> - [Migraciones de Base de Datos](../../universal/3-database-migrations.md) - Versionado de cambios de DB

---

Ahora que tienes tu entorno local (Guía 2) y entiendes producción (Guía 1), vamos a ver cómo trabajar día a día sin causar desastres.

## 🌳 El Árbol (Ramas de Git)

No trabajamos todos sobre el mismo archivo al mismo tiempo. Usamos "Ramas" (Branches).

1.  **`main` (Rama Principal):**
    - Es lo que está **EN VIVO** en Internet.
    - SAGRADO. Nunca subimos cambios directos aquí.
    - Solo recibe cambios cuando todo está 100% probado.

2.  **`develop` (Rama de Desarrollo):**
    - Es nuestro punto de encuentro.
    - Aquí juntamos el trabajo de todos antes de pasarlo a `main`.

3.  **`feature/lo-que-sea` (Ramas de Funcionalidad):**
    - Aquí es donde trabajas TÚ.
    - Cada vez que vas a hacer algo nuevo (ej: "Arreglar el login" o "Nueva página de perfil"), creas una rama nueva.

---

## 📅 Tu Rutina de Trabajo (Paso a Paso)

Imagina que hoy tienes que crear una nueva sección de "Clientes".

### Paso 1: Preparar el terreno

Asegúrate de estar actualizado antes de empezar.

```bash
# Ir a la rama de desarrollo
git checkout develop

# Bajar los últimos cambios de tus compañeros
git pull origin develop
```

### Paso 2: Crear tu "Mesa de Trabajo" (Rama)

Crea una rama para tu tarea específica. Usa nombres claros.

```bash
# Crear rama nueva (-b) llamada feature/modulo-clientes
git checkout -b feature/modulo-clientes
```

### Paso 3: Programar (The Fun Part)

1.  Enciende Supabase (`npx supabase start`).
2.  Haz tus cambios en el código (Next.js/Astro) y en la base de datos (crear tablas en local).
3.  **IMPORTANTE:** Si hiciste cambios en la Base de Datos (ej: nueva tabla), guarda esos cambios en un archivo de migración:
    ```bash
    npx supabase db diff -f crear_tabla_clientes
    ```
    _Esto creará un archivo `.sql` en `supabase/migrations`. Ese archivo ES parte de tu código._

### Paso 4: Guardar y Subir

```bash
# Agrega todos los archivos cambiados
git add .

# Guarda con un mensaje claro
git commit -m "Agrega tabla de clientes y formulario de registro"

# Sube tu rama a la nube (GitHub/GitLab)
git push origin feature/modulo-clientes
```

### Paso 5: Solicitar Fusión (Pull Request)

1.  Ve a GitHub. Verás un botón "Compare & pull request".
2.  Crea el PR apuntando hacia `develop` (¡No a `main` todavía!).
3.  Tus compañeros revisan el código. Si todo está bien, lo aprueban y se mezcla ("Merge").

---

## 🚀 Despliegue (Cómo llega a Internet)

### A. Entorno de Pruebas (Preview)

Cuando tu código entra en `develop` (o en un PR), Vercel genera una URL de prueba automática.

- **Nota importante:** En esta configuración, las _Previews_ de Vercel NO tienen acceso a tu base de datos local (porque está en tu PC). Solo podrás ver la parte visual (Frontend). Para probar base de datos completa, usa tu entorno local.

### B. Entorno de Producción (Live)

Cuando ya probaron todo en `develop` y quieren lanzar la versión nueva:

1.  Hacen un Pull Request de `develop` hacia `main`.
2.  Al hacer Merge, Vercel despliega la web automáticamente.
3.  **¡Falta la base de datos!** Tienes que enviar las nuevas tablas a Supabase Producción manualmente:
    ```bash
    # Desde tu terminal en la rama main actualizada:
    npx supabase db push
    ```
    _Esto aplicará todas las migraciones pendientes en la base de datos real._

---

**Resumen:**

1. Crear rama `feature/...` -> 2. Programar y Migrar Local -> 3. Push -> 4. PR a `develop` -> 5. PR a `main` -> 6. `supabase db push`.
