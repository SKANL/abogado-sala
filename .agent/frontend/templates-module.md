# Templates Module - Abogado Sala

Gestión de plantillas de contratos y cuestionarios.

## Skills Requeridos

- `shadcn-ui` → Table, Dialog, Form
- `react-best-practices` → Dynamic forms

## Referencia Original

`sala-cliente/src/app/(dashboard)/plantillas/` y `sala-cliente/src/components/dashboard/*-templates-table.tsx`

---

## Páginas a Crear

```
src/app/(dashboard)/plantillas/
├── contratos/
│   ├── page.tsx          # Lista de contratos
│   ├── nuevo/
│   │   └── page.tsx     # Subir contrato
│   └── [id]/
│       └── page.tsx     # Editar contrato
└── cuestionarios/
    ├── page.tsx          # Lista de cuestionarios
    ├── nuevo/
    │   └── page.tsx     # Crear cuestionario
    └── [id]/
        └── page.tsx     # Editar cuestionario
```

---

## Componentes

### 1. Contract Templates Table

**Ubicación**: `src/components/dashboard/contract-templates-table.tsx`

**Columnas**:

- Nombre de la plantilla
- Fecha de creación
- Veces usado
- Acciones (Ver, Editar, Eliminar)

**Acciones**:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
      <Eye className="mr-2 h-4 w-4" />
      Vista previa
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href={`/plantillas/contratos/${id}`}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-destructive"
      onClick={() => setDeleteOpen(true)}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 2. Contract Upload Form

**Ubicación**: `src/components/forms/contract-upload-form.tsx`

**Campos**:

- Nombre de la plantilla
- Archivo PDF (drag & drop)
- Descripción (opcional)

**Upload Zone**:

```tsx
<div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
  <p className="mt-4 text-sm text-muted-foreground">
    Arrastra tu PDF aquí o haz clic para seleccionar
  </p>
  <input
    type="file"
    accept=".pdf"
    className="hidden"
    onChange={handleFileChange}
  />
</div>
```

---

### 3. Questionnaire Templates Table

**Similar a contracts pero con**:

- Nombre
- Número de preguntas
- Fecha
- Acciones

---

### 4. Questionnaire Builder Form

**Ubicación**: `src/components/forms/questionnaire-builder-form.tsx`

**Estructura**:

```
Form
├── Nombre del cuestionario
├── Descripción
└── Lista de preguntas (sortable)
    ├── Pregunta 1
    │   ├── Texto de la pregunta
    │   ├── Tipo (text, textarea, select)
    │   ├── Opciones (si es select)
    │   ├── Requerido (switch)
    │   └── Botón eliminar
    ├── ... más preguntas
    └── Botón "Agregar pregunta"
```

**Tipos de Pregunta**:

```typescript
type QuestionType = "text" | "textarea" | "select";

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  order_index: number;
}
```

**Agregar Pregunta**:

```tsx
function addQuestion() {
  setQuestions([
    ...questions,
    {
      id: crypto.randomUUID(),
      text: "",
      type: "textarea",
      required: true,
      order_index: questions.length,
    },
  ]);
}
```

---

### 5. Document Preview Dialog

**Ubicación**: `src/components/dashboard/document-preview-dialog.tsx`

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-4xl h-[80vh]">
    <DialogHeader>
      <DialogTitle>{documentName}</DialogTitle>
    </DialogHeader>
    <div className="flex-1 overflow-hidden">
      <iframe
        src={documentUrl}
        className="w-full h-full rounded-md"
        title="Document Preview"
      />
    </div>
  </DialogContent>
</Dialog>
```

---

## Verificación

- [ ] Lista de contratos carga
- [ ] Upload de PDF funciona
- [ ] Preview de documentos
- [ ] Lista de cuestionarios carga
- [ ] Builder de preguntas funcional
- [ ] Agregar/eliminar preguntas
- [ ] Tipos de pregunta funcionan
- [ ] Formularios con validación
