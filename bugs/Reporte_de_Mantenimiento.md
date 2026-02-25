Reporte de Mantenimiento y Mejoras del Proyecto Web

Estado del Documento: Pendiente de Revisión
Prioridad: Alta
Objetivo: Solucionar inconsistencias en la gestión de plantillas, expedientes y flujo de usuario final.

1. Bugs Críticos y Errores de Lógica

[BUG-01] Persistencia del Orden de Campos en Plantillas

Problema: Al crear una plantilla con un volumen considerable de datos (ej. 38 campos), guardarla y volver a abrirla, el orden de los campos se pierde o se mezcla aleatoriamente.

Comportamiento Esperado: El sistema debe respetar estrictamente el orden (índice) en el que los campos fueron creados o guardados originalmente.

Sugerencia Técnica: Verificar si el array de campos se está guardando con un index o order_id en la base de datos y si el frontend está ordenando este array al renderizar.

[BUG-02] Tipado Incorrecto en Campos de Fecha

Problema: Los campos configurados como "Fecha" se renderizan o comportan como campos de "Texto" (input type="text"), impidiendo la selección de fechas mediante un datepicker nativo o validación de formato.

Comportamiento Esperado: Los campos de fecha deben renderizarse explícitamente como <input type="date"> o utilizar el componente de calendario correspondiente.

[BUG-03] Renderizado Condicional de la Interfaz de Subida de Archivos

Problema: En la vista del cliente, la interfaz para subir archivos (Dropzone/Upload) aparece obligatoriamente, incluso si la plantilla asignada no contiene ningún campo que requiera adjuntar archivos.

Comportamiento Esperado: La sección de subida de archivos debe ser condicional. Si la plantilla solo pide datos de texto/fecha, el bloque de subida debe ocultarse para no confundir al usuario y permitir el envío del formulario.

[BUG-04] Flujo de Descarga Incorrecto y Archivos Corruptos

Problema:

Flujo Atípico: La descarga del archivo ZIP no se inicia directamente tras la solicitud, sino que obliga al usuario a ir al panel de notificaciones y hacer clic allí, lo cual no es un comportamiento estándar web.

Integridad de Datos: Al lograr descargar el archivo, este se encuentra corrupto o con errores de formato, impidiendo su descompresión.

Comportamiento Esperado: Al solicitar la descarga, el navegador debe iniciarla automáticamente (o mediante un botón directo en la misma vista). El archivo resultante debe ser un ZIP válido y funcional.

[BUG-05] Inconsistencia en Enlaces de Clientes tras Eliminar Plantilla

Problema: Si se elimina una plantilla que está asignada a un expediente activo, el enlace del cliente sigue funcionando parcialmente o se queda en un estado "limbo" (pantalla de envío).

Comportamiento Esperado:

Inmediato: Si la plantilla padre no existe, el enlace hijo debe mostrar un error 404 o "Recurso no disponible".

Preventivo: (Ver Feature-02) No permitir borrar plantillas en uso.

2. Experiencia de Usuario (UX) y Manejo de Errores

[UX-01] Manejo de Errores en Enlaces Compartidos (404)

Problema: Si el administrador borra un expediente, el enlace que ya tenía el cliente no muestra un feedback claro.

Comportamiento Esperado: Al acceder a un enlace cuyo expediente ha sido eliminado, debe mostrarse una pantalla de error amigable: "Este formulario ya no está disponible o ha sido eliminado por el administrador".

[UX-02] Feedback Específico para ID/Token No Encontrado

Problema: Falta claridad cuando el cliente intenta acceder y el token es inválido o el expediente fue borrado mientras él estaba dentro.

Comportamiento Esperado: Implementar una validación en el load de la página del cliente. Si el ID/Token no existe en la base de datos, redirigir a una vista de error estándar diseñada para este fin, en lugar de mostrar la interfaz vacía o rota.

3. Nuevas Funcionalidades (Features) y Lógica de Negocio

[FEAT-01] Propagación de Cambios en Plantillas (Versionado)

Contexto: Actualmente, editar una plantilla no afecta a los expedientes ya creados con ella.

Requerimiento: Agregar un mecanismo para "Sincronizar" o "Actualizar Expediente".

Opción A (Botón Manual): Un botón en el detalle del expediente: "Se detectaron cambios en la plantilla original. ¿Desea actualizar este expediente?".

Opción B (Automático): Al guardar la plantilla, preguntar si se desea propagar los cambios a los expedientes abiertos (con advertencia de posible pérdida de datos en campos eliminados).

[FEAT-02] Integridad Referencial en Eliminación de Plantillas

Contexto: Se pueden borrar plantillas que están siendo usadas, rompiendo el flujo.

Requerimiento: Bloquear la eliminación de una plantilla si tiene expedientes asociados.

Alternativa: Implementar un sistema de "Archivado" (Soft Delete). La plantilla deja de estar disponible para nuevos expedientes, pero los existentes siguen funcionando.

[FEAT-03] Gestión de Estados del Expediente

Contexto: No es posible cambiar el estado de un expediente manualmente.

Requerimiento: Agregar un selector de estado en la vista del administrador (ej. Pendiente, En Proceso, Completado, Cancelado) para mejor control del flujo de trabajo.

4. Notas Adicionales (Deuda Técnica)

Baja Prioridad / Known Issues:

Revisar el flujo de registro de usuarios (actualmente presenta fallos).

Revisar la funcionalidad del botón de notificaciones (si se mantiene para otros usos).

Verificar permisos para la eliminación de clientes.

5. Sugerencias de Evolución (Roadmap)

[SUG-01] Ampliación del Catálogo de Campos (Tipo Google Forms)

Contexto: Actualmente la creación de campos es limitada (solo Texto, Número, Fecha, Archivo), lo cual restringe la captura de información estructurada.

Propuesta: Implementar nuevos tipos de entrada estándar:

Opción Múltiple (Radio Buttons): Para preguntas de "Sí/No" o selección única.

Casillas de Verificación (Checkboxes): Para permitir al usuario seleccionar varias opciones a la vez.

Listas Desplegables (Dropdowns): Para optimizar espacio en listas largas de opciones.

Casilla de Aceptación/Legal: Un campo especial (tipo checkbox único) para textos legales obligatorios. Ej: "Al rellenar este formulario, Ud. verifica que todos los datos indicados son verídicos".

[SUG-02] Configuración Avanzada de Campos (Validaciones)

Contexto: Todos los campos parecen tener el mismo nivel de importancia, sin distinción de reglas.

Propuesta: Agregar configuraciones individuales por campo:

Obligatorio vs. Opcional: Switch para definir si el usuario puede enviar el formulario sin llenar ese campo específico.

Textos de Ayuda (Placeholder/Hint): Campo para agregar instrucciones pequeñas debajo de la etiqueta del campo.

[SUG-03] Estructura y Organización del Formulario

Contexto: Formularios extensos (ej. 38 campos) en una sola lista vertical resultan tediosos y difíciles de navegar.

Propuesta:

Secciones o Divisores: Elemento visual para agrupar preguntas por temas (ej. "Datos Personales", "Documentación", "Historial").

Paginación: Opción de dividir el formulario en pasos (Paso 1 > Siguiente > Paso 2) para mejorar la experiencia del usuario.
