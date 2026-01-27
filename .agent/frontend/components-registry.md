# Component Registry - Abogado Sala

Inventario de componentes de UI necesarios y su mapeo a shadcn/ui.

## Primitivas (shadcn/ui)

Instalar via `npx shadcn@latest add ...`

- [x] button
- [x] input / textarea
- [x] label
- [x] card
- [x] dialog (Modales - Mobile: Drawer/Vaul)
- [x] sheet (Sidebar móvil)
- [x] dropdown-menu (Acciones de fila)
- [x] avatar (Perfil)
- [x] badge (Estados)
- [x] table (Listados)
- [x] checkbox / switch
- [x] scroll-area
- [x] separator
- [x] skeleton (Loading)
- [x] sonner (Toasts)
- [x] tabs (Navegación interna)
- [x] calendar / date-picker
- [x] popover
- [x] radio-group

## Librerías Externas Críticas (Foundation)

Para soportar el "Flow Builder" y funcionalidades avanzadas.

- **Drag & Drop**: `@dnd-kit/core @dnd-kit/sortable` (Para el Builder de Plantillas).
- **Rich Text**: `@tiptap/react @tiptap/starter-kit` (Para personalizar mensajes de bienvenida/despedida).
- **File Upload**: `react-dropzone` (Para la subida de documentos del cliente).
- **Zip Generation**: `jszip` (Para descargar el expediente completo en cliente).
- **File Saver**: `file-saver` (Para guardar el blob generado).

## Componentes Compuestos (Custom)

### `Feedback/`

- `StateEmpty`: Ilustración + Texto + Botón Action.
- `StateError`: Alerta roja con mensaje de retry.
- `PageLoader`: Spinner centrado full-screen.

### `Inputs/`

- `PasswordInput`: Input con toggle de visibilidad (Eye Icon).
- `SearchInput`: Input con icono de lupa a la izquierda.
- `ColorPicker`: Popover con grid de colores (para Admin Branding).
- `Dropzone`: Área de subida de archivos (Mobile friendly).
- `RichTextEditor`: Wrapper de TipTap con toolbar minimalista (Bold, Italic, List).

### `Layout/`

- `UserNav`: Dropdown con avatar y logout.
- `MobileSidebar`: Implementación con Sheet.
- `ThemeToggle`: Switch Sol/Luna.

### `Templates/` (Builder Specific)

- `SortableItem`: Wrapper para dnd-kit.
- `FieldProperties`: Panel lateral de configuración de preguntas.

### `DataDisplay/`

- `StatusBadge`: Badge con mapeo de colores según estado (Pendiente=Amarillo, Activo=Verde).
- `FileCard`: Card pequeña para mostrar PDF adjunto con botón de borrar.

---

## Reglas de Implementación

1. **No reinventar**: Si shadcn lo tiene, úsalo.
2. **Composición**: Si necesitas un "Card de Cliente", crea `ClientCard.tsx` que use `<Card>`. No modifiques el componente base `ui/card.tsx`.
3. **Iconos**: Siempre importar de `lucide-react`.
