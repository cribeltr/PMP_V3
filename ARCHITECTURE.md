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

## Roadmap de iteraciones (Fase 1)

1. **It.1 — Foundation + Inventario.** Design system, persistence con
   migración desde legacy, modal/drawer/toast/dialog, command palette,
   vista Inventario + Ficha 360 (read-only), backup/restore JSON, import
   maestro Excel, Dashboard básico.
2. **It.2 — PMP.** Grilla anual, registro MP, causales C1–C8 con modal
   de vinculación al ciclo (C2/C3), reprogramación (R), puesta en marcha
   (PM), alertas Grupo A >30d.
3. **It.3 — Ciclo correctivo.** Apertura rediseñada, modales por
   eslabón, stepper, rutas A/B/C/D, garantía, borradores autoguardados,
   edición retroactiva.
4. **It.4 — Entregas + Asignación mensual.** Import Excel mensual,
   agrupación por técnico, drill-down KPI, export plantilla.
5. **It.5 — Reportes + Anexos.** Excel multi-hoja, Anexo 1/3/4/5,
   informe por servicio, imprimir terreno.
6. **It.6 — Tareas + Agenda + Config + REC.** Pendientes admin,
   contactos por servicio, configuración (técnicos, familias), grabación
   de sesión.
7. **It.7 — Pulido + retiro de `pmp_legacy.html`.**
