# 4. Chuleta de Comandos y Solución de Errores

Guárdate esta página. Aquí están las medicinas para cuando las cosas fallan.

## ⚡ Comandos que usarás todos los días

| Quiero...                               | Comando                                      |
| :-------------------------------------- | :------------------------------------------- |
| **Empezar a trabajar** (Prender Docker) | `npx supabase start`                         |
| **Parar de trabajar** (Apagar Docker)   | `npx supabase stop`                          |
| **Ver URLs y claves locales**           | `npx supabase status`                        |
| **Guardar cambios de DB locales**       | `npx supabase db diff -f nombre_descriptivo` |
| **Subir cambios a Producción**          | `npx supabase db push`                       |
| **Resetear mi DB local** (Borrar todo)  | `npx supabase db reset` (¡Cuidado!)          |

---

## 🚑 S.O.S - Solución de Problemas Comunes

### 🔴 Error: "Docker no responde" o "Daemon not running"

**Problema:** El comando falla al principio.
**Solución:** Docker Desktop no está abierto.

1.  Abre la aplicación **Docker Desktop** en Windows.
2.  Espera a que la ballenita se ponga verde/fija.
3.  Intenta de nuevo.

### 🔴 Error: "Ports are not available" (Bind error 5432...)

**Problema:** Te sale un error rojo gigante hablando de puertos (`54320`, `54322`, etc.) y "forbidden access".
**Razón:** Windows a veces reserva esos puertos para sí mismo.
**Solución:**

1.  Abre el archivo `supabase/config.toml`.
2.  Asegúrate de que los puertos estén en el rango `60xxx` (ej: 60022).
3.  Si sigue fallando, prueba cambiando el último número (ej: de `60022` a `60032`).
4.  Ejecuta `npx supabase stop` y luego `npx supabase start`.

### 🔴 Error: "Migration history mismatch"

**Problema:** Al intentar bajar cambios (`db pull`) o subir (`db push`), te dice que la "historia" no coincide.
**Razón:** Alguien borró un archivo de migración manualmente o editó la base de datos de producción por fuera del sistema.
**Solución (Resetear Local):**
Si quieres igualar tu local a lo que hay en producción (y perder tus datos de prueba locales):

1.  Ejecuta: `npx supabase db reset`.
2.  Si eso falla, borra la carpeta `supabase/migrations` (salva tus archivos nuevos si tienes) y haz `npx supabase db pull`.

### 🔴 Mi App no se conecta (Error de conexión)

**Verificaciones rápidas:**

1.  ¿Está corriendo Docker? (`npx supabase status`).
2.  ¿Tienes el archivo `.env.local` creado?
3.  ¿Las claves en `.env.local` coinciden con las que muestra `npx supabase status`? (A veces se nos olvida cambiarlas de las de producción a las locales).
4.  ¿El puerto en `.env.local` es el correcto? (Recuerda que los movimos a `60021`).

---

### ¿Sigues atascado?

Comando de limpieza profunda (Úsalo como último recurso):

```bash
# Detiene todo y borra los contenedores
npx supabase stop --no-backup

# (Opcional) Reinicia Docker Desktop

# Vuelve a iniciar
npx supabase start
```
