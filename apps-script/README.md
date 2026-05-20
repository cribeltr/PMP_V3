# PMP · SEC — Fase 2 · Apps Script

Versión Google Apps Script + Sheets + Drive del sistema PMP.

**Estado actual: F2.It.1 — foundation.** Esta iteración entrega la
infraestructura (proyecto Apps Script bound al Sheet maestro, hojas
auto-creadas con headers, Web App desplegable, importación del maestro
Excel y vista de Inventario). Próximas iteraciones agregan PMP,
ciclos, asignaciones, reportes, anexos PDF y adjuntos en Drive.

## Archivos

```
apps-script/
├── appsscript.json   ← manifest (scopes, runtime V8, executeAs)
├── Code.gs           ← backend: schema, endpoints API, menu
├── sidebar.html      ← sidebar utilitario (menú Spreadsheet)
├── webapp.html       ← entrada del Web App
├── webapp_css.html   ← CSS (incluido por webapp.html)
└── webapp_js.html    ← JS cliente (incluido por webapp.html)
```

## Instalación (primera vez)

1. Abrí Google Sheets y creá un Spreadsheet vacío. Va a ser el almacén
   de datos (idealmente llamalo `PMP_SEC_HHHA`).
2. Menú `Extensiones → Apps Script`. Se abre el editor.
3. En el editor:
   - `appsscript.json`: si no se ve, activá *Configuración del proyecto*
     → "Mostrar archivo de manifiesto" y pegá el contenido.
   - Creá archivos `Code.gs`, `sidebar.html`, `webapp.html`,
     `webapp_css.html`, `webapp_js.html` y pegá los contenidos.
4. Guardá todo (`Ctrl+S`).
5. Volvé al Spreadsheet y recargá la pestaña. Aparece el menú
   `PMP · SEC`.
6. Menú `PMP · SEC → Crear / verificar hojas`. Aceptá los permisos
   (Sheets, Drive). Se crean todas las hojas con headers.

## Implementar el Web App

1. En el editor de Apps Script: `Implementar → Nueva implementación`.
2. Elegí tipo `Aplicación web`.
3. Configuración:
   - **Ejecutar como**: yo (tu cuenta)
   - **Quién tiene acceso**: solo yo
4. Implementá. Copiá la URL que sale.
5. Esa URL es tu app — abrila en una pestaña nueva y guardala en
   favoritos.

> Si cambiás `Code.gs` o cualquier HTML, hay que **publicar una nueva
> versión** desde `Implementar → Gestionar implementaciones → ⚙️ →
> Editar → Versión: nueva` para que los cambios se reflejen en la URL.

## Uso

- **Menú `PMP · SEC` en el Sheet**: acceso rápido al Web App y al
  sidebar utilitario. Crear/verificar hojas. Ver estado.
- **Web App**: la interfaz principal. Importá el maestro, navegá el
  inventario.
- **Sidebar**: vista resumida y accesos rápidos sin salir del Sheet.

## Estructura de hojas (auto-creadas)

| Hoja          | Contenido |
|---------------|-----------|
| `Meta`        | Pares `key / value` del sistema (versión, fechas) |
| `Equipos`     | Un row por equipo, con grilla anual en 12 columnas |
| `Historial_MP`| Un row por registro de MP (clave `equipoUuid`) |
| `Eventos`     | Timeline plano (clave `equipoUuid`) |
| `Ciclos`      | Un row por ciclo correctivo, eslabones en columnas JSON |
| `Pendientes`  | Tareas administrativas |
| `Contactos`   | Contactos por servicio (JSON serializado) |
| `Asignaciones`| Responsable mensual por equipo (clave `periodo`) |
| `Logs_Errores`| Errores del cliente y del servidor |

## API expuesta (cliente ↔ servidor)

Cliente llama vía `google.script.run.apiX(...)`. Endpoints definidos
en `Code.gs`:

- `apiBootstrap()` — estado inicial: versión, IDs, conteos.
- `apiListEquipos()` — lee todos los equipos.
- `apiSaveEquiposBulk(equipos)` — sobrescribe la hoja Equipos.
- `apiListPendientes() / apiSavePendientesBulk()`
- `apiListContactos() / apiSaveContactosBulk()`
- `apiListAsignaciones() / apiSaveAsignacionPeriodo()`
- `apiListHistorial() / apiSaveHistorialBulk()`
- `apiListEventos() / apiSaveEventosBulk()`
- `apiListCiclos() / apiSaveCiclosBulk()`
- `apiGetWebappUrl()` — URL del Web App publicado.
- `apiLog(level, msg, stack)` — escribe en `Logs_Errores`.

## Roadmap

| It | Alcance |
|----|---------|
| F2.It.1 | ✅ Foundation: schema, Web App, Dashboard, Inventario, import maestro |
| F2.It.2 | PMP, registro MP, causales con vinculación al ciclo |
| F2.It.3 | Ciclo correctivo completo con stepper y rutas |
| F2.It.4 | Asignación mensual + Entregas + plantilla XLSX |
| F2.It.5 | Reportes Excel + anexos PDF (vía Apps Script) + Tareas |
| F2.It.6 | Agenda + REC + adjuntos en Drive con cola de reintentos |

## Notas operativas

- Apps Script tiene un límite de ~6 minutos por ejecución. Los
  imports grandes (~5000+ rows) pueden requerir batching futuro.
- La Web App publicada **debe redesplegarse** después de cada cambio
  en el código si querés que la URL pública use la versión nueva.
- Los logs del cliente van automáticamente a la hoja `Logs_Errores`.
- El acceso por defecto es "solo yo". Si en el futuro participan más
  ingenieros del SEC, cambiá el acceso en la implementación.
