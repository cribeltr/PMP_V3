# Changelog

## It.1 — Foundation + Inventario (en curso)

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
