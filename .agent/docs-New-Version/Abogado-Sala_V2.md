# Flujo de Usuario: Sistema de Gestión Legal Dinámico

Este flujo está diseñado para ser agnóstico a la materia legal. Permite a los usuarios (abogados) utilizar catálogos predeterminados para agilizar el proceso, o crear sus propias clasificaciones y roles sobre la marcha.

## Paso 1: Configuración General del Expediente
*El usuario inicia un nuevo trámite y define el contexto del caso con opciones flexibles.*

* **Área / Materia:** Dropdown con autocompletado. Opciones predeterminadas (Penal, Civil, Mercantil, etc.) + Botón "Crear nueva materia".
* **Asunto / Subclasificación:** Campo dinámico (reemplaza al campo fijo de "Delito"). Opciones predeterminadas según el Área + Botón "Crear nuevo asunto".
* **Autoridad / Dependencia:** Campo abierto o catálogo para ingresar el Juzgado, Tribunal, Notaría, Fiscalía o Institución correspondiente.
* **Identificador:** Generación automática o ingreso manual del "Número de Expediente" o "Folio Interno".

## Paso 2: Definición de Roles y Partes Involucradas
*El usuario identifica a las personas o empresas en el caso y les asigna la figura jurídica exacta.*

* **Búsqueda e Integración:** Buscador por nombre, empresa o identificación en el directorio del sistema.
* **Asignación de Rol Dinámico:** Dropdown para definir qué papel juega la persona en este expediente.
    * *Predeterminados:* Demandante, Demandado, Denunciante, Acusado, Víctima.
    * *Personalizados:* Botón "Agregar nuevo rol" (Ej. Fideicomitente, Aval, Tercero Perjudicado, Albacea).

## Paso 3: Perfil de las Partes
*El usuario llena o actualiza la ficha de información de cada actor agregado en el paso anterior.*

* **Datos Base:** Nombre completo o Razón Social.
* **Datos Generales:** Edad, Estado civil, Ocupación, Grado de estudios, Nacionalidad, Dirección.
* **Campos Personalizados (Opcional):** Botón "Añadir campo extra" por si el abogado necesita registrar un dato atípico pero crucial para el documento final (Ej. "Número de pasaporte" o "Registro Sindical").

## Paso 4: Elementos Probatorios y Testimoniales
*Módulo universal para adjuntar cualquier tipo de prueba que respalde el expediente.*

* **Carga de Evidencia Multimedia:** Módulo para subir archivos (Formatos aceptados: PDF, JPG, etc.).
* **Clasificación de Evidencia:** Etiquetado libre para describir el archivo subido (Ej. "Contrato de Arrendamiento", "Fotografía de daños").
* **Módulo de Declaraciones / Testimonios:**
    * Botón "Agregar Testimonio / Declaración".
    * Campos: Nombre de la persona y sus Datos Generales.
    * Caja de texto para registrar su declaración de los hechos.

## Paso 5: Narrativa y Generación Dinámica del Documento
*El motor del sistema procesa las partes, la evidencia y la narrativa para estructurar el escrito legal.*

* **Input (Narrativa Principal):** Caja de texto amplia donde el abogado redacta o estructura los "Hechos" generales del caso.
* **Selección del Tipo de Documento:** Dropdown para elegir qué escrito se va a generar.
    * *Predeterminados:* Demanda, Denuncia, Amparo.
    * *Personalizados:* Botón "Crear nuevo tipo de documento" (Ej. Escrito de Pruebas, Contestación, Recurso de Revisión).
* **Procesamiento:** Botón "Generar Documento Legal" (El sistema toma la narrativa y la transforma/estructura en texto legal).
* **Output (Revisión):** Pantalla de previsualización con un editor de texto integrado para hacer ajustes finos al documento generado.
* **Acción Final:** Botón "Aprobar y Guardar Documento".