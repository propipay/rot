import { supabase } from './supabase'
import { cache, uuid } from './sync'

export type Target = 'calendar' | 'tasks'
export type SyncStatus = 'pending' | 'synced' | 'error'
export type Reminder = {
  id: string
  title: string
  due_at: string // ISO
  target: Target
  notes: string
  google_external_id: string | null
  sync_status: SyncStatus
  sync_error: string | null
}

const KEY = 'reminders'
const COLS = 'id,title,due_at,target,notes,google_external_id,sync_status,sync_error'
const byDue = (l: Reminder[]) => [...l].sort((a, b) => a.due_at.localeCompare(b.due_at))
const store = (l: Reminder[]) => { const s = byDue(l); cache.set(KEY, s); return s }

export const cachedReminders = (): Reminder[] => cache.get<Reminder[]>(KEY) ?? []

const upsertLocal = (r: Reminder) => store([...cachedReminders().filter((x) => x.id !== r.id), r])

export function newReminder(input: Pick<Reminder, 'title' | 'due_at' | 'target' | 'notes'>): Reminder {
  return { id: uuid(), ...input, google_external_id: null, sync_status: 'pending', sync_error: null }
}

/** Próximos y de los últimos 7 días. Conserva lo creado sin conexión que aún no se ha subido. */
export async function loadReminders(): Promise<Reminder[]> {
  const local = cachedReminders()
  if (!supabase) return local
  try {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data, error } = await supabase.from('reminders').select(COLS).gte('due_at', since).order('due_at').limit(200)
    if (error) throw error
    const remote = (data ?? []) as Reminder[]
    const ids = new Set(remote.map((r) => r.id))
    const unsent = local.filter((r) => !ids.has(r.id) && r.sync_status === 'pending')
    return store([...remote, ...unsent])
  } catch {
    return local
  }
}

async function send(r: Reminder): Promise<Reminder> {
  const { data, error } = await supabase!.functions.invoke<Reminder>('sync-google-reminder', {
    body: { id: r.id, title: r.title, due_at: r.due_at, target: r.target, notes: r.notes },
  })
  if (error || !data) throw error ?? new Error('Sin respuesta')
  return data
}

/** Guarda en el teléfono y lo envía a Google. Sin conexión queda "Pendiente". */
export async function syncReminder(r: Reminder): Promise<Reminder[]> {
  upsertLocal({ ...r, sync_status: r.sync_status === 'synced' ? 'synced' : 'pending' })
  if (!supabase) return cachedReminders()
  try {
    return upsertLocal(await send(r))
  } catch {
    return cachedReminders()
  }
}

/** Reintenta lo que quedó pendiente por falta de conexión */
export async function retryPending(): Promise<Reminder[]> {
  for (const r of cachedReminders().filter((x) => x.sync_status === 'pending')) await syncReminder(r)
  return cachedReminders()
}

/** Borra en la app y también en Google */
export async function deleteReminder(id: string): Promise<Reminder[]> {
  if (supabase) {
    const { error } = await supabase.functions.invoke('sync-google-reminder', { body: { action: 'delete', id } })
    if (error) throw error
  }
  return store(cachedReminders().filter((x) => x.id !== id))
}
