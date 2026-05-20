# PMP V3 — Arquitectura

Sistema de gestión del Programa de Mantención Preventiva del Subdepartamento
de Equipamiento Clínico (SEC), Hospital Dr. Hernán Henríquez Aravena.
Reescritura completa del `pmp_legacy.html` (v30/v31), offline-first, single
file.

## Decisiones de arquitectura

### Un solo archivo, vanilla JS
- Sin bundler, sin framework. Hot-reload abriendo el `.html` localmente.
- Tres CDNs externos: **SheetJS** (XLSX), **JSZip** (XLSX con validaciones),
  **Tabler Icons** (CSS).
- Sin Service Worker — la app es estáticamente offline porque vive en disco.

### Estado
- `STATE` global plano (no Redux, no Proxy). Mutaciones explícitas via
  funciones de dominio que terminan llamando `persist()` + `bus.emit()`.
- Mini event-bus interno (`bus.on / bus.emit`) para que las vistas se
  re-rendericen sin acoplarse entre sí.

### Persistencia
- `localStorage` como almacén principal, claves namespaced bajo `pmp.v3.*`.
- Migración automática desde claves legacy (`pmp_equipos`, `pmp_pendientes`,
  `pmp_asignaciones`, `pmp_contactos`, `pmp_sesion`).
- `schemaVersion` numérico; cada bump corre migrations encadenadas idempotentes.
- Backup JSON con versión incrustada; restore corre migrations en frío.

### Modelo de datos (resumen)

```
Equipo {
  uuid, id, fam, famOriginal, carpeta, inventario, nombre,
  servicio, unidad, ubicacion, procedencia, marca, modelo, serie,
  anio, vidaUtil, clasificacion, enu, observacion, frecuencia,
  responsableMaster, enGarantia, garantiaHasta, garantiaProveedor,
  estado, estadoDesde, esSlot,
  grilla: {1..12: 'X'|'R'|'RA'|'PM'|null},
  historial: [MP],
  eventos:  [Evento],
  correctivos: [Ciclo],
  pendientesIds: [uuid]
}

MP { fecha, mes, resultado, ejecutor, obs, estadoFinal, tipoBaja,
     correctivoUuid, motivoCambioEjecutor, importadoDelMaestro }

Ciclo {
  uuid, abierto, ruta, eslabonActual, enGarantia,
  apertura:    { fechaEvento, fechaRegistro, deteccion, descripcion,
                 responsable, sigemEstado, folioSigem, pendienteSigemId },
  diagnostico: { fechaEvento, fechaRegistro, obs, ruta, enGarantia },
  compra:      { fechaEvento, fechaRegistro, estado, empresa, folioOC, monto },
  garantia:    { fechaEvento, fechaRegistro, estado, proveedor, nroCaso, fechaEstimada, notas },
  envio:       { fechaEvento, fechaRegistro, folioEnvio, empresa, responsable },
  recepcion:   { fechaEvento, fechaRegistro, funciono },
  reparacion:  { fechaEvento, fechaRegistro, obs },
  eventos:     [Evento],
  borradores:  { [eslabon]: form-snapshot }
}

Pendiente { id, tipo, descripcion, equipoUuid, asignado, estado,
            creado, vence, log:[], subtareas:[], notas }

Evento  { id, ts (=fechaEvento), tsRegistro, tipo, autor, payload, vinculo? }
```

### Reglas transversales

**Fechas duales**: cada eslabón y evento guarda `fechaEvento` (cuándo
ocurrió en terreno, editable) y `fechaRegistro` (cuándo se grabó, sólo
auditoría). `estadoDesde` y el timeline siempre usan `fechaEvento`.

**Causales con efecto**:
- `C2` ⇒ estado `ServicioTecnico`, exige vincular a envío (existente o
  nuevo ciclo arrancando en Recepción).
- `C3` ⇒ estado `NoOperativo`, exige vincular a ciclo correctivo
  (existente, nuevo con folio SIGEM, o pendiente "Solicitar a servicio
  clínico").
- Cancelar el modal de vinculación deja la causal registrada **sin**
  cambiar el estado y muestra banner en la ficha.

**Ciclo correctivo rediseñado**:
- Primer eslabón es **Apertura** (no Solicitud). Captura fecha real,
  detección, descripción, responsable y estado del folio SIGEM (existe /
  falta gestionar / no aplica).
- Si "falta gestionar" ⇒ pendiente auto con vencimiento 3 días hábiles +
  banner amarillo en ficha hasta completar folio.
- Estado del equipo cambia a `NoOperativo` con `estadoDesde = fechaEvento`
  (la fecha real ingresada, no `now()`).
- Eslabones siguen: Diagnóstico → (ruta interna: Reparación) | (compra
  primero: Compra/Garantía → Envío → Recepción → Reparación) | (envío
  primero: Envío → Compra/Garantía → Recepción → Reparación) | (garantía:
  Garantía → Envío → Recepción → Reparación).

### UI

- **Tipografía**: Inter (system fallback) pesos 400/500.
- **Paleta**: paper `#faf9f5 / #f6f5f1`, carbón `#1f1d18`, bordes
  translúcidos `rgba(0,0,0,.08)` a 0.5px, acentos info/success/warning/
  danger/purple.
- **Tabler Icons** outline vía CDN.
- **Layout**: sidebar fija + área principal. Mobile: nav colapsa en
  drawer.
- **Componentes flotantes**:
  - `Modal` — apilable, backdrop, focus trap, Esc cierra (salvo
    `critical`), click-outside cierra (salvo `dialog`/`critical`).
  - `Drawer` — desliza desde la derecha, igual contract que Modal.
  - `Popover` — ancla a elemento, autopos.
  - `Dialog` — confirmación bloqueante (sí/no).
  - `Toast` — esquina inferior derecha, autoclose 4s.
  - `CommandPalette` — `Ctrl+K`, fuzzy contra equipos, vistas y acciones.
- **Stepper del ciclo**: header de los modales de ciclo, click en
  eslabón completado abre ese modal en edición retroactiva.

### Performance

- Lista de inventario: filtro+sort en memoria, render incremental por
  páginas de 80 filas con `IntersectionObserver` para extender.
- Re-render por vista, no global. Cada vista expone `render(root)` y
  `dispose()`.

### Errores

- `try/catch` en handlers async; `bus.emit('error', err)` ⇒ toast danger
  + `console.error`.
- Sin `window.onerror` silencioso; se loguea explícitamente.

## Estructura del HTML

Un solo `pmp.html`. Secciones marcadas con banners:

```
<!-- ============================ CSS ============================ -->
<!-- ====================== TEMPLATES (HTML) ===================== -->
<!-- ============================ JS ============================= -->
// === CONFIG ===
// === UTIL: dom, dates, fmt, fuzzy ===
// === STORAGE: keys, persist, migrations ===
// === STATE: global + bus ===
// === DOMAIN: equipos ===
// === DOMAIN: pmp (grilla) ===
// === DOMAIN: ciclo correctivo ===
// === DOMAIN: pendientes ===
// === DOMAIN: asignaciones ===
// === IMPORT: master + mensual ===
// === EXPORT: excel + anexos ===
// === UI: shell + nav + toast + modal/drawer/popover/dialog ===
// === UI: command palette ===
// === UI: VIEW dashboard ===
// === UI: VIEW inventario + ficha ===
// === UI: VIEW pmp ===
// === UI: VIEW entregas ===
// === UI: VIEW tareas ===
// === UI: VIEW reportes ===
// === UI: VIEW agenda ===
// === UI: VIEW config ===
// === REC: session recording ===
// === BOOT ===
```

## Iteraciones entregadas (Fase 1)

| It | Alcance |
|----|---------|
| 1  | Foundation: design system, persistencia con migración legacy, modal/drawer/toast/dialog/popover, command palette, Inventario + Ficha 360, backup/restore JSON, import maestro, Dashboard básico. |
| 1.1| Tema oscuro como default, toggle persistido. |
| 2  | PMP: grilla anual y vista por mes, registro MP, causales C1–C8, modales de vinculación C2/C3, alertas Grupo A >30d, edición retroactiva. |
| 3  | Ciclo correctivo: viewer único con stepper, rutas A/B/C, flag garantía, autoavance, borradores autoguardados, edición retroactiva por eslabón, cancelar/reabrir. |
| 4  | Asignación mensual: import .xlsx con detección de período, vista Entregas con KPIs por técnico, modal "sin match", export de plantilla con dropdown de técnicos (data validation vía JSZip). |
| 5  | Reportes Excel multi-hoja (Resumen / Inventario / En ST / MP pendientes / Historial / Pivote por servicio), informe mensual por servicio con KPIs y exporte/impresión, anexos imprimibles 1/3/4/5 condicionados por estado del equipo. |
| 6  | Agenda · contactos por servicio (drawer lateral), REC con redacción automática de campos sensibles. |
| 7  | Pulido final: Dashboard con atenciones globales, retiro de `pmp_legacy.html`, NOTAS_FASE_2 con guidance para portar a Apps Script. |

## Estructura final del repo

```
PMP_V3/
├── pmp.html              ← aplicación autocontenida (~5700 líneas)
├── ARCHITECTURE.md       ← este archivo
├── CHANGELOG.md          ← historial de iteraciones
└── NOTAS_FASE_2.md       ← notas para el port a Google Apps Script
```
