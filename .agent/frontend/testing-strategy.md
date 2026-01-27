# Testing Strategy - Abogado Sala

Pirámide de pruebas para asegurar calidad sin ralentizar el desarrollo.

## 1. Unit Tests (Lógica de Negocio)

**Herramienta**: `Vitest`
**Objetivo**: Probar funciones puras, hooks complejos y utilidades. **No probar UI aquí.**

- Probar `utils/formatCurrency.ts`.
- Probar `hooks/usePortalMachine.ts` (lógica de estado).
- Probar validadores de Zod.

_Coverage esperado_: 80% en `lib/` y `hooks/` de lógica negocio.

---

## 2. Component Tests (Integración UI)

**Herramienta**: `Vitest` + `React Testing Library`
**Objetivo**: Verificar que los componentes aislados (particularmente los complejos del Design System o Formularios) se comportan bien.

- ¿El `LoginForm` muestra error si envío vacío?
- ¿El `Wizard` avanza de paso al hacer click?
- **Mockear** Server Actions y llamadas de red. No hacer peticiones reales.

---

## 3. End-to-End (E2E)

**Herramienta**: `Playwright`
**Objetivo**: Probar los flujos críticos de usuario ("User Journeys") en un navegador real.

### Flujos Críticos (Smoke Tests)

1. **Login Flow**: Login correcto -> Dashboard.
2. **Portal Flow**: Cliente entra link -> Firma -> Sube foto -> Fin.
3. **Crear Cliente**: Abogado crea cliente -> Aparece en lista.

_Estrategia de Datos_: Usar una base de datos de "seed" o mockear las respuestas de red a nivel de Playwright si la estabilidad del backend de pruebas es baja.

---

## 4. Testing de Accesibilidad (A11y)

- Integrar `axe-core` en los tests E2E para detectar violaciones automáticas (contraste, etiquetas faltantes).
- Navegación por teclado manual en Review es obligatoria.

---

## Reglas de PR (Pull Request)

- Ningún fix de bug se mergea sin un test que reproduzca el fallo (Regression Test).
- Fallar CI si `npm run test` falla.
