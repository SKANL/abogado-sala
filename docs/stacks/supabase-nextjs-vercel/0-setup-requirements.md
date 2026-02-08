# 0. Guía de Inicio: Requisitos y Configuración Previa

> **📚 Contexto:** Esta guía implementa los conceptos de [Entornos de Desarrollo](../../universal/2-environments.md) usando Docker y Supabase.
> Si quieres entender el "por qué" detrás de cada herramienta, lee primero las [Guías Universales](../../universal/README.md).

---

**¡Bienvenido!** 👋

Esta guía te mostrará **cómo configurar** un entorno de desarrollo profesional para aplicaciones Full-Stack con **Next.js/Astro + Supabase + Docker + Vercel**.

**Objetivo:** Desarrollar en tu PC local sin romper nada en producción, usando herramientas estándar de la industria.

---

## 🛠️ Herramientas Necesarias (Descargar e Instalar)

Antes de escribir una sola línea de código, necesitas tener instalado lo siguiente en tu computadora.

### 1. Node.js (Entorno de Ejecución)

Es el motor que hace funcionar tu aplicación Web (Next.js/Astro).

- **Descargar:** [nodejs.org](https://nodejs.org/) (Baja la versión **LTS** - Long Term Support).
- **Verificar instalación:** Abre una terminal (PowerShell o CMD) y escribe:
  ```bash
  node -v
  # Debería salir algo como v20.x.x
  ```

### 2. Git (Control de Versiones)

Para guardar el historial de cambios de tu código y trabajar en equipo.

- **Descargar:** [git-scm.com](https://git-scm.com/downloads)
- **Verificar:**
  ```bash
  git --version
  ```

### 3. Docker Desktop (Base de Datos Local)

Este es el componente más crítico. Nos permite tener una copia exacta de Supabase funcionando dentro de tu PC.

- **Descargar:** [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
- **Instalación en Windows:**
  - Durante la instalación, asegúrate de marcar la casilla **"Use WSL 2 based engine"** (es mucho más rápido y estable).
  - Una vez instalado, abre "Docker Desktop" y espera a que el icono de la ballena (o barco) en la barra de tareas deje de moverse (estado "Running").
- **Verificar:**
  ```bash
  docker --version
  ```

### 4. VS Code (Editor de Código)

El editor recomendado.

- **Descargar:** [code.visualstudio.com](https://code.visualstudio.com/)
- **Extensiones recomendadas (Instalar desde el editor):**
  - **ESLint / Prettier:** Para formatear código.
  - **Supabase (oficial):** Ayuda con la sintaxis de archivos SQL.
  - **Docker:** Para ver tus contenedores fácilmente.

---

## ⚙️ Configuración del Proyecto (Pasos Iniciales)

Una vez instaladas las herramientas, prepara tu entorno para este proyecto específico.

### Paso A: Instalar Supabase CLI

El CLI (Command Line Interface) es la herramienta que nos permite controlar la base de datos desde la terminal.

1.  Abre la terminal en la carpeta de tu proyecto.
2.  Ejecuta este comando para instalarlo como una herramienta de desarrollo del proyecto (así todos en el equipo usan la misma versión):
    ```bash
    npm install -D supabase
    ```
3.  Verifica que funcione:
    ```bash
    npx supabase --version
    ```

### Paso B: Iniciar Sesión en Supabase

Necesitas conectar tu máquina con tu cuenta de Supabase en la nube.

1.  Ejecuta:
    ```bash
    npx supabase login
    ```
2.  Presiona `Enter`. Se abrirá el navegador.
3.  Haz clic en "Confirmar" o "Authorize".
4.  Cierra la pestaña y vuelve a la terminal. Debería decir "You are now logged in".

---

## ✅ Checklist de Verificación

Antes de pasar a la **Guía 1**, asegúrate de que puedes marcar todo esto:

- [ ] Node.js instalado (v18 o superior).
- [ ] Git instalado.
- [ ] Docker Desktop está abierto y dice "Running".
- [ ] Supabase CLI instalado en el proyecto.
- [ ] Has hecho login con `npx supabase login`.

**¿Listo?** Pasa al archivo `1-supabase-production.md`.
