# 1. Estrategia Supabase Online (Entorno de Producción)

## ¿Qué es el entorno de "Producción"?

Imagina que estás construyendo un edificio.

- **Tu PC (Local):** Es el taller donde pruebas materiales, cortas madera y haces ruido. Si algo se rompe, no pasa nada.
- **Producción (Supabase Online):** Es el edificio terminado donde vive la gente (tus usuarios reales). **Aquí no se hacen pruebas experimental.**

En nuestro proyecto, el "Proyecto Supabase" que creaste en la web (`supabase.com`) es sagrado. Es **Producción**.

## Reglas de Oro para Producción

1.  **⛔ PROHIBIDO conectar `localhost` a Producción:**
    Nunca configures tu archivo `.env` local para apuntar a la base de datos real mientras desarrollas nuevas funciones. Podrías borrar datos de clientes por error.

2.  **⛔ NO editar la base de datos manualmente:**
    No entres al Dashboard web de Supabase a crear tablas o columnas con el editor visual ("Table Editor").
    - _¿Por qué?_ Porque esos cambios no quedan guardados en el código (Git) y tus compañeros no los tendrán.
    - _¿Cómo se hace entonces?_ A través de **Migraciones** (código SQL) que subimos desde nuestra PC.

## Comandos para Gestionar Producción

Aunque desarrollamos en local, necesitamos "sincronizarnos" con producción de vez en cuando.

### Vincular tu proyecto (Solo la primera vez)

Para decirle a tu código "Este es mi proyecto real en la nube":

1.  Ve a [Supabase Dashboard](https://supabase.com/dashboard/projects), entra a tu proyecto.
2.  Mira la URL en el navegador: `https://supabase.com/dashboard/project/abc-xyz-123`
3.  Ese código final (`abc-xyz-123`) es tu **Reference ID**.
4.  En tu terminal ejecuta:
    ```bash
    npx supabase link --project-ref <tu-reference-id>
    ```
5.  Te pedirá la contraseña de la base de datos (la que pusiste al crear el proyecto).

### Enviar cambios a Producción (Deploy)

Cuando ya terminaste de trabajar en local y todo funciona perfecto:

1.  Asegúrate de estar en la rama `main` de Git.
2.  Ejecuta:
    ```bash
    npx supabase db push
    ```
    _Este comando lee los archivos de tu carpeta `supabase/migrations` y los aplica en la nube de forma segura._

---

**Siguiente paso:** Ahora que entendemos qué es Producción y qué NO hacer ahí, vamos a configurar tu "Taller" personal en la **Guía 2**.
