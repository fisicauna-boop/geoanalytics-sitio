/**
 * Registro de consultas y cotizaciones del sitio Geoanalytics en Google Sheets.
 * Pegar en Extensiones → Apps Script de la planilla e implementar como
 * Aplicación web (Ejecutar como: yo · Acceso: cualquier usuario).
 * Solo agrega filas: no permite leer la planilla desde internet.
 */
const HOJA = "Consultas";
const MAX_CAMPO = 5000; // recorta textos muy largos

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const datos = Object.assign({}, (e && e.parameter) || {});
    if (datos.botcheck) return respuesta({ ok: true }); // trampa antispam
    delete datos.botcheck;
    delete datos.access_key;

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);

    // Encabezados dinámicos: se agregan columnas nuevas si llegan campos nuevos
    let encabezados = hoja.getLastColumn() ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0] : [];
    if (!encabezados.length) encabezados = ["fecha"];
    Object.keys(datos).forEach(function (k) { if (encabezados.indexOf(k) === -1) encabezados.push(k); });
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
    hoja.setFrozenRows(1);

    const fila = encabezados.map(function (k) {
      if (k === "fecha") return new Date();
      const v = datos[k] == null ? "" : String(datos[k]).slice(0, MAX_CAMPO);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // evita fórmulas inyectadas
    });
    hoja.appendRow(fila);
    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
