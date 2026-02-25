# Documentación del Proyecto

Esta documentación está organizada en dos secciones principales:

## 📚 Guías Universales

Conceptos fundamentales de desarrollo web que aplican a **cualquier proyecto**, independientemente de las tecnologías específicas que uses.

- **[Conceptos Fundamentales](./universal/README.md)** - Principios básicos de desarrollo web moderno

## 🛠️ Guías Específicas de Tecnología

Implementaciones concretas para stacks tecnológicos específicos.

### Stack Actual: Supabase + Next.js/Astro + Vercel + GitHub

- **[Guía Completa del Stack](./stacks/supabase-nextjs-vercel/README.md)** - Documentación específica para nuestro stack actual

---

## 🎯 ¿Qué guía debo leer?

### Si eres nuevo en desarrollo web:

1. Empieza con las **Guías Universales** para entender los conceptos
2. Luego pasa a la **Guía Específica** de tu stack

### Si ya tienes experiencia:

- Ve directo a la **Guía Específica** del stack que estás usando
- Consulta las **Guías Universales** cuando necesites refrescar conceptos

---

## 📖 Estructura de Carpetas

```
docs/
├── README.md                          # Este archivo
├── universal/                         # Conceptos que aplican a cualquier proyecto
│   ├── README.md
│   ├── 1-version-control.md          # Git, branching, workflows
│   ├── 2-environments.md             # Local, staging, production
│   ├── 3-database-migrations.md      # Qué son y por qué usarlas
│   ├── 4-cicd-deployment.md          # Integración y despliegue continuo
│   └── 5-development-workflow.md     # Flujo de trabajo general
│
└── stacks/                            # Implementaciones específicas
    └── supabase-nextjs-vercel/       # Nuestro stack actual
        ├── README.md
        ├── 0-setup-requirements.md
        ├── 1-supabase-production.md
        ├── 2-local-development-docker.md
        ├── 3-branching-vercel-cicd.md
        ├── 4-troubleshooting-cheatsheet.md
        └── 5-day-to-day-guide.md
```

---

## 🚀 Inicio Rápido

Si quieres empezar a trabajar **ahora mismo** en este proyecto:

1. Lee los [Requisitos de Configuración](./stacks/supabase-nextjs-vercel/0-setup-requirements.md)
2. Sigue la [Guía del Día a Día](./stacks/supabase-nextjs-vercel/5-day-to-day-guide.md)
3. Consulta el [Troubleshooting](./stacks/supabase-nextjs-vercel/4-troubleshooting-cheatsheet.md) cuando tengas problemas

---

## 🔮 Futuros Stacks

A medida que el proyecto evolucione, agregaremos más guías específicas:

- `stacks/firebase-react-cloudflare/` - Para proyectos con Firebase
- `stacks/mongodb-express-aws/` - Para proyectos con MongoDB
- `stacks/django-postgres-heroku/` - Para proyectos con Django
- etc.
