# 3. Migraciones de Base de Datos: Versionando Tu Estructura de Datos

## ¿Qué es una Migración?

Una **migración** es un archivo que describe un cambio en la estructura de tu base de datos.

**Analogía:** Si tu código es un libro, las migraciones son las instrucciones de cómo construir la biblioteca donde se guarda.

---

## 🤔 ¿Por Qué Necesitamos Migraciones?

### El Problema Sin Migraciones

Imagina este escenario:

**Día 1:** Creas una tabla `usuarios` en tu base de datos local usando la interfaz visual.

**Día 2:** Tu compañero clona el proyecto. Su base de datos NO tiene la tabla `usuarios`. La app no funciona.

**Día 3:** Agregas una columna `email` a `usuarios`. Tu compañero no sabe que debe agregarla.

**Resultado:** Caos. Cada persona tiene una versión diferente de la base de datos.

### La Solución: Migraciones

```sql
-- migrations/001_create_users.sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100)
);

-- migrations/002_add_email_to_users.sql
ALTER TABLE usuarios ADD COLUMN email VARCHAR(255);
```

Ahora:

- ✅ Los cambios están en archivos (versionados con Git)
- ✅ Todos ejecutan los mismos archivos en orden
- ✅ La base de datos de todos es idéntica

---

## 📚 Conceptos Fundamentales

### DDL vs DML

#### DDL (Data Definition Language)

**Define la ESTRUCTURA** de la base de datos.

```sql
-- Crear tabla
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100)
);

-- Modificar tabla
ALTER TABLE productos ADD COLUMN precio DECIMAL(10,2);

-- Eliminar tabla
DROP TABLE productos;
```

**Esto VA en migraciones.**

#### DML (Data Manipulation Language)

**Manipula los DATOS** dentro de las tablas.

```sql
-- Insertar
INSERT INTO productos (nombre, precio) VALUES ('Laptop', 999.99);

-- Actualizar
UPDATE productos SET precio = 899.99 WHERE nombre = 'Laptop';

-- Eliminar
DELETE FROM productos WHERE id = 1;
```

**Esto generalmente NO va en migraciones** (excepto datos de configuración inicial).

---

## 🔄 El Ciclo de Vida de una Migración

### 1. Desarrollo Local

```bash
# Haces cambios en tu base de datos local
# (crear tabla, agregar columna, etc.)

# Generas un archivo de migración
npx supabase db diff -f nombre_descriptivo
# O con otras herramientas:
# npx prisma migrate dev --name nombre_descriptivo
# python manage.py makemigrations
```

Esto crea un archivo:

```sql
-- supabase/migrations/20240207_nombre_descriptivo.sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);
```

### 2. Commit y Push

```bash
git add supabase/migrations/20240207_nombre_descriptivo.sql
git commit -m "Agrega tabla de clientes"
git push
```

### 3. Otros Desarrolladores

```bash
# Tu compañero baja los cambios
git pull

# Aplica las migraciones nuevas
npx supabase db reset
# O:
# npx prisma migrate deploy
# python manage.py migrate
```

### 4. Despliegue a Producción

```bash
# En CI/CD o manualmente
npx supabase db push
# O:
# npx prisma migrate deploy
# heroku run python manage.py migrate
```

---

## 🎯 Mejores Prácticas

### 1. Una Migración = Un Cambio Lógico

```bash
# ✅ Bien
migrations/
  001_create_users_table.sql
  002_create_posts_table.sql
  003_add_email_to_users.sql

# ❌ Mal
migrations/
  001_everything.sql  # 500 líneas con 20 tablas
```

### 2. Nombres Descriptivos

```bash
# ❌ Mal
20240207_migration.sql
20240207_changes.sql

# ✅ Bien
20240207_create_users_table.sql
20240207_add_email_verification.sql
20240207_create_index_on_user_email.sql
```

### 3. Migraciones Son Inmutables

Una vez que una migración se aplicó en producción, **NUNCA la edites**.

```bash
# ❌ Mal
# Editar migrations/001_create_users.sql después de aplicarla

# ✅ Bien
# Crear migrations/005_fix_users_table.sql
```

### 4. Incluye Rollbacks (Cuando sea Posible)

Algunas herramientas permiten definir cómo revertir una migración:

```sql
-- Up (aplicar cambio)
ALTER TABLE usuarios ADD COLUMN edad INTEGER;

-- Down (revertir cambio)
ALTER TABLE usuarios DROP COLUMN edad;
```

### 5. Prueba en Local Primero

```bash
# Aplica la migración en local
npx supabase db reset

# Verifica que funciona
npm run test

# Si todo está bien, sube a producción
```

---

## 🚨 Casos Especiales

### Migraciones con Datos (Data Migrations)

A veces necesitas modificar datos existentes:

```sql
-- migrations/010_normalize_phone_numbers.sql

-- Eliminar espacios de números de teléfono
UPDATE usuarios
SET telefono = REPLACE(telefono, ' ', '')
WHERE telefono LIKE '% %';
```

**⚠️ Cuidado:**

- Prueba en staging con datos realistas
- Considera el volumen de datos (puede tardar)
- Ten un plan de rollback

### Migraciones Destructivas

Cambios que pueden perder datos:

```sql
-- ⚠️ PELIGRO: Esto borra datos
ALTER TABLE usuarios DROP COLUMN fecha_nacimiento;

-- ✅ Mejor: Primero deprecar, luego eliminar
-- Migración 1: Marcar como obsoleto (agregar comentario)
-- Migración 2 (semanas después): Eliminar columna
```

### Cambios de Esquema Grandes

Para cambios que afectan muchas tablas:

```sql
-- migrations/020_refactor_user_system.sql

-- Opción 1: Todo en una transacción
BEGIN;
  CREATE TABLE new_users (...);
  INSERT INTO new_users SELECT ... FROM old_users;
  DROP TABLE old_users;
  ALTER TABLE new_users RENAME TO users;
COMMIT;

-- Opción 2: Estrategia de múltiples pasos
-- Migración 020: Crear nueva estructura
-- Migración 021: Migrar datos
-- Migración 022: Eliminar estructura antigua
```

---

## 🛠️ Herramientas Comunes

### Supabase CLI

```bash
# Generar migración
npx supabase db diff -f nombre

# Aplicar migraciones
npx supabase db push
```

### Prisma

```bash
# Generar migración
npx prisma migrate dev --name nombre

# Aplicar en producción
npx prisma migrate deploy
```

### Django

```bash
# Generar migración
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate
```

### Flyway / Liquibase

```bash
# Flyway
flyway migrate

# Liquibase
liquibase update
```

---

## 📋 Checklist de Migración

Antes de aplicar una migración en producción:

- [ ] **Probada en local** con datos de prueba
- [ ] **Probada en staging** con datos realistas
- [ ] **Revisada por otro desarrollador**
- [ ] **Tiene rollback plan** (cómo revertir si falla)
- [ ] **Documentada** (por qué se hace este cambio)
- [ ] **Backup de producción** realizado
- [ ] **Ventana de mantenimiento** agendada (si es necesario)

---

## 🔄 Estrategias de Rollback

### Opción 1: Migración Inversa

```sql
-- up.sql
ALTER TABLE usuarios ADD COLUMN premium BOOLEAN DEFAULT false;

-- down.sql
ALTER TABLE usuarios DROP COLUMN premium;
```

### Opción 2: Restaurar Backup

```bash
# Antes de migración
pg_dump miapp_prod > backup_pre_migration.sql

# Si falla, restaurar
psql miapp_prod < backup_pre_migration.sql
```

### Opción 3: Migración de Corrección

```sql
-- migrations/025_fix_previous_migration.sql
-- Corrige el problema sin revertir completamente
```

---

## 🎓 Errores Comunes

### 1. Editar Migraciones Aplicadas

```bash
# ❌ Mal
# Editar migrations/001_create_users.sql después de push

# ✅ Bien
# Crear migrations/010_modify_users.sql
```

### 2. No Versionar Migraciones

```bash
# ❌ Mal
# Hacer cambios directos en la base de datos de producción

# ✅ Bien
# Siempre crear archivo de migración primero
```

### 3. Migraciones Dependientes del Orden

```sql
-- ❌ Mal: Depende de datos específicos
UPDATE usuarios SET rol = 'admin' WHERE id = 1;

-- ✅ Bien: Usa criterios generales
UPDATE usuarios SET rol = 'admin' WHERE email = 'admin@miapp.com';
```

---

## 🔗 Siguiente Paso

Ahora que entiendes cómo versionar tu base de datos, aprende sobre [**CI/CD y Despliegues**](./4-cicd-deployment.md) para automatizar todo este proceso.
