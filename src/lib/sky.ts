import { supabase } from './supabase'
import { cache } from './sync'
import { todayKey } from './time'

// Mismo formato que devuelve la función generate-daily-sky
export type Astronomy = {
  date: string
  moon: { phase: string; angle: number; illumination_pct: number; waxing: boolean; sign: string; next_full: string; days_to_full: number; next_new: string; days_to_new: number }
  sun: { sign: string; sunrise: string | null; sunset: string | null }
  upcoming: { date: string; title: string; detail: string }[]
}
export type Horoscope = { headline: string; personal_horoscope: string; focus_pills: { area: string; tip: string }[]; sky_event: string; source: 'gemini' | 'basico' }
export type SkyInsight = { insight_date: string; astronomy_json: Astronomy; horoscope_json: Horoscope }

// Perfil astral: estructura libre (carta natal + revolución solar), solo se lee para mostrar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AstroProfile = Record<string, any>

const RETRY_MS = 60 * 60 * 1000

/** Lo último guardado en el teléfono, si es de hoy */
export function cachedSky(): SkyInsight | null {
  const c = cache.get<SkyInsight>('sky')
  return c && c.insight_date === todayKey() ? c : null
}

// Una lectura básica (sin Gemini) se reintenta como máximo una vez por hora
function retryDue(): boolean {
  const last = cache.get<number>('sky:retry') ?? 0
  if (Date.now() - last < RETRY_MS) return false
  cache.set('sky:retry', Date.now())
  return true
}

async function generate(force: boolean): Promise<SkyInsight> {
  const { data, error } = await supabase!.functions.invoke<SkyInsight>('generate-daily-sky', { body: { force } })
  if (error || !data) throw error ?? new Error('Sin datos')
  return data
}

/**
 * Caché primero: teléfono → tabla daily_sky_insights → función (una sola vez al día).
 * `force` pide una lectura nueva (botón "Actualizar").
 */
export async function loadSky(force = false): Promise<SkyInsight | null> {
  const local = cachedSky()
  if (!supabase) return local
  try {
    let row: SkyInsight | null = force ? null : local
    if (!row && !force) {
      const { data, error } = await supabase.from('daily_sky_insights').select('insight_date,astronomy_json,horoscope_json').eq('insight_date', todayKey()).maybeSingle()
      if (error) throw error
      row = data as SkyInsight | null
    }
    if (!row) row = await generate(force)
    else if (row.horoscope_json?.source === 'basico' && retryDue()) row = await generate(false)
    cache.set('sky', row)
    return row
  } catch {
    if (force) throw new Error('No se pudo actualizar')
    return local
  }
}

export async function loadAstro(): Promise<AstroProfile | null> {
  const local = cache.get<AstroProfile>('astro')
  if (!supabase) return local
  try {
    const { data, error } = await supabase.from('astro_profile').select('profile_json').maybeSingle()
    if (error) throw error
    const p = (data?.profile_json as AstroProfile | undefined) ?? null
    if (p) cache.set('astro', p)
    return p
  } catch {
    return local
  }
}
