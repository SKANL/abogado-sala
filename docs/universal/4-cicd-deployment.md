# 4. CI/CD y Despliegues: Automatizando el Camino a Producción

## ¿Qué es CI/CD?

**CI/CD** son las siglas de **Continuous Integration** (Integración Continua) y **Continuous Deployment** (Despliegue Continuo).

**Analogía:** Es como tener un robot que:

1. Revisa que tu código funcione (CI)
2. Lo sube automáticamente a producción si todo está bien (CD)

---

## 🔄 Los Dos Pilares

### CI - Continuous Integration (Integración Continua)

**Objetivo:** Detectar problemas temprano, antes de que lleguen a producción.

**Qué hace:**

```
Cada vez que haces push a Git:
  1. Ejecuta tests automáticos
  2. Verifica que el código compile
  3. Revisa estándares de código (linting)
  4. Ejecuta análisis de seguridad
  5. Genera reportes
```

**Ejemplo:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Lint code
        run: npm run lint
```

### CD - Continuous Deployment (Despliegue Continuo)

**Objetivo:** Llevar código a producción de forma automática y segura.

**Qué hace:**

```
Si todos los tests pasan:
  1. Construye la aplicación (build)
  2. Despliega a staging automáticamente
  3. (Opcional) Despliega a producción automáticamente
  4. Notifica al equipo
```

**Variante: Continuous Delivery**

- Similar, pero requiere aprobación manual antes de producción
- Más común en empresas grandes

---

## 🏗️ Componentes de un Pipeline CI/CD

### 1. Trigger (Disparador)

¿Qué inicia el proceso?

```yaml
# Ejemplos de triggers
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * *" # Diario a medianoche
```

### 2. Build (Construcción)

Preparar la aplicación para ejecutarse.

```bash
# Frontend
npm run build

# Backend
docker build -t miapp:latest .

# Compilar TypeScript
tsc
```

### 3. Test (Pruebas)

Verificar que todo funciona.

```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests end-to-end
npm run test:e2e
```

### 4. Deploy (Despliegue)

Subir a los servidores.

```bash
# Vercel
vercel --prod

# Heroku
git push heroku main

# AWS
aws deploy ...
```

---

## 🎯 Estrategias de Despliegue

### 1. All-at-Once (Todo de una vez)

```
Versión Antigua → [APAGÓN] → Versión Nueva
```

**Ventajas:**

- ✅ Simple
- ✅ Rápido

**Desventajas:**

- ❌ Downtime (la app se cae temporalmente)
- ❌ Si falla, todos los usuarios afectados

**Cuándo usar:** Proyectos pequeños, horarios de bajo tráfico

### 2. Rolling Deployment (Despliegue Gradual)

```
Servidor 1: Antigua → Nueva
Servidor 2: Antigua → Nueva
Servidor 3: Antigua → Nueva
```

**Ventajas:**

- ✅ Sin downtime
- ✅ Si falla, solo afecta a algunos usuarios

**Desventajas:**

- ❌ Más complejo
- ❌ Versiones mixtas temporalmente

**Cuándo usar:** Aplicaciones con múltiples servidores

### 3. Blue-Green Deployment

```
Blue (Antigua) ← 100% tráfico
Green (Nueva)  ← 0% tráfico

[Switch instantáneo]

Blue (Antigua) ← 0% tráfico
Green (Nueva)  ← 100% tráfico
```

**Ventajas:**

- ✅ Rollback instantáneo (volver a Blue)
- ✅ Sin downtime
- ✅ Pruebas en Green antes de switch

**Desventajas:**

- ❌ Requiere doble infraestructura
- ❌ Más costoso

**Cuándo usar:** Aplicaciones críticas, grandes empresas

### 4. Canary Deployment (Despliegue Canario)

```
Versión Antigua ← 95% tráfico
Versión Nueva   ← 5% tráfico

Si todo bien:
Versión Antigua ← 50% tráfico
Versión Nueva   ← 50% tráfico

Si todo bien:
Versión Nueva   ← 100% tráfico
```

**Ventajas:**

- ✅ Detecta problemas con impacto mínimo
- ✅ Rollback fácil
- ✅ Validación con usuarios reales

**Desventajas:**

- ❌ Complejo de configurar
- ❌ Requiere monitoreo sofisticado

**Cuándo usar:** Aplicaciones grandes, cambios riesgosos

---

## 🛠️ Herramientas Populares

### Plataformas CI/CD

| Herramienta        | Mejor Para                   | Precio               |
| ------------------ | ---------------------------- | -------------------- |
| **GitHub Actions** | Proyectos en GitHub          | Gratis (con límites) |
| **GitLab CI/CD**   | Proyectos en GitLab          | Gratis (con límites) |
| **CircleCI**       | Equipos medianos             | Gratis + Pago        |
| **Jenkins**        | Empresas grandes, on-premise | Gratis (self-hosted) |
| **Travis CI**      | Proyectos open source        | Gratis (OSS)         |

### Plataformas de Hosting con CI/CD Integrado

| Plataforma  | Especialidad           | CI/CD Automático |
| ----------- | ---------------------- | ---------------- |
| **Vercel**  | Next.js, React         | ✅ Sí            |
| **Netlify** | JAMstack, Static Sites | ✅ Sí            |
| **Railway** | Full-stack, Databases  | ✅ Sí            |
| **Render**  | Full-stack             | ✅ Sí            |
| **Heroku**  | General purpose        | ⚠️ Básico        |

---

## 📋 Ejemplo Completo: GitHub Actions + Vercel

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Job 1: Tests
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

  # Job 2: Deploy (solo si tests pasan)
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: "--prod"
```

---

## 🔐 Secretos y Variables de Entorno

### ¿Qué son los Secretos?

Información sensible que NO debe estar en el código:

- API keys
- Contraseñas de base de datos
- Tokens de autenticación

### Cómo Manejarlos

#### En GitHub Actions:

```yaml
# Usar secretos
steps:
  - name: Deploy
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      API_KEY: ${{ secrets.API_KEY }}
    run: npm run deploy
```

**Configuración:**

1. Ve a tu repo en GitHub
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Agrega `DATABASE_URL`, `API_KEY`, etc.

#### En Vercel:

```bash
# Desde la CLI
vercel env add DATABASE_URL production

# O desde el dashboard web
# Project Settings → Environment Variables
```

---

## 🚨 Manejo de Errores y Rollbacks

### Detección de Problemas

```yaml
# Notificaciones en caso de fallo
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: "Deploy failed! 🚨"
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Rollback Automático

```yaml
# Health check después del deploy
- name: Health check
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://miapp.com/health)
    if [ $response != "200" ]; then
      echo "Health check failed!"
      exit 1
    fi

- name: Rollback on failure
  if: failure()
  run: vercel rollback
```

---

## 📊 Monitoreo Post-Despliegue

### Métricas Clave

```yaml
# Ejemplo con Sentry (error tracking)
- name: Create Sentry release
  run: |
    sentry-cli releases new ${{ github.sha }}
    sentry-cli releases set-commits ${{ github.sha }} --auto
    sentry-cli releases finalize ${{ github.sha }}
```

**Qué monitorear:**

- ✅ Tasa de errores (error rate)
- ✅ Tiempo de respuesta (latency)
- ✅ Uso de recursos (CPU, memoria)
- ✅ Tráfico de usuarios

---

## ✅ Mejores Prácticas

### 1. Tests Rápidos Primero

```yaml
# Ejecuta tests rápidos primero para fallar rápido
jobs:
  lint: # 30 segundos
  unit-tests: # 2 minutos
  integration: # 5 minutos
  e2e: # 15 minutos
```

### 2. Cachea Dependencias

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Ambientes Separados

```yaml
# develop → staging
# main → production
on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    steps:
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: vercel --env=staging

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: vercel --prod
```

### 4. Versionado Semántico

```bash
# v1.2.3
# MAJOR.MINOR.PATCH

# MAJOR: Cambios incompatibles
# MINOR: Nueva funcionalidad compatible
# PATCH: Bug fixes
```

---

## 🎓 Checklist de CI/CD

Para un pipeline robusto, asegúrate de tener:

- [ ] **Tests automatizados**
  - [ ] Unitarios
  - [ ] Integración
  - [ ] E2E (al menos para flujos críticos)

- [ ] **Validaciones de código**
  - [ ] Linting (ESLint, Prettier)
  - [ ] Type checking (TypeScript)
  - [ ] Security scanning

- [ ] **Proceso de deploy**
  - [ ] Build automático
  - [ ] Deploy a staging automático
  - [ ] Deploy a producción (automático o manual)

- [ ] **Monitoreo**
  - [ ] Health checks
  - [ ] Error tracking
  - [ ] Performance monitoring

- [ ] **Rollback plan**
  - [ ] Proceso documentado
  - [ ] Automatizado si es posible

---

## 🔗 Siguiente Paso

Ahora que entiendes cómo automatizar despliegues, aprende sobre el [**Flujo de Trabajo de Desarrollo**](./5-development-workflow.md) completo que integra todos estos conceptos.
