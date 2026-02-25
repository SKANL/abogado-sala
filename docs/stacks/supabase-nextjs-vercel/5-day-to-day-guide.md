# 5. Guía del Día a Día: Tu Rutina de Desarrollo

> **📚 Contexto:** Esta guía implementa el [Flujo de Trabajo de Desarrollo](../../universal/5-development-workflow.md) usando las herramientas específicas de nuestro stack.
> Si quieres entender el ciclo completo de desarrollo profesional, lee primero la guía universal.

---

Esta guía es tu **"receta de cocina"** para cada vez que te sientes a programar una nueva función. Sigue estos pasos en orden para no perderte.

## Fase 1: Preparación (Antes de tocar código)

1.  **Sincronízate:** Baja los últimos cambios de tus compañeros.
    ```bash
    git checkout develop
    git pull origin develop
    ```
2.  **Crea tu Rama:** Nunca trabajes en `develop` directo.
    ```bash
    git checkout -b feature/nombre-de-tu-tarea
    ```
3.  **Enciende motores:**
    ```bash
    npx supabase start
    ```

## Fase 2: Programación (El ciclo de desarrollo)

### 1. Frontend (Código)

Edita tus archivos `.astro` o `.tsx` en `src/`. Aquí haces la magia visual.

### 2. Backend/Base de Datos (Datos)

- Abre `http://127.0.0.1:60023` (Studio Local).
- Crea tablas o modifica columnas allí visualmente.
- **Recuerda:** Todo lo que hagas aquí es temporal y solo está en tu PC.

### 3. Generar Migración (¡IMPORTANTE!) ⚠️

Si tocaste la base de datos (ej: creaste una tabla `clientes`), tienes que guardar esos cambios en un archivo para que tus compañeros (y producción) también los tengan.

```bash
# Guardar cambios en un archivo SQL
npx supabase db diff -f crea_tabla_clientes
```

- _Esto crea un archivo `.sql` en `supabase/migrations/`._
- _Verifica que se creó y que tiene sentido (léelo, es SQL simple)._

## Fase 3: Guardar y Subir

1.  **Commit:**
    ```bash
    git add .
    git commit -m "Agrega tabla de clientes y formulario de registro"
    ```
2.  **Push:** Sube tu rama a la nube (GitHub).
    ```bash
    git push origin feature/nombre-de-tu-tarea
    ```

## Fase 4: Integración (Pull Request)

1.  Ve a GitHub.
2.  Crea un **Pull Request** desde tu rama (`feature/...`) hacia `develop`.
3.  **Vercel:** Automáticamente creará un link de "Preview" para que veas el diseño.
    - _(Recuerda: El Preview no tendrá datos si no tienes DB en la nube para staging, pero sirve para ver CSS/HTML)._
4.  Espera aprobación y haz **Merge** en `develop`.

---

## Fase 5: Despliegue a Producción (Cuando todo está listo)

_Este paso se hace cuando ya tienes varias funcionalidades probadas en desarrollo y quieres lanzar una nueva versión a los usuarios reales._

1.  **Pull Request Final:** Crea un PR desde `develop` hacia `main`.
2.  **Merge:** Al aceptar el PR, Vercel inicia el despliegue automático de la web.
3.  **Base de Datos (Manual):**
    Desde tu terminal, asegúrate de estar en `main` y actualizado:
    ```bash
    git checkout main
    git pull origin main
    npx supabase db push
    ```
    _Esto aplica tus archivos `.sql` a la base de datos real de producción._

---

**¡Listo!** Tus cambios están en vivo.
