# Perfil de uso — PMP HHHA (contexto para asistencia por IA)

> **Para qué sirve este documento.** Es un *briefing de contexto* destinado a
> ser entregado a una IA (asistente de desarrollo, copiloto dentro de la app, o
> agente que priorice trabajo) para que entienda **cómo se usa realmente** el
> sistema PMP del Subdepartamento de Equipamiento Clínico (SEC) del Hospital
> Dr. Hernán Henríquez Aravena. No describe la arquitectura (ver
> `ARCHITECTURE.md`) sino el **comportamiento de uso observado** y las
> **proyecciones** que de él se derivan.
>
> **Cómo usarlo (instrucción para la IA lectora):** trata las secciones 3–6
> como hechos observados con su nivel de confianza; usa la sección 7 como
> directrices de diseño; y el bloque JSON de la sección 9 como resumen
> estructurado parseable. Cuando una decisión dependa de un patrón aquí
> descrito, cítalo por su id (p. ej. `P3`, `PROY-2`).

---

## 1. Procedencia y confianza de los datos

| Fuente | Contenido | Confianza |
|---|---|---|
| `sesion…1533.json` | 1 grabación de sesión real, 638 eventos de telemetría, app v0.62, 2026‑06‑01 | Patrones intra‑sesión: **alta**. Generalización entre sesiones: **baja** (n=1) |
| `hhhadata…_4.json` | Backup completo del estado (893 equipos, 1.088 eventos, programa MP 2026) | Censo completo: **alta** |
| `hhhaexport…_6.xlsx` | Export Excel de 9 hojas generado en la misma sesión | Verificación cruzada: **alta** |

Las tres fuentes son del **mismo turno de trabajo**: la sesión arranca en
`eventos:1077` y crea `+11`; el backup cierra en `eventos:1088`. Por tanto el
backup es el estado al final de lo grabado y el `.xlsx` es el export que se ve
en los toasts. **Limitación clave:** todo el perfil conductual proviene de
**una** sesión de **un** usuario. Sirve para diseñar y priorizar; no para
afirmar estacionalidad ni variación entre operadores.

---

## 2. Persona operativa

- **Un único operador** (administrador/gestor SEC), perfil *power user* de
  data‑entry. No es uso multiusuario hoy (la concurrencia es 1).
- **Entorno:** Windows 10 + Chrome, escritorio. App offline‑first servida desde
  disco; **no hay backend** — el `localStorage` es la fuente de verdad y el
  backup JSON/Excel es el artefacto durable.
- **Mentalidad:** registra trabajo de terreno ya ejecutado (no planifica en la
  app), corrige sus propios errores de tecleo y exporta con disciplina cuando
  la app se lo recuerda. Confía en el flujo (cero abortos).

---

## 3. Patrones de uso observados

Cada patrón: **observación → evidencia cuantificada → implicación para la IA.**

### P1 · Sesión larga en reloj, mínima en actividad ("trabajo a ráfagas")
- **Evidencia:** 104,9 min de duración total, **3,9 min activos (3,7 %)**;
  101 min idle repartidos en dos ausencias largas (35 min + 18 min vía
  `think_time`). 24 cambios de vista, navegación equipos→ficha→volver.
- **Lectura:** el operador trabaja en **ráfagas cortas y enfocadas**
  intercaladas con otras tareas clínicas/administrativas. Una "sesión" es un
  contenedor de varias horas con bolsones de trabajo real de minutos.
- **Implicación IA:** priorizar **resumibilidad** (autosave de borradores,
  "continuar donde quedó"), **recordatorios de backup por nº de cambios** (ya
  existen: "Llevas 70/80 cambios…") y **no asumir continuidad**: la app puede
  quedar abierta e inactiva por horas. Cualquier timeout/bloqueo debe tolerar
  AFK prolongado.

### P2 · La tarea dominante es **registrar MP** (todo lo demás es marginal)
- **Evidencia:** de 1.088 eventos del backup, **1.080 son "Mantención
  preventiva"**; solo 8 son correctivos (solicitudes, visitas, envío ST, OC).
  **`ciclos: 0`** — la máquina de ciclo correctivo prácticamente no se usa aún.
  En la sesión: 11 MP registradas, 7 pendientes cerrados, 3 anulaciones.
- **Implicación IA:** **optimizar el camino de registro de MP por encima de
  todo**. Las features de ciclo correctivo, aunque ricas, hoy no son el cuello
  de botella; mejorarlas tiene bajo retorno frente a acelerar el alta de MP.

### P3 · Navegación **por lotes, equipo por equipo**, secuencial por inventario
- **Evidencia:** 9 fichas abiertas en orden de inventario
  (`2-119713 → 2-121004 → 2-121002 → …`), patrón repetido
  *lista → ficha → registrar → ← Volver → siguiente*.
- **Implicación IA:** un **"modo lote"** (siguiente/anterior equipo sin volver
  a la lista, o cola de trabajo del mes) ahorraría la mayor parte de los
  cambios de vista. La unidad mental de trabajo es "el equipo", no "el mes".

### P4 · Atribución a **un conjunto reducido de ejecutores** — fricción #1 medida
- **Evidencia:** el `<select>` de técnico/ejecutor es el objetivo con más
  `hover_long` (10) y aparece en los clicks repetidos; el operador eligió el
  **mismo ejecutor (E1)** una y otra vez, y alterna con E2/E3 (≈3–4 técnicos
  recurrentes). **No hay memoria del último ejecutor** → cada MP recorre el
  dropdown completo.
- **Implicación IA:** **recordar y precargar el último ejecutor** (por sesión y
  opcionalmente por servicio). Es la mejora de mayor impacto/menor costo que
  arroja la telemetría. Secundario: convertir el select en typeahead.

### P5 · Cuando la MP **no se ejecuta**, predominan pocas causales
- **Evidencia:** de 306 MP justificadas, **C5=150, C6=59, C7=49** concentran el
  85 %; el resto (C1‑C3/C8/NU) es minoritario. El `<select>` de causal también
  registra clicks repetidos.
- **Implicación IA:** **ordenar/priorizar las causales por frecuencia** (o
  ofrecer accesos rápidos a las 3 top). No hace falta exponer las 12 con igual
  peso.

### P6 · Disciplina de **export/backup** reactiva a recordatorios
- **Evidencia:** 4 exports Excel + 4 backups JSON en la sesión, gatillados tras
  los toasts "Llevas N cambios, descarga backup". El operador trata el export
  como el **artefacto durable** (no hay servidor).
- **Implicación IA:** la **seguridad del dato es prioridad máxima**. Nunca
  asumir persistencia remota; reforzar (no debilitar) los recordatorios; el
  Excel/JSON es el entregable, no un subproducto.

### P7 · Corrección por **anulación** ("Mal ingresado") es un camino real
- **Evidencia:** 3 anulaciones en la sesión, motivo "Mal ingresado"; toast
  "Evento anulado (R de Abr eliminado; 1 pendiente automático anulado)".
- **Implicación IA:** el **deshacer/corregir debe seguir siendo barato y
  visible**. El operador comete errores de tecleo ocasionales y los repara en
  el acto; romper o esconder este flujo dolería.

### P8 · Perfil de **errores: cero**
- **Evidencia:** `errores:0, formErrors:0, modalAborts:0` en 147 clicks y 133
  inputs. Ningún formulario abandonado.
- **Implicación IA:** la base es robusta y el operador la entiende. **No
  reescribir flujos que funcionan**; las mejoras deben ser aditivas
  (defaults, atajos), no cambios disruptivos de UX.

---

## 4. Modelo de costo de interacción (observado)

- **Throughput de ráfaga:** 11 MP + 7 cierres de pendiente + 3 anulaciones +
  8 exports en **≈3,9 min activos**.
- **Costo por MP:** ≈ **15–21 s activos** (incluye navegar a la ficha, abrir
  "➕ Evento", completar fecha + resultado + ejecutor + causal y "Guardar
  evento"; ~5–8 interacciones por registro).
- **Cuello de botella unitario:** el `<select>` de ejecutor (P4) y, en menor
  medida, el de causal (P5). El resto del formulario fluye.

> El registro **manual** es eficiente. El tiempo total largo (P1) es ausencia,
> no lentitud de la herramienta.

---

## 5. Proyecciones de uso (con supuestos explícitos)

**Escala del programa (censo, confianza alta):**

| Indicador | Valor |
|---|---|
| Equipos | 893 (maestro 894; 1 fila basura `inv=0`) |
| MP programadas / año | **2.314** |
| MP vencidas a 2026‑06‑01 (Ene–May) | 1.290 → 58 % ejecutadas · 24 % justificadas · **18 % sin registro (236)** |
| MP por venir (Jun–Dic) | **1.024** |

**Carga restante 2026 y su costo manual estimado** (supuesto: ~18 s/MP, P4):

| Horizonte | Registros a resolver | Trabajo activo manual (estimado) |
|---|---|---|
| Backlog actual (gap sin registro) | 236 | ~1,0–1,3 h |
| Jun–Dic programadas | 1.024 | ~4,3–5,7 h |
| **Total resto de 2026** | **~1.260** | **~5,3–7 h activas** |

> **Matiz crítico (PROY‑origen):** el **88 % de los registros históricos
> (962/1.088) se generó por import automático** (`origen: conciliacion_auto`
> del `.xlsm` de programación), no tecleando. La carga **manual** real es la
> fracción que el import no concilia + causales/reprogramaciones + correctivos
> + pendientes. Por eso las ~5–7 h de arriba son un **techo**: gran parte se
> resolverá por import, no a mano.

**Cadencia/estacionalidad del programa** (define los picos de import y registro):

```
Ene 184 · Feb 301 · Mar 284 · Abr 328 · May 193 · Jun  18
Jul 165 · Ago 187 · Sep 240 · Oct 205 · Nov 191 · Dic  18
```
- Dominado por equipos **Semestral (840 de 893)** → dos grandes olas; los
  **Trimestral (25)** caen en Feb/May/Ago/Nov.
- **Picos:** Abr (328), Feb (301), Sep (240). **Valles:** Jun y Dic (18 c/u).
- **PROY‑1:** esperar **ráfagas de import + registro alrededor de los picos**;
  Jun (mes actual) es valle → ventana natural para **saldar backlog**, no para
  alta nueva.

**Crecimiento de datos (para dimensionar almacenamiento/rendimiento):**
- `eventos`: +~960/año por import del programa anual + ~120/año manuales →
  **~1.000–1.100 eventos/año**. A 5 años ≈ 5–6k filas: manejable en
  `localStorage` y en Sheets (ver `NOTAS_FASE_2.md`).
- `equipos`: prácticamente **estable** (~893).
- `pendientes`: 51 hoy, **43 sin iniciar** → **crece** si no se trabaja el
  backlog (ver PROY‑3).
- `conflictos`: 26, todos del import (`mp_diferencia`) → crecen con cada
  reimportación de programa.

**Riesgos proyectados (operativos, no de software):**
- **PROY‑2 · Cobertura:** **193 equipos operativos (22,6 %) con MP programada y
  0 ejecuciones en 2026**, concentrados en Pabellón CMA (77 %), Cirugía Adulto
  (74 %) y **UPC Adulto (66 equipos, 59 %)**. Sin intervención, terminan el año
  bajo cumplimiento.
- **PROY‑3 · Pendientes estancados:** 43/51 "no iniciado", solo 6 cerrados; sin
  fecha de vencimiento → el contador de vencidos no alerta. Tienden a
  acumularse.
- **PROY‑4 · Equipos detenidos:** ~30 unidades llevan 35–137 días no operativas
  o en ST (varios monitores 106–137 días en Neonato/Pedia/Medicina). Es
  disponibilidad clínica; crecerá si no se gestiona el correctivo (hoy
  infrautilizado, P2).

---

## 6. Resumen de la jornada (qué pasó, en una línea)

Operador único saldando MP de terreno: abrió 9 fichas en orden de inventario,
registró 11 MP atribuidas a ~3 técnicos, corrigió 3 mal ingresadas, cerró 7
pendientes y exportó Excel+JSON 4 veces tras los avisos de backup — todo en
~4 min activos repartidos en ~1,75 h, **sin un solo error**.

---

## 7. Directrices de diseño para la IA (consolidado)

**HACER:**
1. **Recordar el último ejecutor** y precargarlo (P4) — máximo impacto.
2. **Ordenar causales por frecuencia**, atajo a las 3 top (P5).
3. **Modo lote** equipo‑siguiente y/o **cola de trabajo del mes** (P3).
4. **Panel/alertas operativas** en el dashboard: "operativos sin MP en el año"
   (PROY‑2), "detenidos >30/60/90 días" (PROY‑4), "pendientes sin iniciar"
   (PROY‑3). Extiende las alertas *Grupo A >30d* ya existentes.
5. **Tolerar AFK largo** y reforzar autosave/backup (P1, P6).
6. Mantener **anular/corregir barato y visible** (P7).

**NO HACER:**
1. No asumir backend ni persistencia remota (P6).
2. No reescribir flujos que ya funcionan sin error (P8); mejoras aditivas.
3. No invertir esfuerzo grande en el ciclo correctivo antes que en el alta de
   MP (P2) — salvo que el uso cambie.
4. No tratar las 12 causales con igual peso ni exponer dropdowns largos sin
   default (P4/P5).

---

## 8. Cómo refrescar este perfil

Este perfil se basa en **1 sesión**. Para subir la confianza conductual:
capturar 5–10 sesiones de distintos días/meses (idealmente un pico como Abr y
un valle como Jun) y recomputar `activeMs`, costo por MP, fricciones (`hover_long`
/ clicks repetidos por objetivo) y volumen de altas manuales vs import. Mantener
los nombres de técnicos **anonimizados** en cualquier versión versionada.

---

## 9. Resumen legible por máquina

```json
{
  "doc": "perfil_de_uso_pmp_hhha",
  "version_app": "0.62",
  "fecha_fuente": "2026-06-01",
  "confianza": { "intra_sesion": "alta", "entre_sesiones": "baja_n1", "censo_datos": "alta" },
  "persona": { "operadores": 1, "rol": "admin_SEC", "entorno": "Windows/Chrome offline", "backend": false },
  "sesion": {
    "duracion_min": 104.9, "activo_min": 3.9, "activo_frac": 0.037,
    "clicks": 147, "inputs": 133, "hover_long": 63, "cambios_vista": 24,
    "errores": 0, "form_errors": 0, "modal_aborts": 0,
    "mp_registradas": 11, "pendientes_cerrados": 7, "anulaciones": 3,
    "exports_excel": 4, "backups_json": 4, "fichas_abiertas": 9,
    "costo_por_mp_seg": [15, 21]
  },
  "patrones": {
    "P1_rafagas_AFK": true,
    "P2_tarea_dominante": "registro_MP",
    "P2_ciclos_correctivos_usados": 0,
    "P3_navegacion": "por_equipo_secuencial",
    "P4_friccion_top": "select_ejecutor_sin_memoria",
    "P5_causales_top": ["C5", "C6", "C7"],
    "P6_persistencia": "export_local_reactivo",
    "P7_correccion": "anulacion_frecuente",
    "P8_errores": 0
  },
  "programa_mp_2026": {
    "equipos": 893, "programadas_anio": 2314,
    "vencidas_ene_may": 1290, "ejecutadas_frac": 0.58, "justificadas_frac": 0.237, "gap_sin_registro": 236,
    "por_venir_jun_dic": 1024,
    "prog_por_mes": {"Ene":184,"Feb":301,"Mar":284,"Abr":328,"May":193,"Jun":18,"Jul":165,"Ago":187,"Sep":240,"Oct":205,"Nov":191,"Dic":18},
    "origen_registros": {"auto_conciliacion": 962, "manual": 126, "auto_frac": 0.884}
  },
  "proyecciones": {
    "registros_restantes_2026": 1260,
    "trabajo_activo_manual_horas_techo": [5.3, 7.0],
    "nota": "gran parte se resuelve por import automatico, no a mano",
    "cobertura_riesgo": { "operativos_sin_mp_2026": 193, "frac": 0.226, "peores": {"Pabellon CMA":0.77,"Cirugia Adulto":0.74,"UPC Adulto":0.59} },
    "pendientes_estancados": 43,
    "equipos_detenidos_mas_30d": 30
  },
  "directrices": {
    "hacer": ["memoria_ultimo_ejecutor","causales_por_frecuencia","modo_lote_equipo","alertas_operativas_dashboard","tolerar_AFK_autosave","anular_barato"],
    "no_hacer": ["asumir_backend","reescribir_flujos_sin_error","priorizar_correctivo_sobre_MP","dropdowns_sin_default"]
  }
}
```
