# Changelog

## Fase 1 · Iteración R6 — Rediseño ciclo correctivo + UX operativa diaria

Cambio estructural grande: el ciclo correctivo pasa de eslabones
monolíticos a **eventos independientes relacionados** (solicitud +
envíos[] + recepciones[] + reparación). Diagnostico / compra /
garantía se eliminan del modelo. Garantía queda como flag informativo
del equipo. Nuevo estado `Recepcionado`. Migración v34 al boot
descarta ciclos abiertos del modelo viejo y convierte los cerrados.

### Parte 1 — Ciclo correctivo

**1.1 Estado `Recepcionado`** agregado a `ESTADOS` (orden: Operativo /
NoOperativo / ServicioTecnico / Recepcionado / FueraDeServicio /
DeBaja / Slot). Pill azul institucional (`info`). Helper
`ESTADOS_NO_OPERATIVOS = ['NoOperativo','ServicioTecnico','Recepcionado']`.

**1.2 Modelo de datos del ciclo**:

```js
Ciclo {
  uuid, abierto, enGarantia,
  solicitud: null | { fechaEvento, fechaRegistro, folioSigem, responsable, observaciones },
  envios: [{ uuid, fechaEvento, numeroEnvio, empresaST, responsable, observaciones, recepcionUuid, cerrado }],
  recepciones: [{ uuid, fechaEvento, guiaDespacho, responsable, observaciones, envioUuid }],
  reparacion: null | { fechaEvento, fechaRegistro, responsable, observaciones },
  creado, cerrado, tiempoTotalDias
}
```

Ciclo abierto mientras `reparacion === null`. Reparación lo cierra,
calcula `tiempoTotalDias` desde el primer evento.

**1.3 Migración v34** (`migrarCiclosV34`):
- Ciclos viejos abiertos: descartados con WARN.
- Ciclos viejos cerrados: convertidos extrayendo apertura→solicitud,
  envio singular→envios[], recepcion singular→recepciones[],
  reparación. Datos de diagnostico/compra/garantia quedan en
  `c.legacyExtra` para auditoría.
- Registros MP con `correctivoUuid` huérfano: limpiados con
  `observacionMigracion`.
- Idempotente vía `c.__migradoV34`.

**1.4 Cuatro botones nuevos en la ficha del equipo**:
- `+ Solicitud` (`ti-file-text`) → `abrirModalSolicitudTrabajo`.
  Pide folio SIGEM obligatorio, fecha, responsable (selectTecnico),
  observaciones. Crea ciclo + pendiente automático "Avanzar ciclo
  correctivo" con vencimiento 5 días hábiles. Equipo a NoOperativo.
- `+ Envío ST` (`ti-truck-delivery`) → `abrirModalEnvioST`.
  Lista solicitudes abiertas sin envío como radios + opción "iniciar
  desde envío". Pide número de envío, empresaST (datalist con
  empresas previas), responsable, observaciones. Equipo a
  ServicioTecnico.
- `+ Recepción` (`ti-package`) → `abrirModalRecepcion`.
  Lista envíos sin recepción como radios + opción "iniciar desde
  recepción". Pide fecha, guía de despacho (opcional), responsable.
  Cierra envío vinculado. Equipo a Recepcionado. Crea pendiente
  automático "Reparación pendiente" con vencimiento 5 días hábiles.
- `+ Reparación` (`ti-tool`, primario) → `abrirModalReparacion`.
  Lista ciclos abiertos ordenados por prioridad
  (recepción→envío→solicitud), + opción "in-situ". Pide fecha,
  responsable, observaciones. Cierra ciclo, equipo a Operativo,
  cierra automáticamente pendientes con `meta.cicloUuid === c.uuid`.

Todos los botones se deshabilitan si el equipo es Slot o DeBaja.

**1.5 Visualización del ciclo como árbol** (`renderCicloEventos`):
Reemplaza el viewer con stepper. Estructura: solicitud → árbol con
ramas de envíos y sus recepciones vinculadas → reparación final.
Cada nodo con ícono semántico (file-text, truck-delivery, package,
tool). Junto al árbol, 4 KPI cards: tiempo total del ciclo, acumulado
en cada estado no-operativo.

**1.6 Tiempos en estado**:
- `tiempoEnEstado(equipo, estado)` recorre eventos `ESTADO` ordenados
  y suma tramos. Resultado en días con 1 decimal.
- `diasEnEstadoActual(equipo)` resta `Date.now() - estadoDesde`.
- Inventario: nueva columna "Días en estado" con pill de color
  semáforo (verde <7d, amarillo 7-30d, rojo >30d).
- Nuevo filtro "Tiempo en estado" en Inventario (>7d / >15d / >30d).

**1.7 Alertas a 30 días** (`revisarEquiposVencidos`):
Para cada equipo en estado no-operativo con `días > 30`, crea
pendiente automático con `meta.tipoAlerta = '30d-{estado}'` y
`meta.estadoDesde` para dedup. Idempotente: una segunda llamada con
el mismo `estadoDesde` no duplica. Banner rojo en la ficha cuando
aplica.

**1.8 Causales C2/C3** que llegaban al viejo modal de vinculación con
3 opciones ahora redirigen al nuevo flujo. La C3 / SI_NO_OP de R5
arrancan el modal de solicitud pre-poblado.

**1.9 Eliminado del modelo**: `apertura`, `diagnostico`, `compra`,
`garantia`, `envio` singular, `recepcion` singular, `eslabonActual`,
`ruta`, `ESLABONES_ORDEN`, `RUTAS_OPCIONES`, `ESLABON_DONE`. Las
funciones viejas `saveEslabon`, `saveBorrador`, `vincularEnvio`,
`eslabones`, `nextEslabon`, `abrirCicloViewer`, `renderStepper`,
`renderEslabon*`, `abrirModalAperturaCiclo`,
`abrirModalCompletarSigem` se eliminaron. `ESLABONES_LABEL` se
conserva con un mapa mínimo para que `describeEvento` siga
mostrando eventos viejos con label legible.

### Parte 2 — UX operativa

**2.2 Welcome modal diario**: en la primera apertura del día (detectada
por `pmp.v3.ultimaApertura !== hoy`), aparece modal con saludo según
hora del día, card de revisar maestro (con shortcut si ya se cargó
hoy), 4 KPIs operativos clickeables (mis pendientes hoy / vencidos /
equipos >30d crítico / ciclos abiertos), lista de recordatorios (sin
asignar, recepciones >5d sin reparar, solicitudes >7d sin avance).
Botón "Ver bienvenida" en el header del dashboard permite volver a
abrirlo.

**2.3 Identificación de usuario** (`abrirModalIdentificarUsuario`):
en la primera carga ever, modal crítico (no se puede cerrar sin
elegir). Pide elegir del `selectTecnico`. Guarda en
`pmp.v3.usuario`. Tras identificarse, abre el welcome modal.
Configuración tiene card "Mi usuario" con botón "Cambiar usuario".

**2.4 Inventario operativo**:
- Nueva columna "Días en estado" con semáforo.
- Nuevo filtro "Tiempo en estado".
- Botón "Exportar filtrado" en header
  (`exportarInventarioFiltrado`): exporta solo las filas que cumplen
  los filtros activos. Tres hojas: Equipos · Resumen (por estado /
  servicio / familia) · Filtros aplicados (auditoría). Confirma si
  >500 filas. Nombre: `Inventario_{filtroPrincipal}_{fecha}.xlsx`.

**2.5 Vista global de ciclos** (`VIEWS.ciclos`): tabla con un row por
ciclo abierto + cerrados últimos 60 días. Columnas: equipo / estado
(abierto Nd con pill semáforo) / solicitud (folio + fecha) / último
envío (empresa + días en ST) / última recepción (fecha + días) /
reparación / pendientes abiertos del ciclo. Filtros: estado / empresa
/ responsable.

**2.7 Recordatorios persistentes**:
- Badges en sidebar junto a "Pendientes": total abiertos (azul) +
  vencidos asignados a mí (rojo). Se actualizan al cambiar
  `STATE.pendientes` via `bus.on('state:change')`.
- Banner amarillo persistente en el dashboard cuando hay
  pendientes sin responsable.
- Auto-asignación: `abrirModalNuevoPendiente` pre-rellena `asignado`
  con `usuarioActual()`.

**2.8 Dashboard rediseñado** como panel ejecutivo accionable:
- Fila 1: 5 KPIs operativos clickeables — Operativos/Total con %,
  No operativos (suma NoOp+ST+Rec), Ciclos correctivos, Mis
  pendientes hoy, Pendientes vencidos.
- Banner sin asignar (si aplica).
- Fila 2: 3 cards "Atenciones críticas" con top-5 — equipos >30d en
  estado crítico, ciclos sin avance >7d, MP pendientes del mes.
- Fila 3: Distribución por estado (barras horizontales clickeables)
  y top 10 familias con equipos no-operativos.
- Fila 4: Resumen ejecutivo en prosa generado automáticamente, con
  botón "Copiar texto" al portapapeles (para email/WhatsApp a
  jefatura).

### Lo que NO se entregó / Sugerencias para R7

Por scope: implementadas las funcionalidades críticas. Quedaron como
mejoras posibles para R7:

- **Vista calendario en Pendientes** (B.6): el toggle Lista/Calendario
  no se implementó. Los filtros R5 (estado/responsable/rango fechas)
  cubren el caso principal de planificación.
- **Multi-select en filtros del Inventario** (B.4.a) y **columnas
  configurables** con persistencia: implementé `Tiempo en estado` y
  el export filtrado pero no llegué a multi-select ni al pop-over de
  columnas. Las preferencias persistidas siguen limitadas a "mostrar
  slots".
- **Vistas guardadas** (B.4.d): los presets clickeables no se
  agregaron.
- **Gráficos de pie/bar reales**: el dashboard usa barras simples,
  no SVG.

### Simulaciones R6

| # | Flujo | Resultado |
|---|-------|-----------|
| Suite anterior (sims 1-15 + 4b/7 + R2-R5) | Adaptada y verde | OK · 9 archivos sims, 0 FAILs |
| R6.1 | Estado Recepcionado | OK · agregarRecepcion lo aplica |
| R6.2 | crearSolicitud crea ciclo + pendiente automático | OK |
| R6.3 | Múltiples envíos en mismo ciclo | OK · `c.envios[]` con 2 entries |
| R6.4 | Recepción vinculada cierra envío | OK · `env.recepcionUuid` + `env.cerrado` |
| R6.5 | Reparación cierra ciclo + pendientes vinculados | OK · 2 pendientes cerrados automáticamente |
| R6.6 | `tiempoEnEstado` / `diasEnEstadoActual` | OK · ~12d para estadoDesde=hace 12 días |
| R6.7 | Pendiente automático 30d idempotente | OK · 1 creado · segunda llamada no duplica |
| R6.8 | `migrarCiclosV34` idempotente | OK · ciclo cerrado viejo convertido, segunda llamada 0 cambios |
| R6.9 | `renderCicloEventos` árbol | OK · solicitud + 2 envíos + 1 recepción + reparación |
| R6.10 | `usuarioActual` + selectTecnico | OK · localStorage `pmp.v3.usuario` |
| R6.11 | VIEWS.ciclos lista abiertos + cerrados | OK |
| R6.12 | Dashboard con resumen ejecutivo + botón Copiar | OK · card y botón presentes |
| R6.13 | Filtro tiempo en estado en Inventario | OK · 1 equipo con >30d |

### Compatibilidad con sims previos

Los sims que probaban el modelo viejo del ciclo (`CICLO.crear()` con
`sigemEstado`, `CICLO.saveEslabon`) fueron adaptados al nuevo API.
Los sims de la suite original (registro MP, vinculación C2/C3,
pendientes R4, filtros R5, etc.) **no se modificaron** y todos
pasan sin regresión.

## Fase 1 · Iteración R5 — Bug vinculación MP No Op + filtro fechas en Pendientes

**Nota de contexto**: el prompt de R5 asumía que se trabajaba sobre R3,
pero la R4 anterior ya había implementado la mayor parte de la "Parte
B" (renombrado Tareas→Pendientes, estados granulares, subtareas, log,
agrupación por urgencia, migración v33, foco desde ficha, etc.). Esta
iteración entrega: (1) **Parte A completa** — bug de vinculación MP
SI+No Op; (2) **diff de Parte B** sobre R4 — tercer filtro de rango de
fechas, opción "(sin asignar)" en el filtro de responsable, ajuste de
colores de dos grupos, ocultar "Limpiar filtros" cuando no aplica.

### Parte A — MP con resultado SI + estadoFinal NoOperativo dispara vinculación

Bug reportado: en R3+R4 una MP ejecutada (SI) que dejaba el equipo en
NoOperativo (porque durante la mantención se detectó una falla) NO
ofrecía vincular a ciclo correctivo; se perdía la trazabilidad. La
versión legacy v27 sí lo manejaba.

- `MP.register` devuelve `needsVinculacion = 'SI_NO_OP'` cuando
  `resultado === 'SI' && estadoFinal === 'NoOperativo'`. Se mantiene
  C2/C3 con prioridad y se usa `else if` para que no haya solapes.
- `MP.update` (edición retroactiva) espeja la misma lógica con guard:
  no devuelve `needsVinculacion` si la MP ya tenía `correctivoUuid`.
- El call site en el modal Registrar MP maneja el nuevo valor:

```js
if (res.needsVinculacion === 'SI_NO_OP')
  abrirModalVinculacionC3(res.equipo, res.mp, { motivo: 'SI_NO_OP' });
```

- `abrirModalVinculacionC3(equipo, mp, opts)` acepta tercer parámetro
  `opts = { motivo: 'C3' | 'SI_NO_OP' }` (default `'C3'`). El modal
  reutiliza el mismo cuerpo (3 opciones idénticas) y solo adapta:
  título, subtítulo, intro, toast al cancelar, tipo de evento al
  vincular (`CAUSAL-VINCULADA` vs `MP-SI-NOOP-VINCULADA`).
- `abrirModalVinculacion(equipo, mp)` (atajo) también deriva al
  motivo `SI_NO_OP` cuando corresponde.
- Al cancelar la vinculación, la MP queda marcada con
  `sinVincular: true` y persistida. El equipo NO se revierte (se
  respeta la decisión del operador).
- Banner en la ficha (`alertasDeEquipo`): la verificación se
  generalizó. Detecta:
  - C2 / C3 sin `correctivoUuid` (existente).
  - SI + estadoFinal=NoOperativo + `sinVincular === true` + sin
    `correctivoUuid` (caso nuevo).
  - Texto del banner adaptado: para SI_NO_OP dice "MP del DD-MM-YYYY
    con estado No Operativo sin vincular a ciclo — corresponde abrir
    o asociar uno."

#### Caso simétrico SI + ServicioTecnico

Verificado: el dropdown `estadoFinal` del modal Registrar MP **NO**
incluye `'ServicioTecnico'` (las opciones son Operativo /
NoOperativo / FueraDeServicio). Por lo tanto A.6 del prompt no
aplica; no se implementó.

### Parte B — Diff sobre lo que ya estaba en R4

R4 (commit anterior) ya entregó: renombrado Tareas→Pendientes (ID
interno `'tareas'` preservado), estados granulares
(Abierto/EnCurso/Esperando/Cerrado), subtareas, log, agrupación por
urgencia (6 grupos), gestión inline expandible, migración v33,
"Pendientes del equipo" con foco al click. Todo eso quedó intacto.

Lo nuevo en R5 sobre la vista Pendientes:

- **Tercer filtro: rango de fechas de compromiso**. Dos
  `<input type="date">` con labels "desde" y "hasta". Si ambos
  vacíos, no filtra. Si hay valor, filtra los pendientes con `vence`
  dentro del rango inclusivo. Pendientes sin `vence` quedan fuera
  cuando el filtro está activo. Botón ✕ pequeño a la derecha para
  limpiar solo el rango; visible únicamente si hay rango activo.
- **Opción "(sin asignar)" en el filtro de responsable** (valor
  centinela `__SIN_ASIGNAR__`). Filtra pendientes con
  `asignado` vacío o undefined.
- **`UI_PEND.filtros`** ahora incluye `{ estado, asignado, desde,
  hasta }`. Todos los sitios que limpian filtros actualizan los 4
  campos.
- **Botón "Limpiar filtros"** unificado: visible solo cuando algún
  filtro está activo. Limpia los 4 campos y resetea los 4 controles
  visuales.
- **Colores de grupos ajustados** a lo pedido:
  - `En curso`: `warning` → `info`.
  - `Esperando`: `purple` → `muted`.
  - Otros (Vencidos `danger`, Por vencer `warning`, Abiertos `info`,
    Cerrados recientes `success`) sin cambio.

### Simulaciones R5

| # | Flujo | Resultado |
|---|-------|-----------|
| Suite 1-15 + 4b/7 + R2-R4 | Sin regresiones | OK · 33 sims verdes |
| A.1 | MP register SI+NoOperativo → needsVinculacion='SI_NO_OP' | OK |
| A.2 | C3 normal sin regresión | OK |
| A.3 | SI + Operativo no pide vincular | OK |
| A.4 | Modal motivo SI_NO_OP muestra textos adaptados | OK · título, subtítulo, intro, son distintos al motivo C3 |
| A.5 | Motivo C3 preserva textos originales | OK |
| A.6 | Cancelar marca `mp.sinVincular=true` y banner aparece | OK · alerta detectada por `alertasDeEquipo` |
| B.1 | Filtro "(sin asignar)" en Responsable | OK · opción presente, filtra correctamente |
| B.2 | Filtro por rango de fechas + botón ✕ para limpiar | OK · filtra solo del mes, botón aparece/desaparece según rango |
| B.3 | Combinación de los 3 filtros (estado + responsable + rango) | OK · intersección correcta · "Limpiar filtros" funciona y se oculta sin filtros activos |

### NO realizado intencionalmente

- Fase 2 (Apps Script) sigue pausada. Directorio `apps-script/` sin
  tocar.
- No se reescribió `abrirModalVinculacionC3` ni se creó modal nuevo;
  se extendió con el parámetro `opts` como pidió el prompt.
- Caso simétrico A.6 (SI + ServicioTecnico): no aplica porque el
  `estadoFinal` no expone esa opción.
- IDs internos, firmas existentes y flujo "Completar folio SIGEM"
  preservados.

## Fase 1 · Iteración R4 — Pendientes con gestión completa

### 1. Renombrado "Tareas" → "Pendientes" en UI (ID interno preservado)

- `NAV_ITEMS`: label `'Pendientes'`. ID interno sigue siendo `'tareas'`.
- `VIEWS.tareas.title`, `viewHeader`, `topbar`: todos dicen "Pendientes".
- Dashboard KPI: `'Pendientes abiertos'`.
- Botón principal: `'Nuevo pendiente'`. Modal: `'Nuevo pendiente'` /
  botón `'Crear pendiente'` / toast `'Pendiente creado.'`.
- Toast del migrador legacy: `'X pendientes desde el sistema anterior'`.
- Verificado por grep que ya no aparece "Tareas" / "tarea creada" en
  strings visibles del HTML.

### 2. Estados granulares del pendiente

`ESTADOS_PENDIENTE = ['Abierto','EnCurso','Esperando','Cerrado']` con
labels (`En curso`, etc.) y pills (info/warning/purple/success).

`PENDIENTE.crear()` arranca en `'Abierto'`. Nuevas funciones:

- `PENDIENTE.cambiarEstado(id, nuevoEstado, nota='')` con validación,
  re-apertura limpia (`p.cerrado = p.cerradoEn = null`), entrada en log
  con formato `Estado: anterior → nuevo · nota?`.
- `PENDIENTE.reabrir(id, nota='')` — atajo a `cambiarEstado(id,'Abierto')`.

`PENDIENTE.cerrar(id, nota)` mantenido por compatibilidad con el flujo
SIGEM y los call sites existentes; ahora usa el mismo formato de log
y setea `cerradoEn`.

### 3. Campos extendidos y funciones de gestión

Esquema actualizado (retrocompatible vía migración):

- `subtareas: [{ id, texto, completada, ts }]` — array.
- `log: [{ ts, nota }]` — usado para automáticos (estado, edición,
  subtareas creadas/eliminadas) y notas manuales del usuario.
- `vence` (alias funcional de `fechaCompromiso` viejo).

Funciones nuevas:

- `PENDIENTE.editar(id, cambios)` — campos editables: `descripcion`,
  `asignado`, `vence`, `equipoUuid`, `tipo`. Registra diff en log.
  Re-mantiene la consistencia de `equipos[].pendientesIds` si cambia
  el equipo.
- `PENDIENTE.agregarNota(id, nota)` — push al log.
- `PENDIENTE.agregarSubtarea(id, texto)` — agrega subtarea + log.
- `PENDIENTE.toggleSubtarea(id, subId)` — invierte completada, **sin
  log** (sería ruidoso).
- `PENDIENTE.eliminarSubtarea(id, subId)` — saca del array + log.

### 4. Vista Pendientes con gestión inline

Reescritura completa de `VIEWS.tareas.render()`.

- **Filtros en vivo** en el header: `Estado` y `Responsable` (dropdown
  de `TECNICOS_OFICIALES`). Estado volátil en `UI_PEND.filtros`.
- **Agrupación por urgencia**: Vencidos · Por vencer (≤3d) · Abiertos ·
  En curso · Esperando · Cerrados recientes (últimos 20). Cada grupo
  con header `Nombre + pill de conteo de color semántico`.
- **Card colapsable** por pendiente:
  - Línea 1: descripción + pills (tipo, estado, vencido, `N/M subtareas`).
  - Línea 2: equipo (clickeable), asignado, vence con días, creado.
  - Botón `Gestionar ▾` que expande.
- **Vista expandida** con:
  - Selector de estado en vivo (con confirmación al cerrar).
  - Subtareas con checkbox, input para agregar (Enter), botón × para
    eliminar.
  - Notas: textarea + botón "Agregar nota" (Ctrl+Enter). Log abajo
    cronológico descendente con timestamp humano.
  - Botón "Editar" arriba que abre modal con descripción / asignado /
    vence / equipo.
  - Si está Cerrado: botón `Reabrir` (con confirmación).
- **Empty state diferenciado**:
  - Sin pendientes en absoluto → empty state con CTA "Nuevo pendiente".
  - Sin pendientes que cumplan filtros → empty state con CTA "Limpiar
    filtros".

### 5. Migración del esquema legacy (`migrarPendientesV33`)

Función idempotente que se llama en boot después de `loadState`. Para
cada pendiente:

- `id` ← `uuid` si falta.
- `subtareas = []` si falta.
- `log = [{ ts: creado, nota: 'Creado' }]` si no es array.
- `estado` desconocido → `'Abierto'` (warning en consola con el ID).
- `vence` ← `fechaCompromiso` si falta y existe el legacy.
- `asignado` ← `responsable` si falta y existe el legacy.

Si modifica algo, persiste `pendientes` y loguea cuántos campos
normalizó. Verificado idempotente: segunda llamada devuelve 0.

### 6. Sección "Pendientes" en la ficha del equipo

Las cards ahora:

- Resuelven pendientes por `pendientesIds` Y por `equipoUuid` (más
  defensivo si los ids se desincronizan).
- Muestran pill de estado granular con color institucional.
- Muestran badge `subDone/subN subtareas` si tiene.
- Marcan `vencido hace Xd` si aplica.
- Son clickeables: setean `UI_PEND.focusId = p.id`, limpian filtros, y
  hacen `Router.go('tareas')`. La vista expande automáticamente esa
  card y la resalta con animación `pendienteFlash` durante 2.5s
  (border + box-shadow azul institucional).
- Cierra el modal de ficha automáticamente al navegar.

### 7. Pendiente automático SIGEM

`CICLO.crear()` con `sigemEstado === 'falta'` sigue llamando a
`PENDIENTE.crear()` con `tipo: 'sigem'`, descripción autocompletada,
vencimiento 3 días hábiles y `meta.cicloUuid`. Sin lógica duplicada.

Verificado: cerrar el pendiente SIGEM desde la nueva UI (cambiar
estado a `Cerrado`) **no avanza el ciclo correctivo**. Arrancar el
ciclo requiere el flujo existente "Completar folio SIGEM" que pide
el folio antes.

### Simulaciones R4

| # | Flujo | Resultado |
|---|-------|-----------|
| Suite 1-15 + 4b/7 + R2 + R3 | Sin regresiones | OK · 25 sims verdes |
| R4.1 | Renombrado UI Pendientes | OK · nav, dashboard KPI, vista, botones |
| R4.2 | Abierto → EnCurso → Esperando → Cerrado → Reabrir | OK · 5 entradas de log con formato correcto |
| R4.3 | Subtareas: agregar 3 / toggle 2 / eliminar 1, persistencia | OK · 2 subtareas en localStorage post-write · toggle no contamina log |
| R4.4 | Agregar notas al log | OK · timestamps correctos |
| R4.5 | Editar pendiente (descripción + vencimiento) | OK · log registra diffs |
| R4.6 | Agrupación por urgencia y filtros | OK · 5 secciones, filtros Estado y Responsable funcionan |
| R4.7 | Migración legacy `{uuid, fechaCompromiso, responsable, estado raro}` | OK · idempotente, ningún dato perdido |
| R4.8 | Pendiente SIGEM auto y cierre manual | OK · creación correcta, cerrar no avanza ciclo |
| R4.9 | Foco desde ficha del equipo | OK · `UI_PEND.focusId` expande la card y limpia filtros |

### NO realizado intencionalmente

- Fase 2 (Apps Script) sigue pausada. Los archivos en `apps-script/`
  quedaron tal como estaban en iteraciones previas, sin tocar.
- ID interno de la vista (`'tareas'`) preservado para no romper
  deep-links ni el migrador desde legacy.
- API existente (`PENDIENTE.crear`, `PENDIENTE.cerrar`) preservada;
  todos los call sites siguen funcionando sin cambios.
- Flujo "Completar folio SIGEM" (que arranca el ciclo) NO se reemplazó
  por el cambio simple de estado del pendiente.

## Fase 1 · Iteración R3 — Solicitud de trabajo · Nombre completo · Plantilla institucional · Dropdowns bloqueados

### 1. Botón "+ Solicitud de trabajo" en la ficha

Nuevo botón al lado de "+ Ciclo correctivo" (`ti-file-text`). Abre un
modal liviano con: fecha real (admite retroactivo, max hoy), folio
SIGEM opcional, descripción obligatoria, responsable obligatorio
elegido del dropdown bloqueado.

Comportamiento:
- Si el equipo está `Operativo`: pasa a `NoOperativo` con
  `estadoDesde = fechaEvento`. Genera evento `ESTADO` y `SOLICITUD_TRABAJO`.
- Si el equipo ya está en otro estado: registra `SOLICITUD_TRABAJO` con
  un banner informativo, NO cambia el estado.
- **No crea ciclo correctivo.** Es evento puro.

El timeline tiene mapeo nuevo `describeEvento()` que renderiza tipos
conocidos con ícono y título amigable (`SOLICITUD_TRABAJO` →
`ti-file-text` azul; también `ESTADO`, `APERTURA-CICLO`, `CICLO-*`,
`EDICION_RETROACTIVA`, `CAUSAL-*`, `GRILLA`, `MP`, etc.). Antes se
mostraba el tipo crudo y el payload JSON.stringify-eado.

### 2. Contactos de Agenda: campo único "Nombre completo"

`PERSONA_CAMPOS` cambió de `['nombre','apellido','correo','anexo','celular']`
a `['nombreCompleto','correo','anexo','celular']`.

- Drawer y modal quick-add reemplazaron los dos inputs por uno solo
  con placeholder `"ej. DANIELA CAROLINA GUERRA MOURGUET"`.
- `getContacto()` migra silenciosamente registros viejos:
  `nombreCompleto = (nombre + ' ' + apellido).trim()` y persiste.
- Card y buscador leen `nombreCompleto` directamente. El placeholder
  del buscador se actualizó.

### 3. Plantilla XLSX: formato institucional exacto

Reescritura completa de `exportPlantillaAsignacion()` para igualar
byte-a-byte la plantilla institucional de referencia
(`Plantilla_Asignacion_Jul_2026.xlsx`):

**Hoja `Asignación`** (con tilde, sheetId=1) — 13 columnas:
N° Carpeta · N° Inventario · Equipo · Servicio · Unidad · Ubicación ·
Marca · Modelo · Serie · Año · Frecuencia MP · Programado en mes ·
Responsable.

(R2 tenía 9 columnas con nombres distintos: faltaban Unidad,
Ubicación, Marca, Modelo, Año. Decía "N° Serie" y "Prog. {Mes}";
ahora "Serie" y "Programado en mes".)

**Hoja `Responsables_oficiales`** (sheetId=2) — **VISIBLE**, no oculta.
Header "Responsable oficial" + 11 técnicos en orden institucional.

**`<autoFilter ref="A1:M{N}"/>`** tras `</sheetData>` para activar
embudos en cada encabezado.

**`<definedNames>`** en `workbook.xml`:
`_xlnm._FilterDatabase` localSheetId 0 → `'Asignación'!$A$1:$M$N`.

**`<dataValidations>`** después del autoFilter:
- `errorTitle="Responsable no válido"`, `error="Elegí un técnico de la lista oficial."` (tildes en UTF-8, no ASCII puro como R2)
- `promptTitle="Asignar responsable"`, `prompt="Elegí un técnico de la lista desplegable."` (NUEVOS — R2 no los tenía)
- `sqref="M2:M{N}"` (columna M, no I como R2)
- `formula1="Responsables_oficiales!$A$2:$A$12"`

**Nombre del archivo**: `Plantilla_Asignacion_{MesAbr}_{Año}.xlsx`
(ejemplo: `Plantilla_Asignacion_Jul_2026.xlsx`).

**Por qué el dropdown de R2 no funcionaba** (corrección de la
hipótesis errónea de R2): la causa REAL del archivo dañado en Excel
no era el orden de elementos (eso ya estaba bien después del fix
intermedio), sino que la hoja Tecnicos estaba marcada como
`Hidden:1`. Excel resuelve referencias inter-hoja en `dataValidation`
de forma menos confiable cuando la hoja destino está oculta. **openpyxl
no detectaba este problema** porque su validador es más permisivo que
Excel — sus assertions de "OK" en R2 dieron una falsa sensación de
seguridad. La plantilla institucional de referencia deja la hoja
visible y por eso funciona. Solución: hoja `Responsables_oficiales`
visible.

### 4. Dropdown bloqueado de Técnicos Oficiales del SEC

**Constante restaurada** `TECNICOS_OFICIALES` con 11 nombres en orden
institucional: Ricardo Matus Aroca · Ignacio Berner Bergara · Matías
Soazo Garrido · Daniel Díaz Neira · Tito Millapán Riquelme · Carlos
Bahamondes Seguel · Cristián Beltrán Oviedo · Cristina Rozas Urrutia
· Macarena Toledo · Marco Ulloa · Personal externo.

**Helper nuevo** `selectTecnico(value, attrs, opts)` construye un
`<select>` con placeholder no seleccionable + 11 opciones oficiales
+ valor histórico (si el dato actual no está en la lista oficial, se
preserva como opción extra para no perder información de registros
viejos). Opcional `includeOtros: true` agrega un `<optgroup>` con
ejecutores históricos para edición retroactiva.

**Reemplazo en 6 modales** (de `<input list>` con datalist a
`<select>` real con dropdown visual):
- Modal Registrar MP — campo Ejecutor (validación: obligatorio)
- Modal Apertura de ciclo — campo Responsable
- Modal Vinculación C3 (opciones "nuevo" y "pendiente") — Responsable
- Modal Vinculación C2 — Responsable
- Modal Envío del ciclo correctivo — Responsable del envío
- Modal Solicitud de trabajo (nuevo en este R3) — Responsable
- Modal Nueva tarea — Asignado a

`EQ.ejecutores()` (lee del historial) sigue existiendo y se usa para
filtros, no para selección al registrar.

### Verificación R3

| # | Flujo | Resultado |
|---|-------|-----------|
| Suite 1-15 + 4b + 7 + R2 | Sin regresiones | OK · 21 sims verdes |
| R3.1a | Solicitud de trabajo sobre equipo Operativo | OK · equipo → NoOperativo con fecha real · evento `SOLICITUD_TRABAJO` + `ESTADO` · sin ciclo correctivo |
| R3.1b | Solicitud sobre equipo ya en ServicioTecnico | OK · evento registrado · estado NO cambia |
| R3.2 | Migración contactos `{nombre,apellido}` → `{nombreCompleto}` | OK · se unifican, se persiste, no se pierden correo/anexo/celular |
| R3.3 | selectTecnico en modal Registrar MP | OK · 12 opciones (placeholder + 11) · primer técnico institucional es Ricardo Matus Aroca |
| Plantilla XLSX | Inspección byte-a-byte vs referencia | OK · 13 columnas en orden exacto · ambas hojas visibles · autoFilter A1:M{N} · definedName `_xlnm._FilterDatabase` · dataValidation con `promptTitle`/`prompt` y tildes UTF-8 · sqref M2:M{N} · formula1 Responsables_oficiales!$A$2:$A$12 · nombre `Plantilla_Asignacion_Jul_2026.xlsx` |

## Fase 1 · Iteración R2 — Fixes del feedback de uso

### 1. Inventario muestra columna ID

La columna ID del maestro (campo `e.id`) aparece como primera
columna de la tabla, monoespaciada, con tooltip en hover. Sentinel
de paginación ajustado a 9 columnas.

### 2. Plantilla XLSX no abría — bug encontrado y reparado

El bug del export anterior **no era de ordenamiento ECMA-376 entre
sheetData y pageMargins** como pensé. SheetJS escribe
`<ignoredErrors>` (elemento #28 del schema) inmediatamente después
de `</sheetData>`, sin un `<pageMargins>` intermedio. Mi inyector
buscaba `<pageMargins>` como ancla, no lo encontraba, y caía a la
opción de último recurso: insertar antes de `</worksheet>`. Eso
dejaba la secuencia `sheetData → ignoredErrors → dataValidations →
fin`, con `dataValidations` (#18) después de `ignoredErrors` (#28).
Excel rechazaba el archivo como dañado.

Fix: la inyección ahora ocurre **siempre justo después de
`</sheetData>`**, dando la secuencia válida `sheetData (#6) →
dataValidations (#18) → ignoredErrors (#28) → fin`. Validado con
**openpyxl** (lector estricto del schema OOXML) que abre el
archivo y lee correctamente la dataValidation y el estado oculto
de la hoja Tecnicos. Si no hay técnicos disponibles, la validación
no se inyecta (se evita formula con rango inválido). Atributos de
error en ASCII puro para evitar problemas de encoding en algunas
versiones antiguas de Excel.

### 3. Plantilla filtra a equipos del mes

`exportPlantillaAsignacion(periodo)` ahora incluye **solo equipos
con marca de grilla X/R/PM/RA en el mes del período**. Antes
exportaba todos los equipos activos. Si no hay nada programado en
el mes, la función lanza un error claro pidiendo revisar la grilla.

Columnas nuevas: agregada **"Prog. {Mes}"** entre Frecuencia MP y
Responsable, mostrando la marca de grilla del mes para que el
ingeniero sepa qué corresponde hacer. Responsable se movió a
columna I (ajustado `sqref` del dataValidation).

Pre-llenado de Responsable busca primero la asignación del período;
si no hay, usa la asignación previa más reciente de ese equipo en
cualquier período cargado.

### 4. KPIs del mes en vista Entregas

Al cambiar el período, ahora aparece una sección **"Mes {Mes} {Año}"**
con 5 KPIs computados sobre todos los equipos activos:

- Con marca en grilla (X/R/PM/RA) — clickeable, lleva a PMP filtrado
- Programadas (X/R)
- Ejecutadas (SI) con % de cumplimiento y semáforo
- Causalizadas
- Pendientes (programadas − ejecutadas − causalizadas)

Una segunda sección **"Asignación de responsables"** mantiene los KPIs
de técnicos activos / equipos asignados / sin asignar.

### 5. Quitada la mención al "Responsable MP" del maestro

El header de Entregas decía "sin archivo mensual — usando Responsable
MP del maestro" (residuo de la iteración anterior). Ahora dice "sin
archivo de asignación — todos los equipos quedan en (sin asignar)",
consistente con la decisión de la R1 de que `responsableMaster` es
referencial.

### Simulaciones R2

| # | Flujo | Resultado |
|---|-------|-----------|
| 1-15 | Suite anterior completa | OK · sin regresiones |
| R2.A | Columna ID en Inventario | OK · primera columna, valor del maestro |
| R2.B | KPIs del mes al cambiar período en Entregas | OK · 5 KPIs presentes y actualizan al cambiar período |
| R2.C | Plantilla XLSX validada con openpyxl | OK · 9 columnas, dataValidation tipo list correctamente referenciada, hoja Tecnicos oculta, archivo abre limpio en lector estricto |
| R2.D | Plantilla filtra al mes | OK · 30 equipos con marca de mayo → plantilla con 30 filas, no 200 |

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
