import { supabase } from './supabase'
import { cache, enqueue, flushOutbox, outboxSize, uuid } from './sync'
import { todayKey } from './time'

export type HabitType = 'quit_streak' | 'daily_check'
export type Habit = {
  id: string; name: string; type: HabitType; started_at: string | null
  best_streak_days: number; active: boolean; icon: string | null; sort: number; created_at: string
}
export type HabitLog = { id: string; habit_id: string; logged_date: string; completed: boolean; event_type: 'check' | 'reset'; note: string; created_at: string }
export type HabitsState = { habits: Habit[]; logs: HabitLog[] }

export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365] // días (1 = 24 h)

const DEFAULTS: Array<Pick<Habit, 'name' | 'type' | 'icon'>> = [
  { name: 'Días sin fumar', type: 'quit_streak', icon: 'cigarette-off' },
  { name: 'Meditación 10 min', type: 'daily_check', icon: 'flower' },
  { name: 'Lectura', type: 'daily_check', icon: 'book' },
  { name: 'Caminata', type: 'daily_check', icon: 'footprints' },
  { name: 'Bloque creativo Road of Love', type: 'daily_check', icon: 'sparkles' },
]

const KEY = 'habits'

function sinceDate(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return todayKey(d)
}

export async function loadHabits(): Promise<HabitsState> {
  const local = cache.get<HabitsState>(KEY) ?? { habits: [], logs: [] }
  if (!supabase) return local.habits.length ? local : seed(local)
  await flushOutbox()
  if (outboxSize() > 0) return local
  try {
    const [h, l] = await Promise.all([
      supabase.from('habits').select('*').eq('active', true).order('sort'),
      supabase.from('habit_logs').select('id,habit_id,logged_date,completed,event_type,note,created_at').gte('logged_date', sinceDate(400)),
    ])
    if (h.error || l.error) throw h.error ?? l.error
    const state: HabitsState = { habits: h.data as Habit[], logs: l.data as HabitLog[] }
    if (state.habits.length === 0) return seed(state)
    cache.set(KEY, state)
    return state
  } catch { return local }
}

function seed(state: HabitsState): HabitsState {
  const now = new Date().toISOString()
  const habits = DEFAULTS.map((d, i): Habit => ({ id: uuid(), ...d, started_at: null, best_streak_days: 0, active: true, sort: i, created_at: now }))
  habits.forEach((h) => enqueue({ kind: 'upsert', table: 'habits', row: { ...h } }))
  const next = { ...state, habits }
  cache.set(KEY, next)
  return next
}

function commit(state: HabitsState): HabitsState { cache.set(KEY, state); return state }

export function addHabit(state: HabitsState, name: string, type: HabitType): HabitsState {
  const h: Habit = { id: uuid(), name: name.trim(), type, started_at: type === 'quit_streak' ? new Date().toISOString() : null, best_streak_days: 0, active: true, icon: null, sort: state.habits.length, created_at: new Date().toISOString() }
  enqueue({ kind: 'upsert', table: 'habits', row: { ...h } })
  return commit({ ...state, habits: [...state.habits, h] })
}

export function updateHabit(state: HabitsState, h: Habit): HabitsState {
  enqueue({ kind: 'upsert', table: 'habits', row: { ...h } })
  return commit({ ...state, habits: state.habits.map((x) => (x.id === h.id ? h : x)) })
}

export function archiveHabit(state: HabitsState, h: Habit): HabitsState {
  enqueue({ kind: 'upsert', table: 'habits', row: { ...h, active: false } })
  return commit({ ...state, habits: state.habits.filter((x) => x.id !== h.id) })
}

export function toggleCheck(state: HabitsState, habitId: string, day = todayKey()): HabitsState {
  const existing = state.logs.find((l) => l.habit_id === habitId && l.logged_date === day && l.event_type === 'check')
  if (existing) {
    enqueue({ kind: 'delete', table: 'habit_logs', id: existing.id })
    return commit({ ...state, logs: state.logs.filter((l) => l.id !== existing.id) })
  }
  const log: HabitLog = { id: uuid(), habit_id: habitId, logged_date: day, completed: true, event_type: 'check', note: '', created_at: new Date().toISOString() }
  enqueue({ kind: 'upsert', table: 'habit_logs', row: { ...log } })
  return commit({ ...state, logs: [...state.logs, log] })
}

/** Tropiezo: guarda la racha en el historial con una nota y reinicia el contador */
export function resetStreak(state: HabitsState, h: Habit, note: string): HabitsState {
  const days = Math.floor(elapsedMs(h.started_at) / 86_400_000)
  const updated: Habit = { ...h, best_streak_days: Math.max(h.best_streak_days, days), started_at: new Date().toISOString() }
  const log: HabitLog = { id: uuid(), habit_id: h.id, logged_date: todayKey(), completed: false, event_type: 'reset', note: note.trim(), created_at: new Date().toISOString() }
  enqueue({ kind: 'upsert', table: 'habit_logs', row: { ...log } })
  enqueue({ kind: 'upsert', table: 'habits', row: { ...updated } })
  return commit({ habits: state.habits.map((x) => (x.id === h.id ? updated : x)), logs: [...state.logs, log] })
}

export const elapsedMs = (startedAt: string | null) => (startedAt ? Math.max(0, Date.now() - new Date(startedAt).getTime()) : 0)

export function streakParts(startedAt: string | null) {
  const ms = elapsedMs(startedAt)
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const next = MILESTONES.find((m) => m > ms / 86_400_000) ?? null
  const prev = [...MILESTONES].reverse().find((m) => m <= ms / 86_400_000) ?? 0
  const progress = next ? (ms / 86_400_000 - prev) / (next - prev) : 1
  return { days, hours, next, prev, progress }
}

export function milestoneLabel(d: number) { return d === 1 ? '24 h' : d >= 365 ? '1 año' : `${d} días` }

export function encouragement(days: number) {
  if (days < 1) return 'Cada hora cuenta. Respira profundo y toma agua.'
  if (days < 3) return 'Lo más difícil está pasando. Tu cuerpo ya empezó a limpiarse.'
  if (days < 7) return 'Vas muy bien. Los antojos se hacen más cortos cada día.'
  if (days < 30) return 'Una semana o más: tu respiración y tu energía lo notan.'
  if (days < 90) return 'Ya es un hábito nuevo. Celebra este camino con gratitud.'
  return 'Eres prueba viva de que el cambio es posible.'
}

/** Racha de días seguidos con check, contando hasta hoy (o ayer si hoy aún no) */
export function dailyStreak(logs: HabitLog[], habitId: string): number {
  const days = new Set(logs.filter((l) => l.habit_id === habitId && l.event_type === 'check').map((l) => l.logged_date))
  const d = new Date()
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return todayKey(d) })
}

/** datetime-local (hora de Caracas, UTC−4 fijo) ↔ ISO */
export const caracasInputToIso = (v: string) => new Date(`${v}:00-04:00`).toISOString()
export function isoToCaracasInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() - 4 * 3_600_000)
  return d.toISOString().slice(0, 16)
}
