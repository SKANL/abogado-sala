# 5. Flujo de Trabajo de Desarrollo: Juntando Todo

Esta guía integra todos los conceptos anteriores en un **flujo de trabajo completo** que puedes seguir día a día.

---

## 🎯 El Ciclo Completo de Desarrollo

```
┌─────────────────────────────────────────────────────────┐
│  1. PLANIFICACIÓN                                       │
│     ↓                                                   │
│  2. CONFIGURACIÓN DE ENTORNO                            │
│     ↓                                                   │
│  3. DESARROLLO                                          │
│     ↓                                                   │
│  4. TESTING                                             │
│     ↓                                                   │
│  5. CODE REVIEW                                         │
│     ↓                                                   │
│  6. INTEGRACIÓN                                         │
│     ↓                                                   │
│  7. DESPLIEGUE                                          │
│     ↓                                                   │
│  8. MONITOREO                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Fase 1: Planificación

### Antes de Escribir Código

**Pregúntate:**

- ¿Qué problema estoy resolviendo?
- ¿Cómo se verá la solución?
- ¿Qué cambios de base de datos necesito?
- ¿Afecta a otras partes del sistema?

**Herramientas:**

- Issues en GitHub/GitLab
- Tableros Kanban (Trello, Jira, GitHub Projects)
- Documentación de diseño

**Ejemplo de Issue:**

```markdown
## Descripción

Agregar funcionalidad de reseteo de contraseña

## Tareas

- [ ] Crear tabla `password_reset_tokens`
- [ ] Endpoint POST `/api/auth/forgot-password`
- [ ] Endpoint POST `/api/auth/reset-password`
- [ ] Email template para reseteo
- [ ] Página de reseteo en frontend
- [ ] Tests unitarios
- [ ] Tests E2E

## Criterios de Aceptación

- Usuario recibe email con link de reseteo
- Link expira en 1 hora
- Contraseña se actualiza correctamente
```

---

## 🛠️ Fase 2: Configuración de Entorno

### Cada Vez que Empiezas a Trabajar

```bash
# 1. Asegúrate de estar actualizado
git checkout develop
git pull origin develop

# 2. Crea tu rama de trabajo
git checkout -b feature/password-reset

# 3. Enciende tu entorno local
docker-compose up -d
# O: npx supabase start
# O: npm run dev:services

# 4. Verifica que todo funciona
npm run dev
```

---

## 💻 Fase 3: Desarrollo

### El Ciclo Interno (Repetir hasta completar)

#### 1. Escribe Código

```javascript
// src/api/auth/forgot-password.js
export async function forgotPassword(email) {
  // Implementación
}
```

#### 2. Prueba Manualmente

```bash
# Levanta el servidor
npm run dev

# Prueba en el navegador o con curl
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

#### 3. Escribe Tests

```javascript
// tests/auth/forgot-password.test.js
describe("Forgot Password", () => {
  it("should send reset email for valid user", async () => {
    const response = await forgotPassword("user@example.com");
    expect(response.status).toBe(200);
    expect(emailSent).toBe(true);
  });

  it("should not reveal if email does not exist", async () => {
    const response = await forgotPassword("nonexistent@example.com");
    expect(response.status).toBe(200); // Mismo status por seguridad
  });
});
```

#### 4. Commits Frecuentes

```bash
# Cada vez que completes una parte lógica
git add src/api/auth/forgot-password.js
git commit -m "Agrega endpoint de forgot password"

git add tests/auth/forgot-password.test.js
git commit -m "Agrega tests para forgot password"
```

### Cambios de Base de Datos

```bash
# 1. Haz cambios en tu DB local (usando Studio o SQL)
# Ejemplo: Crear tabla password_reset_tokens

# 2. Genera migración
npx supabase db diff -f create_password_reset_tokens

# 3. Verifica el archivo generado
cat supabase/migrations/20240207_create_password_reset_tokens.sql

# 4. Commit la migración
git add supabase/migrations/20240207_create_password_reset_tokens.sql
git commit -m "Agrega tabla de tokens de reseteo de contraseña"
```

---

## 🧪 Fase 4: Testing

### Niveles de Testing

#### 1. Tests Unitarios (Rápidos)

```bash
npm run test:unit
# Prueba funciones individuales aisladas
```

#### 2. Tests de Integración (Medianos)

```bash
npm run test:integration
# Prueba cómo interactúan componentes
```

#### 3. Tests E2E (Lentos pero completos)

```bash
npm run test:e2e
# Prueba flujos completos como usuario real
```

### Estrategia de Testing

```
Pirámide de Testing:

        /\
       /E2E\      ← Pocos, flujos críticos
      /──────\
     /  INT   \   ← Algunos, integraciones clave
    /──────────\
   /   UNIT     \ ← Muchos, toda la lógica
  /──────────────\
```

**Regla general:**

- 70% tests unitarios
- 20% tests de integración
- 10% tests E2E

---

## 👥 Fase 5: Code Review

### Preparar tu Pull Request

```bash
# 1. Asegúrate de que todo funciona
npm run test
npm run lint
npm run build

# 2. Sube tu rama
git push origin feature/password-reset

# 3. Crea Pull Request en GitHub/GitLab
```

### Descripción de PR (Template)

```markdown
## ¿Qué hace este PR?

Agrega funcionalidad de reseteo de contraseña

## Cambios principales

- Nuevo endpoint `/api/auth/forgot-password`
- Nuevo endpoint `/api/auth/reset-password`
- Tabla `password_reset_tokens` en base de datos
- Email template para reseteo
- Página de UI para resetear contraseña

## Screenshots

[Adjuntar capturas de pantalla si aplica]

## Checklist

- [x] Tests agregados/actualizados
- [x] Documentación actualizada
- [x] Migración de DB incluida
- [x] No hay console.logs olvidados
- [x] Variables de entorno documentadas en .env.example

## Testing

- [x] Probado en local
- [ ] Probado en staging (después del merge)

## Notas para reviewers

- El token expira en 1 hora por seguridad
- Usamos el mismo mensaje de éxito aunque el email no exista (prevenir enumeración de usuarios)
```

### Qué Buscar en Code Review

**Como autor:**

- ✅ Código limpio y legible
- ✅ Tests que cubren casos edge
- ✅ Sin código comentado o debug
- ✅ Variables de entorno documentadas

**Como reviewer:**

- ✅ Lógica correcta
- ✅ Seguridad (validaciones, sanitización)
- ✅ Performance (queries eficientes)
- ✅ Mantenibilidad (código entendible)

---

## 🔄 Fase 6: Integración

### Merge a Develop

```bash
# Después de aprobación del PR
# GitHub hace el merge automáticamente

# O manualmente:
git checkout develop
git pull origin develop
git merge feature/password-reset
git push origin develop
```

### CI/CD Automático

```yaml
# Esto se ejecuta automáticamente
on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    - run: npm test
    - run: npm run build
    - run: vercel deploy --env=staging
```

---

## 🚀 Fase 7: Despliegue a Producción

### Cuándo Desplegar

**No despliegues inmediatamente después de cada feature.**

Espera a tener:

- ✅ Múltiples features probadas en staging
- ✅ Todas las pruebas pasando
- ✅ Aprobación del equipo/product owner

### Proceso de Deploy

```bash
# 1. Crear PR de develop → main
# (Se hace en GitHub/GitLab)

# 2. Revisión final del equipo

# 3. Merge a main (dispara deploy automático de frontend)

# 4. Deploy manual de base de datos
git checkout main
git pull origin main
npx supabase db push
# O: npx prisma migrate deploy

# 5. Verificar que todo funciona
curl https://miapp.com/health
```

### Ventana de Mantenimiento (Opcional)

Para cambios grandes:

```markdown
## Notificación a Usuarios

🔧 Mantenimiento Programado
Fecha: 15 de Febrero, 2024
Hora: 2:00 AM - 3:00 AM (hora local)
Duración estimada: 30 minutos

Durante este tiempo, la aplicación estará temporalmente no disponible.

Cambios incluidos:

- Nueva funcionalidad de reseteo de contraseña
- Mejoras de performance en búsqueda
- Correcciones de seguridad
```

---

## 📊 Fase 8: Monitoreo

### Inmediatamente Después del Deploy

```bash
# Revisa logs en tiempo real
vercel logs --follow
# O: heroku logs --tail
# O: kubectl logs -f deployment/miapp

# Revisa métricas
# - Tasa de errores
# - Tiempo de respuesta
# - Uso de CPU/memoria
```

### Herramientas de Monitoreo

| Herramienta          | Propósito                 |
| -------------------- | ------------------------- |
| **Sentry**           | Error tracking            |
| **LogRocket**        | Session replay            |
| **Datadog**          | Infrastructure monitoring |
| **New Relic**        | Application performance   |
| **Google Analytics** | User behavior             |

### Rollback si es Necesario

```bash
# Si algo sale mal
vercel rollback
# O: git revert <commit-hash>
# O: restaurar backup de DB
```

---

## 📋 Checklist Diario

### Al Empezar el Día

- [ ] Revisar notificaciones (PRs, issues, mensajes)
- [ ] Actualizar rama local (`git pull`)
- [ ] Revisar tablero de tareas (Kanban)
- [ ] Encender entorno local (Docker, DB)

### Durante el Desarrollo

- [ ] Commits frecuentes con mensajes claros
- [ ] Tests para código nuevo
- [ ] Documentar decisiones importantes

### Antes de Terminar

- [ ] Push de cambios a GitHub
- [ ] Actualizar estado de tareas
- [ ] Documentar blockers o dudas

---

## 🎯 Mejores Prácticas Generales

### 1. Comunicación

```markdown
# En commits

git commit -m "Corrige validación de email en registro"

# En PRs

## Contexto

Usuarios reportaban que emails con + no eran aceptados

## Solución

Actualizada regex de validación para permitir RFC 5322

# En issues

Reportar bugs con:

- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots/logs
```

### 2. Documentación

```javascript
// Documenta código complejo
/**
 * Genera un token de reseteo de contraseña
 * @param {string} userId - ID del usuario
 * @returns {Promise<string>} Token que expira en 1 hora
 */
async function generateResetToken(userId) {
  // ...
}
```

### 3. Gestión del Tiempo

```
🍅 Técnica Pomodoro:
- 25 min de trabajo enfocado
- 5 min de descanso
- Cada 4 pomodoros, descanso largo (15-30 min)
```

### 4. Manejo de Blockers

```markdown
## Cuando te atoras:

1. Intenta resolverlo (15-30 min)
2. Busca en documentación/Stack Overflow
3. Pregunta a un compañero
4. Documenta el problema en issue/Slack

No te quedes atascado en silencio por horas.
```

---

## 🔗 Recursos Adicionales

- **Git:** [Oh Shit, Git!?!](https://ohshitgit.com/) - Cómo arreglar errores comunes
- **Testing:** [Testing Library](https://testing-library.com/) - Mejores prácticas
- **Code Review:** [Google Engineering Practices](https://google.github.io/eng-practices/review/)
- **Clean Code:** [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

---

## 🎓 Conclusión

Este flujo de trabajo puede parecer complejo al principio, pero con la práctica se vuelve natural.

**Recuerda:**

- No necesitas ser perfecto desde el día 1
- Cada equipo adapta este flujo a sus necesidades
- Lo importante es ser **consistente** y **comunicativo**

---

## 🔗 Siguiente Paso

Ahora que entiendes el flujo universal, consulta las [**Guías Específicas de Stack**](../../stacks/) para ver cómo implementar esto con tecnologías concretas (Supabase, Next.js, etc.).
