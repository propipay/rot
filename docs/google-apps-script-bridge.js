/**
 * Puente rot.lealclub.com → Google Calendar / Google Tasks (modo apps_script_webhook)
 *
 * Instalación, una sola vez, con la cuenta de Google donde quieres los recordatorios:
 *  1. Abre https://script.google.com → "Nuevo proyecto" y nómbralo "ROT puente".
 *  2. Borra todo el contenido de Code.gs y pega este archivo completo. Guarda.
 *  3. Solo si usarás Google Tasks: en el panel izquierdo, "Servicios" (+) → "Google Tasks API" → Agregar.
 *  4. Arriba, elige la función `configurar` y pulsa "Ejecutar". Acepta los permisos de Google.
 *     En el "Registro de ejecución" aparece tu secreto. Cópialo.
 *  5. "Implementar" → "Nueva implementación" → tipo "Aplicación web":
 *       Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *     Copia la URL que termina en /exec.
 *  6. En Supabase → Edge Functions → Secrets crea:
 *       GOOGLE_SYNC_MODE          = apps_script_webhook
 *       GOOGLE_APPS_SCRIPT_URL    = la URL /exec del paso 5
 *       GOOGLE_APPS_SCRIPT_SECRET = el secreto del paso 4
 *
 * "Cualquier usuario" solo significa que Google no pide inicio de sesión para llamar a la URL;
 * sin el secreto, el script rechaza todo. Nunca pegues el secreto ni la URL en chats o documentos.
 * Si alguna vez quieres cambiar el secreto: ejecuta `nuevoSecreto` y actualízalo en Supabase.
 */

var TZ = 'America/Caracas'

function configurar() {
  var props = PropertiesService.getScriptProperties()
  var secret = props.getProperty('ROT_SECRET')
  if (!secret) {
    secret = generarSecreto_()
    props.setProperty('ROT_SECRET', secret)
  }
  CalendarApp.getDefaultCalendar() // pide el permiso de Calendar
  Logger.log('Tu secreto (guárdalo solo en Supabase como GOOGLE_APPS_SCRIPT_SECRET): ' + secret)
}

function nuevoSecreto() {
  var secret = generarSecreto_()
  PropertiesService.getScriptProperties().setProperty('ROT_SECRET', secret)
  Logger.log('Nuevo secreto: ' + secret)
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var expected = PropertiesService.getScriptProperties().getProperty('ROT_SECRET')
    // Apps Script no deja leer headers, por eso el secreto también llega en el cuerpo
    if (!expected || body.secret !== expected) return responder_({ ok: false, error: 'No autorizado' })
    if (body.action === 'create') return responder_({ ok: true, id: crear_(body) })
    if (body.action === 'delete') { borrar_(body); return responder_({ ok: true }) }
    return responder_({ ok: false, error: 'Acción desconocida' })
  } catch (err) {
    return responder_({ ok: false, error: String((err && err.message) || err) })
  }
}

function crear_(b) {
  var start = new Date(b.due_at)
  if (isNaN(start.getTime())) throw new Error('Fecha inválida')
  var title = String(b.title || '').slice(0, 200)
  var notes = String(b.notes || '')
  if (!title) throw new Error('Título vacío')

  if (b.target === 'tasks') {
    // Google Tasks guarda solo la fecha (no la hora): la hora va en las notas
    var hora = Utilities.formatDate(start, TZ, 'h:mm a')
    var task = Tasks.Tasks.insert({
      title: title,
      notes: (notes ? notes + '\n\n' : '') + 'Hora: ' + hora + ' (desde rot.lealclub.com)',
      due: Utilities.formatDate(start, TZ, 'yyyy-MM-dd') + 'T00:00:00.000Z',
    }, '@default')
    return task.id
  }

  var end = new Date(start.getTime() + 30 * 60 * 1000)
  var ev = CalendarApp.getDefaultCalendar().createEvent(title, start, end, { description: notes })
  ev.removeAllReminders()
  ev.addPopupReminder(10)
  return ev.getId()
}

function borrar_(b) {
  if (!b.id) return
  if (b.target === 'tasks') {
    try { Tasks.Tasks.remove('@default', b.id) } catch (err) { /* ya no existe */ }
    return
  }
  var ev = CalendarApp.getDefaultCalendar().getEventById(b.id)
  if (ev) ev.deleteEvent()
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function generarSecreto_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '')
}
