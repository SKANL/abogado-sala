# Stack: Supabase + Next.js/Astro + Vercel + GitHub

Esta guía específica te muestra **cómo implementar** los conceptos universales usando este stack tecnológico.

---

## 🎯 ¿Para Quién es Esta Guía?

Esta documentación es para proyectos que usan:

- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Frontend:** Next.js o Astro
- **Hosting:** Vercel (frontend) + Supabase Cloud (backend)
- **Control de Versiones:** GitHub
- **Entorno Local:** Docker Desktop

---

## 📚 Guías en Orden

### [0. Requisitos y Configuración Previa](./0-setup-requirements.md)

**Primera vez configurando el proyecto**

Instala todas las herramientas necesarias:

- Node.js
- Git
- Docker Desktop
- VS Code
- Supabase CLI

**Tiempo estimado:** 30-60 minutos

---

### [1. Estrategia Supabase Online (Producción)](./1-supabase-production.md)

**Entendiendo el entorno de producción**

Aprende:

- Qué es el proyecto Supabase en la nube
- Reglas de oro para NO romper producción
- Cómo vincular tu proyecto local con producción
- Cómo desplegar cambios de forma segura

**Tiempo estimado:** 15 minutos de lectura

---

### [2. Entorno Local con Docker](./2-local-development-docker.md)

**Tu "taller" personal de desarrollo**

Configura:

- Supabase corriendo en Docker
- Puertos personalizados para Windows
- Variables de entorno locales
- Studio local (interfaz visual)

**Tiempo estimado:** 30 minutos

---

### [3. Flujo de Trabajo: Git, Ramas y Vercel](./3-branching-vercel-cicd.md)

**Cómo trabajar en equipo sin pisarse**

Implementa:

- Estrategia de branching (develop → main)
- Pull Requests
- Despliegues automáticos con Vercel
- Previews de staging

**Tiempo estimado:** 20 minutos de lectura

---

### [4. Troubleshooting y Comandos Comunes](./4-troubleshooting-cheatsheet.md)

**Tu guía de rescate cuando algo falla**

Soluciones para:

- Errores de Docker
- Problemas de puertos en Windows
- Conflictos de migraciones
- Errores de conexión

**Tiempo estimado:** Referencia rápida (consultar cuando necesites)

---

### [5. Guía del Día a Día](./5-day-to-day-guide.md)

**Tu receta de cocina para cada sesión de desarrollo**

Flujo completo:

1. Sincronizar código
2. Crear rama
3. Desarrollar (frontend + backend)
4. Generar migraciones
5. Commit y push
6. Pull Request
7. Deploy a producción

**Tiempo estimado:** Referencia diaria

---

## 🚀 Inicio Rápido

### Si es tu primera vez:

```bash
# 1. Leer en orden
0-setup-requirements.md
1-supabase-production.md
2-local-development-docker.md

# 2. Configurar todo
# (Sigue los pasos de cada guía)

# 3. Empezar a trabajar
# (Usa la guía 5 como referencia diaria)
```

### Si ya tienes todo configurado:

```bash
# Cada día que trabajas:
1. Abre Docker Desktop
2. git pull origin develop
3. npx supabase start
4. npm run dev

# Consulta la guía 5 para el flujo completo
```

---

## 🗺️ Arquitectura del Stack

```
┌─────────────────────────────────────────────────────────┐
│                     USUARIO FINAL                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              VERCEL (Frontend Hosting)                  │
│                                                         │
│  ┌─────────────────────────────────────────┐           │
│  │  Next.js / Astro App                    │           │
│  │  - Pages/Routes                         │           │
│  │  - Components                           │           │
│  │  - Client-side logic                    │           │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Backend as a Service)            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ PostgreSQL   │  │ Auth         │  │ Storage      │ │
│  │ - Tables     │  │ - Users      │  │ - Files      │ │
│  │ - RLS        │  │ - Sessions   │  │ - Buckets    │ │
│  │ - Functions  │  │ - Providers  │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Realtime     │  │ Edge Funcs   │                    │
│  │ - Subs       │  │ - Serverless │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  GITHUB (Source Control)                │
│                                                         │
│  main (producción) ← develop ← feature/*                │
│                                                         │
│  GitHub Actions (CI/CD)                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### Desarrollo Local

```
Tu PC:
  ├─ Docker (Supabase local)
  │   ├─ PostgreSQL (puerto 60022)
  │   ├─ Studio (puerto 60023)
  │   └─ API (puerto 60021)
  │
  └─ Next.js/Astro (puerto 3000)
      └─ Conecta a Supabase local (127.0.0.1:60021)
```

### Producción

```
Internet:
  ├─ Vercel (tu-app.vercel.app)
  │   └─ Next.js/Astro
  │       └─ Conecta a Supabase Cloud
  │
  └─ Supabase Cloud (abc-xyz.supabase.co)
      └─ PostgreSQL + Auth + Storage
```

---

## 📋 Comandos Más Usados

### Supabase

```bash
# Iniciar entorno local
npx supabase start

# Detener entorno local
npx supabase stop

# Ver estado y URLs
npx supabase status

# Generar migración
npx supabase db diff -f nombre_descriptivo

# Aplicar migraciones a producción
npx supabase db push

# Traer estructura de producción
npx supabase db pull

# Resetear base de datos local
npx supabase db reset
```

### Git

```bash
# Actualizar
git checkout develop
git pull origin develop

# Nueva rama
git checkout -b feature/nombre

# Guardar cambios
git add .
git commit -m "Descripción clara"
git push origin feature/nombre
```

### Next.js/Astro

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Tests
npm test
```

---

## 🔐 Variables de Entorno

### Local (`.env.local`)

```bash
# Supabase Local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:60021
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... (de `npx supabase status`)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (de `npx supabase status`)
```

### Producción (Vercel)

```bash
# Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://abc-xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... (de Supabase Dashboard)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (de Supabase Dashboard)
```

**Configurar en Vercel:**

1. Project Settings → Environment Variables
2. Agregar cada variable
3. Seleccionar entornos (Production, Preview, Development)

---

## ✅ Checklist de Configuración Completa

Antes de empezar a desarrollar, verifica:

- [ ] **Herramientas instaladas**
  - [ ] Node.js v18+
  - [ ] Git
  - [ ] Docker Desktop (corriendo)
  - [ ] VS Code

- [ ] **Proyecto configurado**
  - [ ] Repositorio clonado
  - [ ] `npm install` ejecutado
  - [ ] Supabase CLI instalado (`npm install -D supabase`)
  - [ ] Login a Supabase (`npx supabase login`)

- [ ] **Entorno local funcionando**
  - [ ] `npx supabase start` funciona
  - [ ] Studio local accesible (http://127.0.0.1:60023)
  - [ ] `.env.local` configurado
  - [ ] `npm run dev` funciona

- [ ] **Accesos**
  - [ ] Acceso al repositorio en GitHub
  - [ ] Acceso al proyecto en Supabase Cloud
  - [ ] Acceso al proyecto en Vercel (si aplica)

---

## 🆘 ¿Necesitas Ayuda?

1. **Consulta primero:** [Troubleshooting](./4-troubleshooting-cheatsheet.md)
2. **Documentación oficial:**
   - [Supabase Docs](https://supabase.com/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Astro Docs](https://docs.astro.build)
   - [Vercel Docs](https://vercel.com/docs)
3. **Pregunta al equipo:** Slack, Discord, o tu canal de comunicación

---

## 🔗 Relación con Guías Universales

Estas guías implementan los conceptos de:

- [Control de Versiones](../../universal/1-version-control.md) → Git + GitHub
- [Entornos](../../universal/2-environments.md) → Docker local + Supabase Cloud
- [Migraciones](../../universal/3-database-migrations.md) → Supabase Migrations
- [CI/CD](../../universal/4-cicd-deployment.md) → Vercel + GitHub Actions
- [Workflow](../../universal/5-development-workflow.md) → Flujo día a día

**Recomendación:** Si algo no está claro aquí, lee la guía universal correspondiente para entender el "por qué" detrás del "cómo".
