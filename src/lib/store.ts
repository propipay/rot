import { supabase } from './supabase'

export type DailyLog = {
  day: string
  water_ml: number
  exercise_min: number
  sleep_start: string | null // HH:MM
  sleep_end: string | null // HH:MM
  gratitude: string
}

export type Profile = { display_name: string; water_goal_ml: number; exercise_goal_min: number; sleep_goal_h: number }

export const DEFAULT_PROFILE: Profile = { display_name: 'Andrés', water_goal_ml: 3000, exercise_goal_min: 30, sleep_goal_h: 7.5 }

export const emptyLog = (day: string): DailyLog => ({ day, water_ml: 0, exercise_min: 0, sleep_start: null, sleep_end: null, gratitude: '' })

const LS = 'rot:'
const lsGet = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(LS + k); return v ? (JSON.parse(v) as T) : null } catch { return null }
}
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(LS + k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export async function loadLog(day: string): Promise<DailyLog> {
  const local = lsGet<DailyLog>('log:' + day) ?? emptyLog(day)
  if (!supabase) return local
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return local
  const { data } = await supabase.from('daily_logs').select('day,water_ml,exercise_min,sleep_start,sleep_end,gratitude').eq('day', day).maybeSingle()
  const remote = data ? ({ ...emptyLog(day), ...data, sleep_start: data.sleep_start?.slice(0, 5) ?? null, sleep_end: data.sleep_end?.slice(0, 5) ?? null } as DailyLog) : local
  lsSet('log:' + day, remote)
  return remote
}

export async function saveLog(log: DailyLog): Promise<void> {
  lsSet('log:' + log.day, log) // primero en el teléfono, para que funcione sin conexión
  if (!supabase) return
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return
  await supabase.from('daily_logs').upsert({ ...log, user_id: u.user.id }, { onConflict: 'user_id,day' })
}

export async function loadProfile(): Promise<Profile> {
  const local = lsGet<Profile>('profile') ?? DEFAULT_PROFILE
  if (!supabase) return local
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return local
  const { data } = await supabase.from('profiles').select('display_name,water_goal_ml,exercise_goal_min,sleep_goal_h').eq('id', u.user.id).maybeSingle()
  return data ? { ...DEFAULT_PROFILE, ...data } : local
}

export async function saveProfile(p: Profile): Promise<void> {
  lsSet('profile', p)
  if (!supabase) return
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return
  await supabase.from('profiles').upsert({ id: u.user.id, ...p })
}

export function sleepHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}
