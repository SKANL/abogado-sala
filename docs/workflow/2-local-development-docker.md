# 2. Tu Entorno Local con Docker (El "Taller")

Aquí es donde ocurre la magia. Vamos a crear una **copia exacta** de Supabase dentro de tu computadora. Puedes romper, borrar y experimentar aquí sin miedo.

## ¿Por qué Docker?

Supabase no es un solo programa; son muchos (Base de datos Postgres, Servidor de Auth, API, Storage, Studio, etc.). Instalar todo eso uno por uno en Windows sería una pesadilla.
Docker nos permite descargar una "caja" (contenedor) con todo eso listo para usar.

## Paso a Paso: Configuración Local

### 1. Inicializar la Carpeta

Si es un proyecto nuevo (o no tienes la carpeta `supabase`):

```bash
npx supabase init
```

Esto crea una carpeta `supabase/` con un archivo `config.toml`.

### 2. El "Truco" de los Puertos en Windows ⚠️ (IMPORTANTE)

Windows a veces "bloquea" los puertos que Supabase usa por defecto (5432, 54321, etc.). Para evitar dolores de cabeza, cambiamos la configuración para usar puertos seguros (Rango 60000).

Edita el archivo `supabase/config.toml` y busca/cambia estas líneas:

```toml
[api]
port = 60021      # Puerto principal para tu App

[db]
port = 60022      # Puerto de la base de datos
shadow_port = 60000  # Puerto interno (CRÍTICO cambiar este)

[studio]
port = 60023      # El Dashboard visual
```

_Si copiaste este repositorio, es probable que esto ya esté configurado._

### 3. Descargar la Base de Datos Real a Local

Queremos que tu entorno local sea idéntico a producción hoy.

```bash
# Asegúrate de que Docker Desktop esté corriendo primero.

# 1. Traer la estructura (tablas) de la nube:
npx supabase db pull
```

Esto creará un archivo en `supabase/migrations/` con toda la estructura de tus tablas actuales.

### 4. ¡Encender Motores! 🚀

Ahora sí, vamos a prender Supabase en tu PC.

```bash
npx supabase start
```

_La primera vez tardará unos minutos porque tiene que descargar las imágenes de Docker._

**Verás algo como esto al final:**

```text
Started supabase local development setup.

API URL:         http://127.0.0.1:60021
DB URL:          postgresql://postgres:postgres@127.0.0.1:60022/postgres
Studio URL:      http://127.0.0.1:60023
anon key:        eyJhbG... (tu clave pública local)
service_role:    eyJhbG... (tu clave secreta local)
```

**¡Felicidades!** Tienes un servidor Backend completo corriendo en tu máquina.

### 5. Conectar tu Web App (Next.js/Astro)

Para que tu página web use este servidor local y no el de producción:

1.  Crea un archivo llamado `.env.local` en la raíz de tu proyecto.
2.  Copia las claves que te dio el comando anterior:

```ini
# .env.local

# Apuntamos a LOCALHOST (Tu PC)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:60021

# Clave ANON local (Copia la que salió en la terminal, NO la de producción)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# Clave SERVICE_ROLE local
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

## ¿Cómo trabajo día a día?

1.  Abres Docker Desktop.
2.  Abres tu terminal y corres: `npx supabase start`.
3.  Abres el **Studio Local** en tu navegador: `http://127.0.0.1:60023`.
    - Aquí puedes ver tus tablas, usuarios y datos locales. ¡Es igual que la web!
4.  Programas en tu App.

Cuando termines por hoy, puedes apagar todo con:

```bash
npx supabase stop
```

---

**Siguiente paso:** Ya tienes todo corriendo. ¿Cómo guardas tus cambios y colaboras con otros? Vamos a la **Guía 3: Git y Flujo de Trabajo**.
