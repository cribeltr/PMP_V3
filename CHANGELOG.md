# Changelog

## It.7.1 — Diferencias del maestro como pendiente

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
