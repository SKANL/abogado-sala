# Branding - Abogado Sala

Guía de identidad visual semántica. **No usar valores de color directos**.

## 1. Filosofía de Aplicación

Los colores se definen en `globals.css` (Foundation Module). Aquí definimos **cómo y cuándo usarlos**.

### Reglas de Uso de Variables

| Variable                | Uso Correcto                                       | Uso Incorrecto                    |
| ----------------------- | -------------------------------------------------- | --------------------------------- |
| `bg-primary`            | Botones principales, Badges activos, Logos         | Fondos de tarjetas, Textos largos |
| `bg-secondary`          | Fondos de secciones alternas, Badges neutros       | Botones de acción principal       |
| `bg-muted`              | Fondos de inputs deshabilitados, áreas secundarias | Textos importantes                |
| `text-muted-foreground` | Subtítulos, metadata, placeholders                 | Texto de cuerpo principal         |
| `border-border`         | Bordes de tarjetas, separadores                    | Bordes de focus (usar `ring`)     |

## 2. Tipografía (Geist Sans)

Configuración global en `layout.tsx`.

- **H1**: `font-bold tracking-tight`.
- **H2**: `font-semibold tracking-tight`.
- **Numbers**: Usar `font-mono` (Geist Mono) para tablas financieras y IDs.

## 3. Iconografía (Lucide)

Referencia a `ui-design-rules.md`.

- Estilo: `stroke-width={1.5}`.
- Color: Generalmente `text-muted-foreground` para iconos decorativos.

## 4. Branding en Admin

El panel de admin permite sobrescribir estas variables dinámicamente (`style={{ --primary: ... }}`).

- Esto refuerza la necesidad de usar SIEMPRE variables CSS y nunca clases de color fijas de Tailwind como `bg-blue-600`.
