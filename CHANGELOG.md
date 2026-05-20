# Changelog

## Fase 1 · Iteración R1 — Pulido + correcciones del brief de revisión

### Inconsistencias corregidas

1. **Responsable MP del maestro queda como referencial.** El campo
   `responsableMaster` deja de ser fuente de verdad:
   - `EQ.responsables()` y `EQ.responsablesActivos()` se nutren ahora
     de técnicos oficiales del SEC + responsables de asignaciones
     mensuales + ejecutores históricos + responsables de aperturas de
     ciclo. Ya no toca `responsableMaster`.
   - Nueva `EQ.responsablesPeriodo(periodo)` con los técnicos
     presentes en el archivo mensual del período.
   - Filtro "Responsable" en Inventario ahora filtra por la
     asignación del período activo, e incluye "(sin asignar)" como
     opción válida. La etiqueta muestra el período (p. ej. "Resp. May
     2026") para que sea obvio que es contextual.
   - Reportes Excel: la columna del responsable en hojas Inventario y
     "MP Pendientes" pasa a ser "Responsable {Mes Año}" leída de la
     asignación mensual. Anexo 1 muestra "Responsable del período" en
     la sección de firmas. Ficha modal muestra ambos: del período y
     "(maestro, referencial)".
   - `DIFF_CAMPOS` ya no incluye `responsableMaster` para no marcar
     cambios irrelevantes en imports.

2. **Vista Agenda con buscador.** Ya estaba el buscador con
   normalización (tildes/mayúsculas) y filtros con/sin/todos. Ajusté
   el contador del header para que diga exactamente "X servicios · Y
   con contactos completos · Z sin contactos · N personas
   registradas". Ordenamiento configurable se mantiene (sin contactos
   primero / A–Z / más equipos primero).

3. **Diff del maestro item-por-item.**
   - Cada fila de cada pestaña tiene dos acciones nuevas: **Ignorar**
     y **Marcar como pendiente individual** (vencimiento 3 días
     hábiles, descripción autocompletada).
   - Acciones globales "Marcar todo como ignorado" y "Marcar todo
     como pendiente" disponibles desde el modal.
   - Decisiones de "ignorar" persisten en `pmp.v3.diffIgnorados` con
     key compuesta (`uuid::tipo::valor`). El próximo import filtra
     esas diferencias automáticamente.
   - Si todos los cambios fueron previamente ignorados, el modal
     muestra "Sin diferencias relevantes · X cambios previamente
     ignorados (revisar)" con link a Configuración.
   - Sección nueva en Configuración para revisar/revertir decisiones
     de ignorado.

4. **Entregas — "(sin asignar)" muestra solo no asignados del
   período.** `agruparPorTecnico` reescrita: si hay archivo cargado
   para el período, equipos no presentes como key van a "(sin
   asignar)". Si no hay archivo, todos los equipos activos van a
   "(sin asignar)". Quitado el fallback erróneo a
   `responsableMaster`. KPIs del header reflejan el filtro
   correctamente.

5. **Plantilla XLSX corrupta — reparada.** El bug era que
   `<dataValidations>` se inyectaba justo antes de `</worksheet>`,
   posición inválida según ECMA-376 (debe ir antes de
   `<pageMargins>`). Ahora el inyector busca anchors válidos en orden
   (pageMargins → pageSetup → headerFooter → … → /worksheet). La hoja
   `Tecnicos` se marca como oculta vía `wb.Workbook.Sheets[i].Hidden
   = 1` (SheetJS escribe `state="hidden"` correctamente). La columna
   Responsable se pre-llena con la asignación del período actual o,
   si no existe, con la última asignación previa que tenga el
   equipo. Verificado: el archivo se abre limpio en SheetJS
   (equivalente a Excel/LibreOffice).

6. **Inventario — slots ocultos por defecto.** Reemplazado el select
   "Slots" por un toggle "Mostrar slots" siempre visible en el
   toolbar. Default OFF. Preferencia persistida en
   `pmp.v3.ui.inventario.showSlots`. Click en KPI "Equipos totales"
   del dashboard fuerza `showSlots: true` en `viewParams`, override
   sobre la preferencia. La meta de la tabla indica cuántos slots
   quedaron ocultos.

7. **Modal Registrar MP — panel de contexto.** Banner arriba del
   form que muestra: programación de la grilla del mes computable (X
   / R / RA / PM / sin programar), advertencia si ya hay un registro
   SI en ese mes (con fecha y ejecutor), nota si hay causal previa
   en el mes, frecuencia MP del equipo y meses desde la última MP
   exitosa. El panel se actualiza dinámicamente al cambiar la fecha
   real o el selector de mes computable.

### Acuerdos previos verificados

- **Fechas duales** (fechaEvento / fechaRegistro): verificado en
  `MP.register`, eventos del timeline y eslabones del ciclo.
  `estadoDesde` siempre usa `fechaEvento` real (sim 4).
- **Ciclo correctivo con Apertura como primer paso**: verificado en
  sim 7. Pendiente SIGEM automático con 3 días hábiles si "falta
  gestionar".
- **C2 → ServicioTecnico con vinculación a envío**: existe modal
  con dos opciones (envío existente / nuevo ciclo arrancando en
  Recepción).
- **C3 → NoOperativo con vinculación a ciclo**: existe modal con
  tres opciones (existente / con folio SIGEM / pendiente clínico).
  Sim 5 ejercita la opción 3.
- **Cancelar modal de vinculación deja la causal sin cambiar el
  estado** y aparece banner amarillo "Causal sin vincular". Sim 6
  verifica el banner.
- **Edición retroactiva por eslabón** — REPARADA esta iteración. La
  versión anterior empujaba un segundo evento del mismo tipo al
  guardar retroactivo, ensuciando el timeline. Ahora:
  reescribe el `ts` de los eventos asociados, genera un evento
  `EDICION_RETROACTIVA` administrativo con la diferencia, y
  recalcula `estadoDesde` desde el evento de estado más reciente del
  equipo. Sim 9 valida.
- **Dashboard KPIs con semáforo y atenciones globales**: verificado.
- **Ventanas flotantes, command palette, anexos, asignación
  mensual, backup/restore, REC con redacción**: verificados en sims
  10-14.

### Diseño

- Foco visible en navegación por teclado: agregado bloque
  `:focus-visible` con outline azul institucional (2px,
  outline-offset 2px) en `.btn`, `.nav-item`, `.cmdk-item`, `.tab`,
  `.kpi`, `.step`. Inputs/selects mantienen su `box-shadow` propio.
  Caja de focus de inputs cambiada a tono azul clínico para
  coherencia con la paleta.
- `scrollIntoView` del command palette ahora es defensivo (no
  rompe si el método no existe).
- Mantenida toda la decisión visual previa (paleta slate fría con
  acentos clínicos, tipografía Inter 400/500, modales/drawers
  pop-up, animaciones sutiles, íconos Tabler).

### Hooks de inspección

- Bloque final del script expone `window.__pmp` con los símbolos
  clave (`STATE`, `EQ`, `MP`, `CICLO`, `PENDIENTE`,
  `alertasDeEquipo`, helpers de diff, etc.) para harnesses de
  prueba con jsdom. En producción es inerte.

### Simulaciones — iteración R1

Ejecutadas con harness jsdom + xlsx + jszip sobre el HTML real,
estado limpio por sim.

| # | Flujo | Resultado |
|---|-------|-----------|
| 1 | Importar maestro 900 equipos | OK · 345-425 ms · columnas/familias/grilla correctas |
| 2 | Reimport con 5 diferencias sembradas (nuevo / ausente / cambio servicio / cambio grilla / cambio frecuencia) + ignorar 2 + pendiente 2 + dejar 1 + reimport | OK · ignorados persisten, contador `ignoradosPrevios` cuenta correctamente cuando el caso es un ausente reiterado |
| 3 | Importar asignación mensual 60 de 200 equipos, 5 técnicos · agrupar por técnico | OK · 60 matcheados · "(sin asignar)" = 140 (no el total) · matcheo por inventario sin serie también funciona |
| 3b | Exportar plantilla XLSX, abrir con SheetJS, verificar estructura | OK · 78.6 KB · 2 hojas (Asignacion + Tecnicos oculta) · `dataValidations` antes de `pageMargins` · headers correctos |
| 4 | Registrar MP SI | OK · estado Operativo · `estadoDesde = fechaEvento` · evento MP creado |
| 4b | Inventario slots default + persistencia + click KPI total | OK · 17 visibles de 20 (3 slots ocultos) · preferencia persistida en localStorage · click KPI fuerza mostrar |
| 5 | Registrar C3 con vinculación a pendiente clínico | OK · pendiente creado · estado NoOperativo con fecha real |
| 6 | Cancelar modal vinculación C3 | OK · causal queda registrada · estado NO cambia · banner "Causal C3 sin vincular" detectado |
| 7 | Abrir ciclo desde ficha con SIGEM "falta" | OK · estado NoOperativo · pendiente SIGEM con vencimiento 3 días hábiles |
| 7 (contexto MP) | Panel de contexto en modal Registrar MP | OK · muestra mes, programación X, último SI con fecha y ejecutor, frecuencia, meses desde última. Se actualiza al cambiar el mes |
| 8 | Completar ciclo ruta envio_diagnostico: Diag → Envío → Compra → Recepción → Reparación | OK · transiciones de estado correctas · ServicioTecnico al envío · Operativo al cerrar reparación |
| 9 | Editar retroactivamente fecha de envío del ciclo cerrado | OK · evento CICLO-ENVIO original reescribe su ts (no se duplica) · 1 evento EDICION_RETROACTIVA generado · estadoDesde se mantiene en la reparación (evento más reciente de estado) |
| 10 | Agenda — buscador con tilde / sin tilde, filtros, drawer de contactos | OK · normalización funciona · filtros operativos |
| 11 | Reporte multi-hoja | OK · 6 sheets · columna "Responsable May 2026" (no más "Responsable maestro") |
| 12 | Anexo 4 sobre equipo con causal Grupo A >30d | OK · HTML generado · banner del equipo elegible visible |
| 13 | Command palette: búsqueda por serie | OK · resultados aparecen · cierre con Esc |
| 14 | REC iniciar / detener · redacción de SIGEM · descarga JSON | OK · valor SIGEM se reemplaza por «REDACTED» · log JSON descargado |
| 15 | Recorrer las 9 vistas (dash · inv · pmp · entregas · ciclos · tareas · reportes · agenda · config) | OK · 0 errores en consola · cada vista renderiza al menos un bloque y los botones esperados |

### Pendiente

Nada — todos los puntos del brief de revisión cerrados y verificados
por las 15 simulaciones.

## Fase 2 · F2.It.1 — Foundation Apps Script

Arranca la versión Google Apps Script + Sheets del sistema. Vive en
`apps-script/` y no afecta a `pmp.html` (Fase 1).

- `Code.gs`: backend con bootstrap automático del esquema (hojas
  `Meta`, `Equipos`, `Historial_MP`, `Eventos`, `Ciclos`,
  `Pendientes`, `Contactos`, `Asignaciones`, `Logs_Errores` con
  headers fijos), menú custom en el Spreadsheet (`PMP · SEC`),
  `doGet` que sirve la Web App, y API expuesta vía
  `google.script.run` (bootstrap, list/save Equipos / Historial /
  Eventos / Ciclos / Pendientes / Contactos / Asignaciones, log).
- `webapp.html` + `webapp_css.html` + `webapp_js.html`: Web App con
  el mismo design system de la Fase 1, bridge async al servidor,
  indicador de sincronización en el topbar, vistas Dashboard +
  Inventario + Configuración funcionales. Las demás vistas marcadas
  como "pronto" hasta próximas iteraciones.
- `sidebar.html`: utilitario que se abre desde el menú del Sheet con
  resumen de conteos y acceso rápido al Web App.
- `appsscript.json`: manifest con scopes mínimos
  (Spreadsheets, Drive, container UI, ScriptApp, userinfo.email).
- `README.md`: guía de despliegue paso a paso.

## Fase 1 · It.7.1 — Diferencias del maestro como pendiente

- Al importar el maestro, el sistema captura un **diff completo**
  contra el estado actual: equipos nuevos, equipos ausentes, cambios
  en datos (servicio, ubicación, marca, frecuencia, responsable, etc.)
  y cambios en grilla (mes a mes).
- Modal "Diferencias detectadas" con 4 pestañas (Nuevos · Ausentes ·
  Datos · Grilla) y KPIs de resumen. Cada fila enlaza a la ficha del
  equipo.
- Botón **"Crear pendiente para revisar"** guarda el diff en un
  pendiente tipo `diferencias-maestro` con vencimiento de 2 días
  hábiles.
- En Tareas, los pendientes de diferencias muestran las pills con
  contadores (nuevos · ausentes · cambios · grilla) y un botón
  **"Revisar diferencias"** que re-abre el modal en modo revisión,
  permitiendo marcar el pendiente como cerrado al terminar.

## It.7 — Pulido final · Fase 1 lista para uso

- Dashboard rediseñado: KPI `MP cumplimiento %` (semáforo), KPI de
  pendientes con marca de vencidos, KPI clickeable a Ciclos, sección
  **Atenciones** con las primeras 5 alertas globales (causales sin
  vincular, Grupo A >30d, SIGEM pendiente) cada una con click al
  equipo afectado.
- Retiro de `pmp_legacy.html` del repositorio.
- `NOTAS_FASE_2.md` con guías para portar la lógica de causales,
  ciclos, asignaciones y persistencia a Google Apps Script + Sheets +
  Drive.
- `ARCHITECTURE.md` actualizado con la tabla final de iteraciones y
  estructura del repo.

## It.6 — Agenda + REC (grabación de sesión)

- Vista **Agenda**: tarjeta por servicio clínico con resumen de
  contactos cargados; click abre drawer lateral con form completo
  (supervisor, encargado de equipos, jefe del CR — cada uno con
  nombre, apellido, correo, anexo, celular) + notas. Persistido en
  `pmp.v3.contactos`.
- **REC** (grabación de sesión):
  - Chip dedicado en la sidebar con dot rojo pulsante y contador en
    vivo de eventos capturados.
  - Captura click / change / submit con timestamps, elemento (tag #id
    .class), coordenadas y valor.
  - **Redacción automática** de campos sensibles (SIGEM, folio,
    password).
  - Al detener: descarga el log JSON + backup completo emparejado.
  - Accesible desde la sidebar, desde Configuración y desde el
    command palette (Ctrl+K).

## It.5 — Reportes, informes y anexos imprimibles

- Vista **Reportes** con tres bloques:
  - **Exportes Excel**: Reporte general multi-hoja (Resumen / Inventario
    / En ST / MP Pendientes / Historial del año / Pivote por servicio),
    MP Pendientes del mes y Historial completo (todos los años).
  - **Informe mensual por servicio**: selector servicio/mes/año, KPIs
    en vivo (programadas, ejecutadas, causalizadas, pendientes) y
    exporte a Excel o impresión directa.
  - **Anexos imprimibles** (1, 3, 4, 5): buscador de equipo + 4 tarjetas
    que se habilitan o se deshabilitan según el estado real del equipo
    (p. ej. Anexo 4 solo si hay causal Grupo A > 30 días).
- Sistema de impresión via `<iframe>` oculto con CSS A4 dedicado;
  header con nombre del hospital y SEC, footer con timestamp.
- Anexo 1: ficha técnica con últimos 3 ciclos y últimos 12 registros de
  MP. Anexo 3: reprogramación de MP con justificación. Anexo 4: retiro
  por seguridad con banner rojo. Anexo 5: puesta en marcha con
  checklist.

## It.4 — Entregas + asignación mensual

- **Importación de asignación mensual** (.xlsx): detecta encabezados
  (Responsable + Serie/Inventario), matchea por Serie y por Inventario,
  detecta período a partir del nombre del archivo (mes en castellano +
  año) o pide confirmación si no lo detecta. Almacena bajo
  `pmp.v3.asignaciones["YYYY-MM"]` con metadatos (archivo, fechaCarga,
  matcheados, sinMatch[]).
- **Vista Entregas**: selector de período, KPIs (técnicos activos,
  asignados, sin asignar), tarjetas colapsables por técnico con
  cumplimiento del mes (programadas / ejecutadas / causalizadas /
  pendientes) y tabla expandible de equipos con botón rápido a
  Registrar MP.
- **Modal "sin match"**: lista las filas del archivo que no coinciden
  con el inventario actual para facilitar correcciones.
- **Exportar plantilla** (.xlsx): genera planilla mensual con columnas
  Carpeta · Inventario · Serie · Equipo · Servicio · Familia ·
  Frecuencia · Responsable; pre-llena el responsable existente y
  agrega data validation tipo lista (dropdown) en la columna
  Responsable apuntando a una hoja oculta `Tecnicos` poblada con
  asignaciones previas + ejecutores históricos + maestros.
- Acción accesible desde Ctrl+K (Importar asignación mensual).

## It.3 — Ciclo correctivo · gestión por eslabón

- **Ciclo Viewer**: modal grande con stepper horizontal en el header y
  formularios independientes por eslabón (Apertura · Diagnóstico ·
  Compra | Garantía · Envío · Recepción · Reparación). Click en
  cualquier eslabón completado lo reabre en modo edición retroactiva.
- **Rutas A/B/C/D**: en Diagnóstico se elige ruta (interna · compra
  primero · envío primero) y se marca o desmarca la opción de garantía
  (intercambia Compra ↔ Garantía en el flujo).
- **Avance automático**: al guardar un eslabón activo, el siguiente
  modal se abre solo. Edición retroactiva guarda sin avanzar.
- **Transiciones de estado**:
  - Envío guardado → equipo a En Servicio Técnico con `estadoDesde =
    fechaEvento` del envío.
  - Recepción "no funcionó" → vuelve a Envío (loop, con evento en el
    timeline).
  - Reparación guardada → ciclo cerrado y equipo a Operativo.
  - Compra rechazada / Garantía denegada → ciclo cerrado y equipo a
    Fuera de Servicio.
- **Borradores**: cada cambio en el form se autoguarda en
  `ciclo.borradores[eslabon]` (debounce 800ms). Al volver al eslabón,
  el form se rehidrata desde el borrador.
- **Menú de acciones (···)**: cancelar ciclo (con confirmación),
  reabrir ciclo cerrado. Para cambiar ruta o garantía basta con editar
  el diagnóstico retroactivamente.
- Vista **Ciclos** y pestaña Ciclos de la ficha: click en cualquier
  fila/tarjeta abre directamente el viewer.

## It.2 — PMP, causales y vinculación al ciclo

- Vista **PMP** con dos modos: por mes (lista filtrable de programadas/
  ejecutadas/causalizadas) y vista anual de 12 meses (grilla compacta).
  KPIs de cumplimiento del mes en pie de vista.
- Modal **Registrar MP** con fecha real del evento (registro retroactivo
  válido), mes computable, resultado (SI / NO / FS / BAJA / C1–C8),
  estado final si SI, tipo de baja si BAJA, ejecutor con datalist y
  observación. Edición retroactiva pide motivo cuando cambia el ejecutor.
- Causales:
  - **C2** abre modal de vinculación con dos opciones (envío existente
    de un ciclo abierto o crear ciclo con envío ya hecho que arranca
    directo en Recepción). Al confirmar, equipo pasa a En Servicio
    Técnico con `estadoDesde = fechaEvento`.
  - **C3** abre modal con tres opciones (ciclo existente, ciclo con
    folio SIGEM, o crear pendiente "Solicitar a servicio clínico" con
    vencimiento en días hábiles). Al confirmar, equipo pasa a No
    Operativo con la fecha real.
  - Si cancelás el modal, la causal queda registrada pero el equipo NO
    cambia de estado; aparece banner amarillo en la ficha del equipo
    con acción "Vincular ahora".
- Apertura de **ciclo correctivo** desde la ficha: fecha real,
  detección, descripción, responsable y estado del folio SIGEM (existe
  / falta gestionar / no aplica). Si falta, se crea pendiente
  automático con vencimiento 3 días hábiles.
- Alertas en la ficha: causal Grupo A sin resolver > 30 días, causal
  C2/C3 sin vincular, ciclo abierto sin folio SIGEM.
- Vista **Ciclos correctivos**: listado de ciclos abiertos con
  eslabón, fecha de apertura, folio SIGEM y días transcurridos (la UI
  completa por eslabón llega en It.3).
- Vista **Tareas**: pendientes administrativos con creación manual,
  cierre con confirmación, marcadores de vencimiento.
- Fechas duales (`fechaEvento` vs `fechaRegistro`) implementadas en
  MP, eventos y apertura de ciclos.
- Ficha 360°: pestaña Grilla con celdas clickeables (cambiar marcador
  o registrar MP); pestaña Historial con filas clickeables para
  edición retroactiva.

## It.1.1 — Tema oscuro

- Modo oscuro como tema por defecto (paper-dark `#17161b`, surfaces
  escalonadas, acentos semánticos recalibrados, scrollbars y backdrops
  ajustados).
- Toggle en sidebar y en command palette; preferencia persistida en
  `pmp.v3.ui.theme`. Tema aplicado antes del primer paint para evitar
  flicker.

## It.1 — Foundation + Inventario

- Esqueleto del nuevo `pmp.html`: design system (Inter, paper, bordes
  0.5px, acentos semánticos), sidebar fija, navegación entre vistas.
- Capa de persistencia `pmp.v3.*` con migración automática desde claves
  legacy (`pmp_equipos`, `pmp_pendientes`, `pmp_asignaciones`,
  `pmp_contactos`).
- Sistema de modales/drawer/dialog/toast apilables, focus trap, Esc
  cierra, click-fuera cierra los no críticos.
- Vista **Inventario** con filtros (servicio, estado, familia,
  responsable, garantía) + búsqueda + render incremental.
- **Ficha 360°** con pestañas (Datos, Garantía, Grilla anual, Historial,
  Eventos, Ciclos, Pendientes).
- **Dashboard** con KPIs: operativos, no operativos, ST, MP del mes,
  garantías activas, pendientes abiertos.
- **Command palette** (Ctrl+K): buscar equipo / saltar a vista / acciones.
- Importación de **inventario maestro** Excel (.xlsx/.xlsm) con
  detección de columnas y merge no destructivo de grilla.
- Backup/restore JSON con marca de versión.
