import { supabase } from './supabase'

export type WaterEvent = { at: string; ml: number; cp?: string } // at = ISO

export type DailyLog = {
  day: string
  water_ml: number
  water_events: WaterEvent[]
  exercise_min: number
  sleep_start: string | null // HH:MM
  sleep_end: string | null // HH:MM
  gratitude: string
}

export type Profile = { display_name: string; water_goal_ml: number; exercise_goal_min: number; sleep_goal_h: number }

export const DEFAULT_PROFILE: Profile = { display_name: 'Andrés', water_goal_ml: 3000, exercise_goal_min: 30, sleep_goal_h: 7.5 }

export const emptyLog = (day: string): DailyLog => ({ day, water_ml: 0, water_events: [], exercise_min: 0, sleep_start: null, sleep_end: null, gratitude: '' })

// ---------- Caché local (el teléfono es la fuente inmediata; Supabase la copia segura) ----------
const LS = 'rot:'
const lsGet = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(LS + k); return v ? (JSON.parse(v) as T) : null } catch { return null }
}
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(LS + k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

// Cola de pendientes: lo que se guardó sin conexión y falta subir
type Pending = { logs: string[]; profile: boolean }
const getPending = (): Pending => lsGet<Pending>('pending') ?? { logs: [], profile: false }
const setPending = (p: Pending) => lsSet('pending', p)
const markLog = (day: string, pending: boolean) => {
  const p = getPending()
  p.logs = pending ? [...new Set([...p.logs, day])] : p.logs.filter((d) => d !== day)
  setPending(p)
}
const markProfile = (pending: boolean) => setPending({ ...getPending(), profile: pending })
export const hasPending = () => { const p = getPending(); return p.logs.length > 0 || p.profile }

async function userId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession() // local, funciona sin conexión
  return data.session?.user.id ?? null
}

function readLocal(day: string): DailyLog {
  const stored = lsGet<DailyLog>('log:' + day)
  const local: DailyLog = { ...emptyLog(day), ...(stored ?? {}) }
  // Datos de la primera versión: convierte el total en una toma para no perderlo
  if (stored && !stored.water_events && stored.water_ml > 0) local.water_events = [{ at: `${day}T16:00:00.000Z`, ml: stored.water_ml }]
  return local
}

const COLS = 'day,water_ml,water_events,exercise_min,sleep_start,sleep_end,gratitude'

export async function loadLog(day: string): Promise<DailyLog> {
  const local = readLocal(day)
  const uid = await userId()
  if (!uid) return local
  if (getPending().logs.includes(day)) { await pushLog(local); return local } // lo local es más nuevo
  try {
    const { data, error } = await supabase!.from('daily_logs').select(COLS).eq('day', day).maybeSingle()
    if (error) throw error
    if (!data) { if (hasData(local)) await pushLog(local); return local }
    const remote: DailyLog = {
      ...emptyLog(day), ...data,
      water_events: Array.isArray(data.water_events) ? data.water_events : [],
      sleep_start: data.sleep_start?.slice(0, 5) ?? null,
      sleep_end: data.sleep_end?.slice(0, 5) ?? null,
    }
    lsSet('log:' + day, remote)
    return remote
  } catch {
    return local // sin conexión: seguimos con lo del teléfono
  }
}

const hasData = (l: DailyLog) => l.water_events.length > 0 || l.exercise_min > 0 || !!l.sleep_start || !!l.gratitude

async function pushLog(log: DailyLog): Promise<boolean> {
  const uid = await userId()
  if (!uid) return false
  try {
    const { day, water_ml, water_events, exercise_min, sleep_start, sleep_end, gratitude } = log
    const { error } = await supabase!.from('daily_logs').upsert(
      { day, water_ml, water_events, exercise_min, sleep_start, sleep_end, gratitude, user_id: uid, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day' },
    )
    if (error) throw error
    markLog(day, false)
    return true
  } catch {
    markLog(log.day, true)
    return false
  }
}

export async function saveLog(log: DailyLog): Promise<boolean> {
  lsSet('log:' + log.day, log) // primero en el teléfono
  markLog(log.day, true)
  return pushLog(log)
}

export async function loadProfile(): Promise<Profile> {
  const local = lsGet<Profile>('profile') ?? DEFAULT_PROFILE
  const uid = await userId()
  if (!uid) return local
  if (getPending().profile) { await pushProfile(local); return local }
  try {
    const { data, error } = await supabase!.from('profiles').select('display_name,water_goal_ml,exercise_goal_min,sleep_goal_h').eq('id', uid).maybeSingle()
    if (error) throw error
    if (!data) { await pushProfile(local); return local }
    const p = { ...DEFAULT_PROFILE, ...data, sleep_goal_h: Number(data.sleep_goal_h) }
    lsSet('profile', p)
    return p
  } catch {
    return local
  }
}

async function pushProfile(p: Profile): Promise<boolean> {
  const uid = await userId()
  if (!uid) return false
  try {
    const { error } = await supabase!.from('profiles').upsert({ id: uid, ...p, updated_at: new Date().toISOString() })
    if (error) throw error
    markProfile(false)
    return true
  } catch {
    markProfile(true)
    return false
  }
}

export async function saveProfile(p: Profile): Promise<boolean> {
  lsSet('profile', p)
  markProfile(true)
  return pushProfile(p)
}

/** Sube todo lo pendiente (al volver la conexión o al abrir la app) */
export async function flushPending(): Promise<void> {
  const p = getPending()
  for (const day of p.logs) await pushLog(readLocal(day))
  if (p.profile) await pushProfile(lsGet<Profile>('profile') ?? DEFAULT_PROFILE)
}

/** Borra la caché local al cerrar sesión */
export function clearLocal() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(LS)).forEach((k) => localStorage.removeItem(k)) } catch { /* nada */ }
}

export function sleepHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

export const sumWater = (ev: WaterEvent[]) => Math.max(0, ev.reduce((a, e) => a + e.ml, 0))

export function withWater(log: DailyLog, ml: number, cp?: string): DailyLog {
  const water_events = [...log.water_events, { at: new Date().toISOString(), ml, ...(cp ? { cp } : {}) }]
  return { ...log, water_events, water_ml: sumWater(water_events) }
}

export function withoutWater(log: DailyLog, at: string): DailyLog {
  const water_events = log.water_events.filter((e) => e.at !== at)
  return { ...log, water_events, water_ml: sumWater(water_events) }
}
