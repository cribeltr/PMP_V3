# Notas para Fase 2 — Google Apps Script + Sheets

Apuntes capturados durante la Fase 1 que conviene considerar al portar
el sistema a Apps Script. No empezar Fase 2 hasta confirmación
explícita del usuario.

## Persistencia

- El estado actual está namespaced bajo `pmp.v3.*` en localStorage,
  con migración automática desde claves legacy (`pmp_equipos`, etc.).
  Para Apps Script el equivalente natural es un Spreadsheet maestro
  con una hoja por entidad y un cache local en la propiedad
  `PropertiesService.getDocumentProperties()` para borradores.

- Una hoja por entidad principal:
  - `Equipos` — un row por equipo, columnas planas, grilla en
    columnas Ene–Dic.
  - `Historial_MP` — un row por registro MP (clave foránea
    `equipoUuid`).
  - `Eventos` — timeline plano.
  - `Ciclos` — un row por ciclo con columnas para cada eslabón
    serializadas como JSON corto o en hojas separadas (`Ciclo_X`).
  - `Pendientes` — pendientes administrativos.
  - `Asignaciones_YYYY_MM` — una hoja por período mensual.
  - `Contactos` — contactos por servicio.

- Mantener `schemaVersion` en una hoja `Meta` y replicar la lógica de
  migraciones encadenadas.

## Cola de subida con reintentos

- Para no perder cambios ante caída de red, replicar el patrón:
  mutación local primero → encolar PUT a Sheet → reintentar con
  backoff exponencial hasta 4 veces. Usar
  `CacheService.getDocumentCache()` para la cola.

## Adjuntos en Drive

- Estructura sugerida: `PMP / 2026 / 05 / [serial]_[ciclo_uuid] / `.
- Adjuntos por proceso (ciclo correctivo, MP) y por anexo
  imprimible.
- Límite por archivo: 10 MB; aceptar múltiples por tarea.
- Generar carpeta dinámicamente si no existe.

## Triggers

- `onOpen()`: detectar primera apertura, validar schema, ejecutar
  migraciones idempotentes.
- `onEdit(e)`: si se edita la columna de un mes en `Equipos` con
  `X`/`R`/`PM`/`RA`, normalizar y reaccionar (no usar para registrar
  MP — pedir click en sidebar para evitar errores).
- Trigger diario para alertas: causales Grupo A > 30 días, pendientes
  vencidos, garantías por vencer.

## UI

- Reutilizar el HTML/CSS de `pmp.html` adaptado al sidebar de Apps
  Script (320px de ancho típicamente, 100% alto). Los modales
  funcionan igual.
- Usar `HtmlService.createHtmlOutputFromFile()` para servir
  `Sidebar.html` y `Dialog.html`.
- Bridge JS↔GAS via `google.script.run`. Envolver en `Promise` para
  mantener el patrón actual `async/await`.

## Lógica de causales y ciclos

- La lógica de transiciones de estado (C2 → ServicioTecnico, C3 →
  NoOperativo, vinculación obligatoria, banner si cancelan la
  vinculación) se traduce directo. Mantener los modales de
  vinculación tal cual.
- El ciclo correctivo se modela igual: apertura, diagnóstico, rutas
  A/B/C/D, garantía como flag, autoavance al guardar, borrador
  autoguardado (esto último puede ir en `DocumentProperties` con
  debounce más alto, 2-3 segundos).

## Logs de errores

- Una hoja `Logs_Errores` con timestamp, usuario, función, mensaje,
  stack. Loguear automáticamente vía un wrapper `try/catch` en cada
  endpoint expuesto por `google.script.run`.

## Performance

- ~895 equipos en Sheets se maneja bien con `getValues()` / `setValues()`
  por bloques. Evitar `getValue()` individual.
- Cachear `Equipos` en `CacheService` por 6h con invalidación al
  guardar.

## Diferencias notables vs Fase 1

- No hay carga inicial: el spreadsheet es la fuente de verdad. El
  inventario maestro se importa una vez creando la estructura, no a
  cada apertura.
- Multi-usuario eventual (aunque ahora es uno solo). Considerar locks
  con `LockService` para escrituras críticas (cierre de ciclo,
  cambio de estado).
- Impresión: en Apps Script se puede generar PDF desde
  `HtmlService.createHtmlOutput().getAs('application/pdf')`.

## Tareas técnicas pendientes (no resueltas en Fase 1)

- Editar nombres de técnicos / familias / servicios en configuración
  con confirmación de cascada (cambios afectan datos históricos).
- Reasignación masiva de responsables.
- Bulk edit en inventario (cambiar servicio a varios a la vez).
- Search server-side (en Apps Script con consultas).
