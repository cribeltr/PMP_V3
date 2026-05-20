# Changelog

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
