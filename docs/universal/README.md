# Guías Universales de Desarrollo Web

Estos documentos explican **conceptos fundamentales** que aplican a cualquier proyecto de desarrollo web moderno, sin importar las tecnologías específicas que uses.

## 🎯 Objetivo

Entender los **principios** y **mejores prácticas** que te permitirán trabajar profesionalmente en cualquier equipo de desarrollo.

---

## 📚 Índice de Guías

### [1. Control de Versiones](./1-version-control.md)

**Conceptos:** Git, ramas (branches), commits, pull requests, resolución de conflictos

**Aprenderás:**

- Por qué necesitamos control de versiones
- Qué son las ramas y cómo se usan
- Flujos de trabajo comunes (Git Flow, GitHub Flow, Trunk-based)
- Cómo colaborar sin pisar el trabajo de otros

---

### [2. Entornos de Desarrollo](./2-environments.md)

**Conceptos:** Local, staging, production, variables de entorno, configuración

**Aprenderás:**

- Por qué separamos desarrollo de producción
- Qué es un entorno local y cómo configurarlo
- Cómo usar variables de entorno (.env)
- Estrategias para mantener paridad entre entornos

---

### [3. Migraciones de Base de Datos](./3-database-migrations.md)

**Conceptos:** Schema, migraciones, versionado de base de datos, rollbacks

**Aprenderás:**

- Qué son las migraciones y por qué son críticas
- Cómo versionar cambios de base de datos
- Diferencia entre DDL y DML
- Cómo revertir cambios de forma segura

---

### [4. CI/CD y Despliegues](./4-cicd-deployment.md)

**Conceptos:** Integración continua, despliegue continuo, pipelines, automatización

**Aprenderás:**

- Qué es CI/CD y por qué lo necesitas
- Cómo automatizar pruebas y despliegues
- Estrategias de despliegue (blue-green, canary, rolling)
- Cómo hacer rollbacks seguros

---

### [5. Flujo de Trabajo de Desarrollo](./5-development-workflow.md)

**Conceptos:** Ciclo de desarrollo, code review, testing, documentación

**Aprenderás:**

- El ciclo completo: planificación → desarrollo → revisión → despliegue
- Mejores prácticas para commits y pull requests
- Cómo hacer code reviews efectivos
- Cuándo y cómo documentar tu código

---

## 🗺️ Ruta de Aprendizaje Sugerida

```
1. Control de Versiones (Git)
   ↓
2. Entornos de Desarrollo
   ↓
3. Migraciones de Base de Datos
   ↓
4. CI/CD y Despliegues
   ↓
5. Flujo de Trabajo Completo
```

---

## 💡 Cómo usar estas guías

### Para principiantes:

Lee las guías **en orden**. Cada una construye sobre conceptos de la anterior.

### Para desarrolladores con experiencia:

Usa estas guías como **referencia** cuando necesites:

- Explicar conceptos a compañeros nuevos
- Refrescar mejores prácticas
- Comparar diferentes enfoques

### Para líderes técnicos:

Usa estas guías para:

- Establecer estándares en tu equipo
- Onboarding de nuevos miembros
- Documentación de procesos

---

## 🔗 Relación con Guías Específicas

Estas guías universales explican el **QUÉ** y el **POR QUÉ**.

Las [guías específicas de stack](../stacks/) explican el **CÓMO** con herramientas concretas.

**Ejemplo:**

- **Universal:** "Las migraciones permiten versionar cambios de base de datos"
- **Específica (Supabase):** "Usa `npx supabase db diff -f nombre` para crear una migración"

---

## 🤝 Contribuir

Si encuentras conceptos que faltan o explicaciones poco claras, estas guías están diseñadas para mejorar con el tiempo.
