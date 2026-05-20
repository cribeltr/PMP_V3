/**
 * PMP · SEC · HHHA Temuco — Fase 2
 * Servidor Apps Script (bound al Sheet maestro)
 *
 * Iteración F2.It.1: foundation
 *   - Bootstrap del esquema de hojas
 *   - doGet sirve el Web App
 *   - API básica para el cliente vía google.script.run:
 *     apiBootstrap, apiListEquipos, apiSaveEquiposBulk,
 *     apiSaveContactos, apiListPendientes, apiSavePendiente, apiLog
 */

// ============================================================
// CONSTANTES
// ============================================================
const APP_VERSION   = '4.0.0-f2-it1';
const SCHEMA_VERSION = 1;

const SHEETS = {
  Meta:          ['key','value'],
  Equipos:       ['uuid','id','fam','famOriginal','carpeta','inventario','nombre','servicio','unidad','ubicacion','procedencia','marca','modelo','serie','anio','vidaUtil','clasificacion','enu','observacion','frecuencia','responsableMaster','enGarantia','garantiaHasta','garantiaProveedor','estado','estadoDesde','esSlot','grillaEne','grillaFeb','grillaMar','grillaAbr','grillaMay','grillaJun','grillaJul','grillaAgo','grillaSep','grillaOct','grillaNov','grillaDic'],
  Historial_MP:  ['id','equipoUuid','fechaEvento','fechaRegistro','mes','resultado','estadoFinal','tipoBaja','ejecutor','obs','correctivoUuid','importadoDelMaestro','motivoCambioEjecutor'],
  Eventos:       ['id','equipoUuid','ts','tsRegistro','tipo','payloadJson'],
  Ciclos:        ['uuid','equipoUuid','abierto','cancelado','eslabonActual','ruta','enGarantia','aperturaJson','diagnosticoJson','compraJson','garantiaJson','envioJson','recepcionJson','reparacionJson','borradoresJson','cerradoEn','cerradoMotivo'],
  Pendientes:    ['id','tipo','descripcion','equipoUuid','asignado','estado','creado','vence','cerrado','logJson','metaJson'],
  Contactos:     ['servicio','dataJson'],
  Asignaciones:  ['periodo','equipoUuid','responsable','archivo','fechaCarga'],
  Logs_Errores:  ['ts','usuario','funcion','mensaje','stack'],
};

const MESES_KEYS = ['grillaEne','grillaFeb','grillaMar','grillaAbr','grillaMay','grillaJun','grillaJul','grillaAgo','grillaSep','grillaOct','grillaNov','grillaDic'];

// ============================================================
// MENU + WEBAPP
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PMP · SEC')
    .addItem('Abrir aplicación (Web App)', 'menuOpenWebapp')
    .addItem('Abrir sidebar utilitario',   'menuOpenSidebar')
    .addSeparator()
    .addItem('Crear / verificar hojas',    'ensureSchema')
    .addItem('Ver estado del sistema',     'menuShowStatus')
    .addToUi();
}

function doGet(e) {
  ensureSchema();
  return HtmlService.createTemplateFromFile('webapp')
    .evaluate()
    .setTitle('PMP · SEC · HHHA Temuco')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Helper for HTML templates: <?!= include('webapp_css') ?> */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function menuOpenWebapp() {
  let url;
  try { url = ScriptApp.getService().getUrl(); } catch (e) { url = null; }
  const html = url
    ? `<div style="font:13px/1.5 -apple-system,sans-serif;padding:14px;">
        <p style="margin:0 0 10px 0">Web App desplegada en:</p>
        <p style="margin:0 0 14px 0"><a href="${url}" target="_blank" style="color:#1a73e8">${url}</a></p>
        <p style="font-size:11px;color:#666;margin:0">Si es la primera vez, en el menú <em>Implementar → Nueva implementación → Aplicación web</em> y guardá la URL.</p>
       </div>`
    : `<div style="font:13px/1.5 -apple-system,sans-serif;padding:14px;color:#a16207">
        <strong>Aún no se ha implementado la Web App.</strong><br>
        En el editor de Apps Script: Implementar → Nueva implementación → Aplicación web.
       </div>`;
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput(html).setWidth(420).setHeight(180),
    'PMP · Aplicación'
  );
}

function menuOpenSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar').setTitle('PMP · SEC');
  SpreadsheetApp.getUi().showSidebar(html);
}

function menuShowStatus() {
  const info = apiBootstrap();
  const ui = SpreadsheetApp.getUi();
  ui.alert('PMP — estado del sistema',
    `Sheet: ${info.sheetName}\nID: ${info.sheetId}\nVersión: ${info.appVersion}\nSchema: v${info.schemaVersion}\nEquipos: ${info.counts.equipos}\nMP: ${info.counts.historial}\nCiclos: ${info.counts.ciclos}\nPendientes: ${info.counts.pendientes}`,
    ui.ButtonSet.OK);
}

// ============================================================
// SCHEMA BOOTSTRAP
// ============================================================
function ensureSchema() {
  const ss = SpreadsheetApp.getActive();
  Object.entries(SHEETS).forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    // Aseguro headers en fila 1 si falta o difiere
    const range = sh.getRange(1, 1, 1, headers.length);
    const current = range.getValues()[0];
    const need = headers.some((h, i) => current[i] !== h);
    if (need) {
      range.setValues([headers]);
      sh.setFrozenRows(1);
      range.setFontWeight('bold').setBackground('#f1f3f4');
    }
    // Si el sheet tenía más columnas que el schema actual, las dejo (no destruyo datos).
  });
  // Meta
  upsertMeta_('appVersion',     APP_VERSION);
  upsertMeta_('schemaVersion',  String(SCHEMA_VERSION));
  upsertMeta_('bootstrappedAt', new Date().toISOString());
}

function upsertMeta_(key, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Meta');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sh.getRange(i+1, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

function readMeta_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Meta');
  if (!sh) return {};
  const data = sh.getDataRange().getValues();
  const out = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) out[data[i][0]] = data[i][1];
  }
  return out;
}

// ============================================================
// HOJA HELPERS (lectura / escritura genérica)
// ============================================================
function readSheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const headers = SHEETS[name];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(row => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i]; });
    return o;
  });
}

/** Reemplaza todo el contenido de la hoja (excepto headers) con filas dadas */
function writeSheetBulk_(name, rows) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Hoja no existe: ' + name);
  const headers = SHEETS[name];
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, headers.length).clearContent();
  if (!rows.length) return 0;
  const matrix = rows.map(o => headers.map(h => normalizeCell_(o[h])));
  sh.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
  return matrix.length;
}

function appendSheet_(name, row) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Hoja no existe: ' + name);
  const headers = SHEETS[name];
  const matrix = headers.map(h => normalizeCell_(row[h]));
  sh.appendRow(matrix);
}

function normalizeCell_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v;
  return String(v);
}

// ============================================================
// EQUIPO ↔ ROW (serialización con la grilla en 12 columnas)
// ============================================================
function equipoToRow_(e) {
  const row = Object.assign({}, e);
  // Aplano la grilla en 12 columnas
  MESES_KEYS.forEach((k, i) => { row[k] = (e.grilla && e.grilla[i+1]) || ''; });
  delete row.grilla;
  delete row.historial;
  delete row.eventos;
  delete row.correctivos;
  delete row.pendientesIds;
  return row;
}

function rowToEquipo_(r) {
  const grilla = {};
  MESES_KEYS.forEach((k, i) => { grilla[i+1] = r[k] || null; });
  const e = {
    uuid: r.uuid, id: r.id || null, fam: r.fam || '', famOriginal: r.famOriginal || '',
    carpeta: r.carpeta || null, inventario: r.inventario || '', nombre: r.nombre || '',
    servicio: r.servicio || '', unidad: r.unidad || '', ubicacion: r.ubicacion || '',
    procedencia: r.procedencia || '', marca: r.marca || '', modelo: r.modelo || '',
    serie: r.serie || '', anio: r.anio || '', vidaUtil: r.vidaUtil || '',
    clasificacion: r.clasificacion || '', enu: r.enu || '', observacion: r.observacion || '',
    frecuencia: r.frecuencia || '', responsableMaster: r.responsableMaster || '',
    enGarantia: r.enGarantia === true || r.enGarantia === 'true' || r.enGarantia === 'TRUE',
    garantiaHasta: r.garantiaHasta || null, garantiaProveedor: r.garantiaProveedor || '',
    estado: r.estado || 'Operativo', estadoDesde: r.estadoDesde || null,
    esSlot: r.esSlot === true || r.esSlot === 'true' || r.esSlot === 'TRUE',
    grilla,
    historial: [], eventos: [], correctivos: [], pendientesIds: [],
  };
  return e;
}

// ============================================================
// API · endpoints expuestos al cliente
// ============================================================

/**
 * Devuelve toda la información inicial necesaria para que el cliente
 * pueda arrancar: versión, IDs, contadores, fecha de último bootstrap.
 * Las entidades pesadas (equipos, historial) se piden por separado.
 */
function apiBootstrap() {
  ensureSchema();
  const ss = SpreadsheetApp.getActive();
  return {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    sheetId: ss.getId(),
    sheetName: ss.getName(),
    sheetUrl: ss.getUrl(),
    meta: readMeta_(),
    counts: {
      equipos:      countRows_('Equipos'),
      historial:    countRows_('Historial_MP'),
      eventos:      countRows_('Eventos'),
      ciclos:       countRows_('Ciclos'),
      pendientes:   countRows_('Pendientes'),
      contactos:    countRows_('Contactos'),
      asignaciones: countRows_('Asignaciones'),
    },
    user: getActiveUserEmail_(),
    timestamp: new Date().toISOString(),
  };
}

function countRows_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return 0;
  return Math.max(0, sh.getLastRow() - 1);
}

function getActiveUserEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function apiListEquipos() {
  return readSheet_('Equipos').map(rowToEquipo_);
}

/** Reemplaza la hoja Equipos completa con los registros recibidos. */
function apiSaveEquiposBulk(equipos) {
  if (!Array.isArray(equipos)) throw new Error('equipos debe ser un array');
  const rows = equipos.map(equipoToRow_);
  const n = writeSheetBulk_('Equipos', rows);
  upsertMeta_('lastEquiposWrite', new Date().toISOString());
  return { ok: true, count: n };
}

function apiListPendientes() {
  return readSheet_('Pendientes').map(r => Object.assign({}, r, {
    log:  safeParseJSON_(r.logJson)  || [],
    meta: safeParseJSON_(r.metaJson) || null,
  }));
}

function apiSavePendientesBulk(pendientes) {
  if (!Array.isArray(pendientes)) throw new Error('pendientes debe ser un array');
  const rows = pendientes.map(p => ({
    id: p.id, tipo: p.tipo || 'general', descripcion: p.descripcion || '',
    equipoUuid: p.equipoUuid || '', asignado: p.asignado || '',
    estado: p.estado || 'Abierto', creado: p.creado || '', vence: p.vence || '',
    cerrado: p.cerrado || '',
    logJson:  JSON.stringify(p.log  || []),
    metaJson: JSON.stringify(p.meta || null),
  }));
  const n = writeSheetBulk_('Pendientes', rows);
  return { ok: true, count: n };
}

function apiListContactos() {
  const out = {};
  readSheet_('Contactos').forEach(r => {
    out[r.servicio] = safeParseJSON_(r.dataJson) || null;
  });
  return out;
}

function apiSaveContactosBulk(contactosMap) {
  if (!contactosMap || typeof contactosMap !== 'object') throw new Error('contactosMap inválido');
  const rows = Object.entries(contactosMap).map(([servicio, data]) => ({
    servicio, dataJson: JSON.stringify(data || {}),
  }));
  const n = writeSheetBulk_('Contactos', rows);
  return { ok: true, count: n };
}

function apiListAsignaciones() {
  const rows = readSheet_('Asignaciones');
  const out = {};
  rows.forEach(r => {
    if (!r.periodo) return;
    if (!out[r.periodo]) out[r.periodo] = { __meta: { archivo: r.archivo || '', fechaCarga: r.fechaCarga || '', mes: Number(r.periodo.split('-')[1]), anio: Number(r.periodo.split('-')[0]) } };
    if (r.equipoUuid && r.responsable) out[r.periodo][r.equipoUuid] = r.responsable;
  });
  return out;
}

function apiSaveAsignacionPeriodo(periodo, asign) {
  if (!periodo) throw new Error('periodo requerido');
  // Borro filas del período actual y reescribo
  const sh = SpreadsheetApp.getActive().getSheetByName('Asignaciones');
  const last = sh.getLastRow();
  if (last > 1) {
    const data = sh.getRange(2, 1, last-1, SHEETS.Asignaciones.length).getValues();
    const keep = data.filter(r => r[0] !== periodo);
    sh.getRange(2, 1, last-1, SHEETS.Asignaciones.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, SHEETS.Asignaciones.length).setValues(keep);
  }
  const meta = asign.__meta || {};
  Object.entries(asign).forEach(([k, v]) => {
    if (k === '__meta') return;
    sh.appendRow([periodo, k, v, meta.archivo || '', meta.fechaCarga || '']);
  });
  return { ok: true };
}

function apiListHistorial(equipoUuid) {
  const all = readSheet_('Historial_MP');
  return equipoUuid ? all.filter(r => r.equipoUuid === equipoUuid) : all;
}

function apiSaveHistorialBulk(records) {
  // Reemplaza toda la hoja Historial_MP
  if (!Array.isArray(records)) throw new Error('records debe ser array');
  const n = writeSheetBulk_('Historial_MP', records);
  return { ok: true, count: n };
}

function apiListEventos(equipoUuid) {
  const all = readSheet_('Eventos').map(r => Object.assign({}, r, {
    payload: safeParseJSON_(r.payloadJson),
  }));
  return equipoUuid ? all.filter(r => r.equipoUuid === equipoUuid) : all;
}

function apiSaveEventosBulk(eventos) {
  const rows = eventos.map(ev => ({
    id: ev.id, equipoUuid: ev.equipoUuid, ts: ev.ts, tsRegistro: ev.tsRegistro || ev.ts,
    tipo: ev.tipo, payloadJson: JSON.stringify(ev.payload || null),
  }));
  const n = writeSheetBulk_('Eventos', rows);
  return { ok: true, count: n };
}

function apiListCiclos(equipoUuid) {
  return readSheet_('Ciclos').filter(r => !equipoUuid || r.equipoUuid === equipoUuid).map(r => ({
    uuid: r.uuid, equipoUuid: r.equipoUuid,
    abierto: !!r.abierto, cancelado: !!r.cancelado,
    eslabonActual: r.eslabonActual || '', ruta: r.ruta || '',
    enGarantia: !!r.enGarantia,
    apertura:    safeParseJSON_(r.aperturaJson),
    diagnostico: safeParseJSON_(r.diagnosticoJson),
    compra:      safeParseJSON_(r.compraJson),
    garantia:    safeParseJSON_(r.garantiaJson),
    envio:       safeParseJSON_(r.envioJson),
    recepcion:   safeParseJSON_(r.recepcionJson),
    reparacion:  safeParseJSON_(r.reparacionJson),
    borradores:  safeParseJSON_(r.borradoresJson) || {},
    cerradoEn: r.cerradoEn || null, cerradoMotivo: r.cerradoMotivo || null,
  }));
}

function apiSaveCiclosBulk(ciclos) {
  const rows = ciclos.map(c => ({
    uuid: c.uuid, equipoUuid: c.equipoUuid,
    abierto: c.abierto !== false, cancelado: !!c.cancelado,
    eslabonActual: c.eslabonActual || '', ruta: c.ruta || '',
    enGarantia: !!c.enGarantia,
    aperturaJson:    JSON.stringify(c.apertura    || null),
    diagnosticoJson: JSON.stringify(c.diagnostico || null),
    compraJson:      JSON.stringify(c.compra      || null),
    garantiaJson:    JSON.stringify(c.garantia    || null),
    envioJson:       JSON.stringify(c.envio       || null),
    recepcionJson:   JSON.stringify(c.recepcion   || null),
    reparacionJson:  JSON.stringify(c.reparacion  || null),
    borradoresJson:  JSON.stringify(c.borradores  || {}),
    cerradoEn: c.cerradoEn || '', cerradoMotivo: c.cerradoMotivo || '',
  }));
  const n = writeSheetBulk_('Ciclos', rows);
  return { ok: true, count: n };
}

function apiGetWebappUrl() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

function apiLog(level, mensaje, stack) {
  appendSheet_('Logs_Errores', {
    ts: new Date().toISOString(),
    usuario: getActiveUserEmail_(),
    funcion: level || 'info',
    mensaje: String(mensaje || '').slice(0, 5000),
    stack: String(stack || '').slice(0, 5000),
  });
  return { ok: true };
}

// ============================================================
// HELPERS GLOBALES
// ============================================================
function safeParseJSON_(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}
