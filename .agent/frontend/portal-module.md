# Portal Module - Abogado Sala

Flujo de onboarding para clientes externos. **Mobile-first imperativo**.

## Skills Requeridos

- `shadcn-ui` → Forms, Progress, Cards
- `responsive-design` → Mobile-first design
- `frontend-ui-ux` → UX para clientes

## Referencia Original

`sala-cliente/src/app/sala/` y `sala-cliente/src/components/portal/`

---

## IMPORTANTE: Mobile-First

Este módulo es usado principalmente por **clientes desde móvil**.
El diseño debe priorizar absolutamente la experiencia móvil.

### Reglas Mobile

- Touch targets: **mínimo 44x44px**
- Inputs: **altura mínima 48px** (`h-12`)
- Botones principales: **full width**
- Progress: **horizontal con dots**, no texto largo
- Sin scroll horizontal
- Sin modales que requieran scroll

---

## Páginas a Crear

```
src/app/sala/
├── [token]/
│   ├── page.tsx          # Portal principal
│   └── layout.tsx        # Layout minimal
├── expirada/
│   └── page.tsx         # Link expirado
└── loading.tsx           # Loading state
```

---

## Componentes del Portal

### 1. Portal Header

**Ubicación**: `src/components/portal/portal-header.tsx`

**Minimal header con**:

- Logo del despacho (si disponible)
- Nombre del despacho
- Sin navegación adicional

```tsx
<header className="border-b bg-background">
  <div className="container flex h-14 items-center px-4">
    {firmLogo ? (
      <Image src={firmLogo} alt={firmName} width={32} height={32} />
    ) : (
      <div className="bg-primary text-primary-foreground rounded h-8 w-8 flex items-center justify-center text-xs font-bold">
        {firmName.charAt(0)}
      </div>
    )}
    <span className="ml-2 font-semibold">{firmName}</span>
  </div>
</header>
```

---

### 2. Step Progress

**Ubicación**: `src/components/portal/step-progress.tsx`

**Mobile-optimized progress**:

```tsx
<div className="flex items-center justify-center gap-2">
  {steps.map((step, index) => (
    <React.Fragment key={step.id}>
      <div
        className={cn(
          "h-3 w-3 rounded-full transition-colors",
          index <= currentStep ? "bg-primary" : "bg-muted",
        )}
      />
      {index < steps.length - 1 && (
        <div
          className={cn(
            "h-0.5 w-8 transition-colors",
            index < currentStep ? "bg-primary" : "bg-muted",
          )}
        />
      )}
    </React.Fragment>
  ))}
</div>;

{
  /* Step title - below dots */
}
<p className="text-center text-sm font-medium mt-2">
  {steps[currentStep].title}
</p>;
```

---

### 3. Portal Flow

**Ubicación**: `src/components/portal/portal-flow.tsx`

**Orquestador del flujo**:

```tsx
const steps = useMemo(() => {
  const activeSteps = [];

  if (contractUrl) {
    activeSteps.push({ id: "consent", title: "Firma de Contrato" });
  }

  if (documentsRequired.length > 0) {
    activeSteps.push({ id: "documents", title: "Documentos" });
  }

  if (questions?.length > 0) {
    activeSteps.push({ id: "questionnaire", title: "Cuestionario" });
  }

  activeSteps.push({ id: "complete", title: "Completado" });

  return activeSteps;
}, [contractUrl, documentsRequired, questions]);
```

**Dynamic imports para code splitting**:

```tsx
const ConsentStep = dynamic(() => import("./consent-step"));
const DocumentUploadStep = dynamic(() => import("./document-upload-step"));
const QuestionnaireStep = dynamic(() => import("./questionnaire-step"));
const CompletionStep = dynamic(() => import("./completion-step"));
```

---

### 4. Consent Step

**Ubicación**: `src/components/portal/consent-step.tsx`

**Flujo**:

1. Ver contrato (iframe o link)
2. Checkbox "He leído y acepto"
3. Botón siguiente (o firma digital si implementada)

**Mobile**:

- Contrato se abre en nueva pestaña (mejor UX móvil)
- Checkbox grande y fácil de tocar

---

### 5. Document Upload Step

**Ubicación**: `src/components/portal/document-upload-step.tsx`

**Por cada documento requerido**:

```tsx
<div className="space-y-4">
  {documentsRequired.map((doc) => (
    <Card key={doc}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {uploadedDocs[doc] ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <FileUp className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">{doc}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerUpload(doc)}
          >
            {uploadedDocs[doc] ? "Cambiar" : "Subir"}
          </Button>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

### 6. Questionnaire Step

**Ubicación**: `src/components/portal/questionnaire-step.tsx`

**Renderizado dinámico**:

```tsx
{
  questions.map((q) => (
    <div key={q.id} className="space-y-2">
      <Label>
        {q.text}
        {q.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {q.type === "text" && (
        <Input
          value={answers[q.id] || ""}
          onChange={(e) => onAnswerChange(q.id, e.target.value)}
          className="h-12"
        />
      )}

      {q.type === "textarea" && (
        <Textarea
          value={answers[q.id] || ""}
          onChange={(e) => onAnswerChange(q.id, e.target.value)}
          className="min-h-[100px]"
        />
      )}

      {q.type === "select" && (
        <Select
          value={answers[q.id]}
          onValueChange={(v) => onAnswerChange(q.id, v)}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
          <SelectContent>
            {q.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  ));
}
```

---

### 7. Completion Step

**Ubicación**: `src/components/portal/completion-step.tsx`

```tsx
<div className="text-center py-8">
  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
    <CheckCircle className="h-8 w-8 text-green-600" />
  </div>
  <h2 className="text-2xl font-bold mb-2">¡Proceso Completado!</h2>
  <p className="text-muted-foreground mb-6">
    Gracias {clientName}, hemos recibido tu información correctamente.
  </p>
  <p className="text-sm text-muted-foreground">
    Tu abogado se pondrá en contacto contigo pronto.
  </p>
</div>
```

---

### 8. Expired Link Page

**Ubicación**: `src/app/sala/expirada/page.tsx`

```tsx
<div className="flex min-h-svh items-center justify-center p-4">
  <Card className="max-w-md text-center">
    <CardContent className="pt-6">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
      <h1 className="text-xl font-bold mb-2">Enlace Expirado</h1>
      <p className="text-muted-foreground">
        Este enlace ya no es válido. Por favor, contacta a tu abogado para
        obtener un nuevo acceso.
      </p>
    </CardContent>
  </Card>
</div>
```

---

## Layout del Portal

```tsx
// src/app/sala/[token]/layout.tsx
<div className="flex min-h-svh flex-col bg-background">
  <PortalHeader firmName={...} firmLogo={...} />
  <main className="flex flex-1 items-center justify-center p-4">
    <div className="w-full max-w-2xl">
      {children}
    </div>
  </main>
</div>
```

---

## Verificación

- [ ] Progress muestra paso actual
- [ ] Consent step funciona
- [ ] Upload de documentos funciona
- [ ] Cuestionario renderiza todos los tipos
- [ ] Completion step se muestra
- [ ] Link expirado se maneja
- [ ] **Todo funciona en móvil 320px**
- [ ] Touch targets ≥ 44px
