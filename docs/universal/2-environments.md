# 2. Entornos de Desarrollo: Dónde Vive Tu Código

## ¿Por Qué Necesitamos Diferentes Entornos?

Imagina que eres chef. No experimentas recetas nuevas directamente en el plato que le vas a servir al cliente. Primero pruebas en tu cocina privada.

En desarrollo es igual:

- **Tu cocina (Local):** Donde experimentas sin consecuencias
- **Cocina de pruebas (Staging):** Donde el equipo prueba todo junto antes del servicio
- **Restaurante (Production):** Donde los clientes reales consumen tu producto

---

## 🏗️ Los Tres Entornos Principales

### 1. Local (Development)

**Ubicación:** Tu computadora  
**Propósito:** Desarrollo y experimentación individual

**Características:**

- ✅ Puedes romper todo sin consecuencias
- ✅ Cambios instantáneos (no necesitas desplegar)
- ✅ Datos de prueba (no reales)
- ❌ Solo tú tienes acceso
- ❌ Configuración puede diferir de producción

**Ejemplo:**

```
http://localhost:3000
Base de datos: PostgreSQL corriendo en Docker
```

### 2. Staging (Pre-producción)

**Ubicación:** Servidor en la nube (pero separado de producción)  
**Propósito:** Pruebas finales antes de lanzar a usuarios reales

**Características:**

- ✅ Configuración idéntica a producción
- ✅ Todo el equipo puede probar
- ✅ Integración de todos los cambios
- ⚠️ Datos de prueba (no reales, pero realistas)
- ❌ No accesible para usuarios finales

**Ejemplo:**

```
https://staging.miapp.com
Base de datos: PostgreSQL en la nube (separada de producción)
```

### 3. Production (Producción)

**Ubicación:** Servidor en la nube  
**Propósito:** La aplicación real que usan tus usuarios

**Características:**

- ✅ Datos reales de clientes
- ✅ Accesible públicamente
- ⚠️ SAGRADO: Solo código probado y aprobado
- ❌ NO se hacen experimentos aquí
- ❌ Cambios requieren proceso formal

**Ejemplo:**

```
https://miapp.com
Base de datos: PostgreSQL en la nube (con backups automáticos)
```

---

## 🔐 Variables de Entorno

### ¿Qué son?

Configuraciones que **cambian según el entorno** donde corre tu aplicación.

**Analogía:** Son como las llaves de tu casa. No las dejas en el código (GitHub) para que todos las vean.

### Ejemplos Comunes

```bash
# .env.local (Desarrollo)
DATABASE_URL=postgresql://localhost:5432/miapp_dev
API_KEY=test_key_123
ENVIRONMENT=development
DEBUG=true

# .env.production (Producción)
DATABASE_URL=postgresql://prod-server.com:5432/miapp_prod
API_KEY=prod_key_xyz_super_secreto
ENVIRONMENT=production
DEBUG=false
```

### Reglas de Oro

1. **NUNCA subas archivos `.env` a Git**

   ```bash
   # .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Usa nombres descriptivos**

   ```bash
   # ❌ Mal
   KEY=abc123
   URL=http://...

   # ✅ Bien
   STRIPE_API_KEY=sk_test_...
   DATABASE_URL=postgresql://...
   ```

3. **Documenta qué variables necesitas**
   ```bash
   # .env.example (SÍ se sube a Git)
   DATABASE_URL=postgresql://localhost:5432/dbname
   API_KEY=tu_clave_aqui
   SMTP_HOST=smtp.gmail.com
   ```

---

## 🎯 Paridad de Entornos

### El Problema

```
"En mi máquina funciona" 🤷‍♂️
```

### La Solución: Mantener Entornos Similares

| Aspecto           | Local         | Staging             | Production        |
| ----------------- | ------------- | ------------------- | ----------------- |
| **Node.js**       | v20.x         | v20.x               | v20.x             |
| **Base de Datos** | PostgreSQL 15 | PostgreSQL 15       | PostgreSQL 15     |
| **Variables ENV** | `.env.local`  | `.env.staging`      | `.env.production` |
| **Datos**         | Ficticios     | Ficticios realistas | Reales            |

### Herramientas para Paridad

#### Docker

Empaqueta tu aplicación con todas sus dependencias.

```dockerfile
# Dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

**Ventaja:** "Si funciona en Docker local, funcionará en producción"

#### Gestores de Versiones

```bash
# .nvmrc (para Node.js)
20.11.0

# Uso
nvm use
```

---

## 🔄 Flujo de Datos Entre Entornos

### Código: Siempre hacia adelante

```
Local → Staging → Production
```

### Datos: Generalmente hacia atrás

```
Production → Staging (copia anonimizada)
Production → Local (solo estructura, no datos)
```

### ⚠️ NUNCA hagas esto:

```
Local → Production (datos de prueba a producción)
```

---

## 🛠️ Configuración de Entorno Local

### Opción 1: Instalación Nativa

Instalas todo directamente en tu sistema operativo.

**Ventajas:**

- ✅ Más rápido (sin virtualización)
- ✅ Más simple para proyectos pequeños

**Desventajas:**

- ❌ Conflictos entre proyectos
- ❌ Difícil de replicar en otros equipos

### Opción 2: Docker (Recomendado)

Cada proyecto corre en contenedores aislados.

**Ventajas:**

- ✅ Aislamiento total
- ✅ Fácil de compartir configuración
- ✅ Paridad con producción

**Desventajas:**

- ❌ Curva de aprendizaje inicial
- ❌ Consume más recursos

### Opción 3: Servicios en la Nube (BaaS)

Usas servicios como Supabase, Firebase, etc.

**Ventajas:**

- ✅ No necesitas configurar base de datos
- ✅ Funcionalidades listas (auth, storage)

**Desventajas:**

- ❌ Dependes de internet
- ❌ Costos pueden escalar

---

## 📋 Checklist de Configuración

Antes de empezar a desarrollar, asegúrate de tener:

- [ ] **Entorno local funcionando**
  - [ ] Lenguaje/runtime instalado (Node.js, Python, etc.)
  - [ ] Base de datos corriendo (local o Docker)
  - [ ] Variables de entorno configuradas (`.env.local`)

- [ ] **Herramientas de desarrollo**
  - [ ] Editor de código (VS Code, etc.)
  - [ ] Git instalado y configurado
  - [ ] Docker (si lo usas)

- [ ] **Acceso a servicios**
  - [ ] Credenciales de desarrollo (API keys de prueba)
  - [ ] Acceso al repositorio de código
  - [ ] Acceso a staging (si existe)

---

## 🚨 Errores Comunes

### 1. Mezclar Configuraciones

```javascript
// ❌ Mal: URL hardcodeada
const apiUrl = "https://api.miapp.com";

// ✅ Bien: Usa variables de entorno
const apiUrl = process.env.API_URL;
```

### 2. Usar Producción para Desarrollo

```bash
# ❌ NUNCA hagas esto en .env.local
DATABASE_URL=postgresql://produccion.com/db_real
```

### 3. Subir Secretos a Git

```bash
# ❌ Archivo .env en Git
git add .env
git commit -m "agrega configuración"

# ✅ Asegúrate de tener .env en .gitignore
echo ".env" >> .gitignore
```

---

## 🎓 Mejores Prácticas

### 1. Documenta tu Configuración

```markdown
# README.md

## Configuración Local

1. Copia `.env.example` a `.env.local`
2. Pide las credenciales de desarrollo al equipo
3. Ejecuta `npm run dev`
```

### 2. Usa Scripts de Setup

```json
// package.json
{
  "scripts": {
    "setup": "cp .env.example .env.local && npm install",
    "dev": "npm run db:start && npm run app:dev",
    "db:start": "docker-compose up -d postgres"
  }
}
```

### 3. Valida Variables Requeridas

```javascript
// config.js
const requiredEnvVars = ["DATABASE_URL", "API_KEY"];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Falta variable de entorno: ${varName}`);
  }
});
```

---

## 🔗 Siguiente Paso

Ahora que entiendes dónde vive tu código, aprende sobre [**Migraciones de Base de Datos**](./3-database-migrations.md) para manejar cambios de estructura de datos entre entornos.
