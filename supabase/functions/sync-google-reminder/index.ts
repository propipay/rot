// sync-google-reminder: guarda un recordatorio del usuario y lo envía a su Google Calendar o Google Tasks.
// Modo por variable GOOGLE_SYNC_MODE:
//   apps_script_webhook (recomendado, $0): Web App de Apps Script en la cuenta de Google del usuario.
//       Secretos: GOOGLE_APPS_SCRIPT_URL, GOOGLE_APPS_SCRIPT_SECRET
//   oauth: Calendar API / Tasks API con refresh token.
//       Secretos: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const ORIGINS = ['https://rot.lealclub.com', 'https://leal-club-rot.rot-791.workers.dev']
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const ok = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  return {
    'Access-Control-Allow-Origin': ok ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

type Target = 'calendar' | 'tasks'
type Reminder = { id: string; title: string; due_at: string; target: Target; notes: string; google_external_id?: string | null }
type Adapter = {
  create(r: Reminder): Promise<string>
  remove(target: Target, externalId: string): Promise<void>
}

const env = (k: string) => Deno.env.get(k) ?? ''
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------- Adaptador 1: Apps Script (Web App en la cuenta de Google del usuario) ----------
const appsScript: Adapter = {
  async create(r) {
    const out = await callScript({ action: 'create', target: r.target, title: r.title, due_at: r.due_at, notes: r.notes, ref: r.id })
    return String(out.id)
  },
  async remove(target, externalId) {
    await callScript({ action: 'delete', target, id: externalId })
  },
}

async function callScript(payload: Record<string, unknown>) {
  const url = env('GOOGLE_APPS_SCRIPT_URL')
  const secret = env('GOOGLE_APPS_SCRIPT_SECRET')
  if (!url || !secret) throw new Error('Google aún no está conectado: falta configurar el puente de Apps Script')
  if (!url.startsWith('https://script.google.com/')) throw new Error('GOOGLE_APPS_SCRIPT_URL no es de script.google.com')
  // Apps Script no expone los headers de la petición, así que el secreto viaja también en el cuerpo
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8', 'X-ROT-SECRET': secret },
    body: JSON.stringify({ ...payload, secret }),
    redirect: 'follow',
  })
  const text = await res.text()
  let out: Record<string, unknown>
  try { out = JSON.parse(text) } catch { throw new Error(`Respuesta inesperada de Apps Script (HTTP ${res.status})`) }
  if (!out.ok) throw new Error(String(out.error ?? 'Apps Script rechazó el recordatorio'))
  return out
}

// ---------- Adaptador 2: OAuth (Calendar API / Tasks API) ----------
async function accessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), refresh_token: env('GOOGLE_REFRESH_TOKEN'), grant_type: 'refresh_token' }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(`Google OAuth: ${data.error ?? res.status}`)
  return data.access_token
}

const oauth: Adapter = {
  async create(r) {
    const token = await accessToken()
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (r.target === 'tasks') {
      // Google Tasks guarda solo la fecha: se usa la fecha de Caracas y la hora va en las notas
      const due = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date(r.due_at))}T00:00:00.000Z`
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', { method: 'POST', headers: auth, body: JSON.stringify({ title: r.title, notes: withHour(r), due }) })
      const t = await res.json()
      if (!res.ok) throw new Error(`Tasks API: ${t.error?.message ?? res.status}`)
      return t.id
    }
    const end = new Date(new Date(r.due_at).getTime() + 30 * 60_000).toISOString()
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        summary: r.title, description: r.notes || undefined,
        start: { dateTime: r.due_at, timeZone: 'America/Caracas' }, end: { dateTime: end, timeZone: 'America/Caracas' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
      }),
    })
    const ev = await res.json()
    if (!res.ok) throw new Error(`Calendar API: ${ev.error?.message ?? res.status}`)
    return ev.id
  },
  async remove(target, externalId) {
    const token = await accessToken()
    const url = target === 'tasks'
      ? `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(externalId)}`
      : `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Google: HTTP ${res.status}`)
  },
}

const withHour = (r: Reminder) => {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(r.due_at))
  return `${r.notes ? r.notes + '\n\n' : ''}Hora: ${h} (desde rot.lealclub.com)`
}

const adapter = (): Adapter => (env('GOOGLE_SYNC_MODE') === 'oauth' ? oauth : appsScript)

// ---------- Validación ----------
function parseReminder(b: Record<string, unknown>): Reminder {
  const id = String(b.id ?? '')
  const title = String(b.title ?? '').trim()
  const due = new Date(String(b.due_at ?? ''))
  const target = b.target === 'tasks' ? 'tasks' : 'calendar'
  const notes = String(b.notes ?? '').slice(0, 2000)
  if (!UUID.test(id)) throw new Error('id inválido')
  if (!title || title.length > 200) throw new Error('Título vacío o muy largo')
  if (Number.isNaN(due.getTime())) throw new Error('Fecha inválida')
  return { id, title, due_at: due.toISOString(), target, notes }
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  const authz = req.headers.get('Authorization')
  if (!authz) return json({ error: 'Sin sesión' }, 401)

  // Cliente con la sesión del usuario: RLS decide qué filas puede tocar
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authz } } })
  const { data: u, error: ue } = await sb.auth.getUser()
  if (ue || !u.user) return json({ error: 'Sesión inválida' }, 401)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const google = adapter()

  if (body.action === 'delete') {
    const id = String(body.id ?? '')
    if (!UUID.test(id)) return json({ error: 'id inválido' }, 400)
    const { data: row } = await sb.from('reminders').select('target,google_external_id').eq('id', id).maybeSingle()
    if (row?.google_external_id) {
      try { await google.remove(row.target, row.google_external_id) } catch (e) { return json({ error: (e as Error).message }, 502) }
    }
    const { error } = await sb.from('reminders').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  }

  let r: Reminder
  try { r = parseReminder(body) } catch (e) { return json({ error: (e as Error).message }, 400) }

  // 1) Guardar (o reutilizar) la fila. Si ya se envió a Google, no se duplica.
  const { data: existing } = await sb.from('reminders').select('*').eq('id', r.id).maybeSingle()
  if (existing?.sync_status === 'synced' && existing.google_external_id) return json(existing)
  const { error: se } = await sb.from('reminders').upsert({ ...r, user_id: u.user.id, sync_status: 'pending', sync_error: null, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (se) return json({ error: se.message }, 400)

  // 2) Enviar a Google y anotar el resultado
  let patch: Record<string, unknown>
  try {
    const externalId = await google.create(r)
    patch = { google_external_id: externalId, sync_status: 'synced', sync_error: null }
  } catch (e) {
    console.error('Sincronización con Google falló:', (e as Error).message)
    patch = { sync_status: 'error', sync_error: (e as Error).message.slice(0, 300) }
  }
  const { data: saved, error } = await sb.from('reminders').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', r.id).select('*').single()
  if (error) return json({ error: error.message }, 500)
  return json(saved)
})
