# 1. Control de Versiones: La Base de Todo

## ¿Qué es el Control de Versiones?

Imagina que estás escribiendo un libro con 10 personas al mismo tiempo. Sin un sistema, sería caos:

- ¿Quién escribió qué?
- ¿Cómo volvemos a una versión anterior si algo salió mal?
- ¿Cómo trabajamos en capítulos diferentes sin pisarnos?

El **control de versiones** es ese sistema. En desarrollo de software, usamos principalmente **Git**.

---

## 🎯 Conceptos Fundamentales

### 1. Repositorio (Repository)

Es la "carpeta mágica" donde Git guarda todo el historial de tu proyecto.

**Tipos:**

- **Local:** En tu computadora
- **Remoto:** En la nube (GitHub, GitLab, Bitbucket)

### 2. Commit

Un "punto de guardado" en el tiempo. Cada commit tiene:

- **Cambios:** Qué archivos se modificaron
- **Mensaje:** Por qué se hicieron esos cambios
- **Autor:** Quién lo hizo
- **Timestamp:** Cuándo se hizo

**Buenas prácticas para commits:**

```bash
# ❌ Mal
git commit -m "fix"
git commit -m "cambios"

# ✅ Bien
git commit -m "Corrige validación de email en formulario de registro"
git commit -m "Agrega índice a columna user_id para mejorar performance"
```

### 3. Ramas (Branches)

Líneas paralelas de desarrollo. Te permiten trabajar en nuevas funcionalidades sin afectar el código estable.

**Analogía:** Son como universos paralelos donde puedes experimentar. Si funciona, lo fusionas con la realidad principal.

```
main (producción)     ●──────●──────●──────●
                       \            /
feature/login           ●──●──●──●
```

---

## 🌳 Estrategias de Branching

### Git Flow (Complejo, equipos grandes)

```
main (producción)
  ↓
develop (desarrollo)
  ↓
feature/* (funcionalidades)
hotfix/* (arreglos urgentes)
release/* (preparación de versiones)
```

**Cuándo usar:**

- Equipos grandes (10+ personas)
- Releases programados (ej: cada 2 semanas)
- Productos con múltiples versiones en producción

### GitHub Flow (Simple, equipos ágiles)

```
main (producción)
  ↓
feature/* (todo lo demás)
```

**Cuándo usar:**

- Equipos pequeños/medianos (1-10 personas)
- Despliegues frecuentes (varias veces al día)
- Aplicaciones web modernas

### Trunk-Based Development (Muy simple, CI/CD avanzado)

```
main (todos trabajan aquí)
  ↓
Commits pequeños y frecuentes
Feature flags para código incompleto
```

**Cuándo usar:**

- Equipos muy maduros con CI/CD robusto
- Cultura de commits pequeños y frecuentes
- Testing automatizado extensivo

---

## 🔄 El Ciclo de Trabajo con Git

### 1. Clonar o Actualizar

```bash
# Primera vez
git clone <url-del-repositorio>

# Días siguientes
git pull origin main
```

### 2. Crear una Rama

```bash
# Crear y cambiar a nueva rama
git checkout -b feature/nueva-funcionalidad

# Alternativa moderna
git switch -c feature/nueva-funcionalidad
```

### 3. Hacer Cambios

```bash
# Ver qué cambió
git status

# Agregar archivos al "staging"
git add archivo.js
git add .  # Todos los archivos

# Guardar cambios (commit)
git commit -m "Descripción clara del cambio"
```

### 4. Subir a la Nube

```bash
git push origin feature/nueva-funcionalidad
```

### 5. Pull Request / Merge Request

- Se hace en la interfaz web (GitHub, GitLab)
- Otros revisan tu código
- Se discuten cambios
- Se aprueba y fusiona (merge)

---

## 🚨 Resolución de Conflictos

### ¿Qué es un conflicto?

Ocurre cuando dos personas modifican las mismas líneas de código.

**Ejemplo:**

```javascript
<<<<<<< HEAD (tu versión)
const nombre = "Juan";
=======
const nombre = "María";
>>>>>>> feature/otro-cambio (versión de otro)
```

### Cómo resolverlo:

1. **Decide qué versión es correcta** (o combina ambas)
2. **Elimina las marcas** (`<<<<<<<`, `=======`, `>>>>>>>`)
3. **Guarda el archivo**
4. **Haz commit** del resultado

```bash
git add archivo-con-conflicto.js
git commit -m "Resuelve conflicto en nombre de usuario"
```

---

## 📋 Comandos Esenciales

| Comando               | Qué hace                                |
| --------------------- | --------------------------------------- |
| `git status`          | Muestra qué archivos cambiaron          |
| `git log`             | Historial de commits                    |
| `git diff`            | Muestra cambios línea por línea         |
| `git checkout <rama>` | Cambia de rama                          |
| `git merge <rama>`    | Fusiona otra rama en la actual          |
| `git pull`            | Baja cambios de la nube                 |
| `git push`            | Sube cambios a la nube                  |
| `git stash`           | Guarda cambios temporalmente sin commit |
| `git reset --hard`    | ⚠️ PELIGRO: Borra cambios locales       |

---

## ✅ Mejores Prácticas

### 1. Commits Pequeños y Frecuentes

```bash
# ❌ Mal: Un commit gigante al final del día
git commit -m "Hice todo el módulo de usuarios"

# ✅ Bien: Commits incrementales
git commit -m "Agrega modelo de Usuario"
git commit -m "Agrega validación de email"
git commit -m "Agrega endpoint de registro"
```

### 2. Mensajes Descriptivos

```bash
# ❌ Mal
git commit -m "fix"
git commit -m "wip"

# ✅ Bien
git commit -m "Corrige validación de fecha en formulario de citas"
git commit -m "Optimiza query de búsqueda de usuarios (de 2s a 200ms)"
```

### 3. Nunca Trabajes Directo en `main`

```bash
# ❌ Mal
git checkout main
# ... hacer cambios ...
git commit -m "cambios"

# ✅ Bien
git checkout -b feature/mi-cambio
# ... hacer cambios ...
git commit -m "Descripción clara"
```

### 4. Actualiza Antes de Empezar

```bash
# Cada mañana o antes de crear una rama nueva
git checkout main
git pull origin main
git checkout -b feature/nueva-tarea
```

---

## 🎓 Recursos para Aprender Más

- **Interactivo:** [learngitbranching.js.org](https://learngitbranching.js.org/)
- **Libro gratuito:** [Pro Git](https://git-scm.com/book/es/v2)
- **Cheat sheet:** [GitHub Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

## 🔗 Siguiente Paso

Ahora que entiendes cómo versionar código, aprende sobre [**Entornos de Desarrollo**](./2-environments.md) para entender dónde y cómo ejecutar ese código.
