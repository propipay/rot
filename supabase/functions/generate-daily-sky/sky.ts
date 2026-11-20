// Astronomía real y determinista (sin costo) con astronomy-engine.
import * as A from 'npm:astronomy-engine@2.1.19'

const SIGNS = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo', 'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis']
const TZ = 'America/Caracas'

const sign = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)]
const fmtTime = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }).format(d)
const fmtDate = (d: Date) => new Intl.DateTimeFormat('es-VE', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d)
const daysUntil = (from: Date, to: Date) => Math.ceil((to.getTime() - from.getTime()) / 86_400_000)

function phaseName(angle: number): string {
  if (angle < 6 || angle >= 354) return 'Luna nueva'
  if (angle < 84) return 'Luna creciente'
  if (angle < 96) return 'Cuarto creciente'
  if (angle < 174) return 'Gibosa creciente'
  if (angle < 186) return 'Luna llena'
  if (angle < 264) return 'Gibosa menguante'
  if (angle < 276) return 'Cuarto menguante'
  return 'Luna menguante'
}

export type Astronomy = {
  date: string
  place?: string // para dónde se calculó amanecer y atardecer
  moon: { phase: string; angle: number; illumination_pct: number; waxing: boolean; sign: string; next_full: string; days_to_full: number; next_new: string; days_to_new: number }
  sun: { sign: string; sunrise: string | null; sunset: string | null }
  upcoming: { date: string; title: string; detail: string }[]
}

export function computeSky(now: Date, lat: number, lng: number, curated: { event_date: string; title: string; description: string }[] = []): Astronomy {
  const t = A.MakeTime(now)
  const angle = A.MoonPhase(t)
  const illum = A.Illumination(A.Body.Moon, t).phase_fraction
  const nextFull = A.SearchMoonPhase(180, t, 40)!.date
  const nextNew = A.SearchMoonPhase(0, t, 40)!.date
  const obs = new A.Observer(lat, lng, 0)
  // Medianoche de hoy en Caracas (UTC−4)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
  const midnight = A.MakeTime(new Date(`${ymd}T00:00:00-04:00`))
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, midnight, 1)
  const set = A.SearchRiseSet(A.Body.Sun, obs, -1, midnight, 1)

  const upcoming: Astronomy['upcoming'] = []
  const horizon = now.getTime() + 120 * 86_400_000
  for (const y of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
    const s = A.Seasons(y)
    upcoming.push(
      { date: s.mar_equinox.date.toISOString(), title: 'Equinoccio de marzo', detail: 'Día y noche casi iguales.' },
      { date: s.jun_solstice.date.toISOString(), title: 'Solsticio de junio', detail: 'El día más largo del año en el hemisferio norte.' },
      { date: s.sep_equinox.date.toISOString(), title: 'Equinoccio de septiembre', detail: 'Día y noche casi iguales.' },
      { date: s.dec_solstice.date.toISOString(), title: 'Solsticio de diciembre', detail: 'El día más corto del año en el hemisferio norte.' },
    )
  }
  const lunar = A.SearchLunarEclipse(t)
  upcoming.push({ date: lunar.peak.date.toISOString(), title: `Eclipse lunar ${({ penumbral: 'penumbral', partial: 'parcial', total: 'total' } as Record<string, string>)[lunar.kind] ?? ''}`.trim(), detail: 'La Luna atraviesa la sombra de la Tierra.' })
  const solar = A.SearchGlobalSolarEclipse(t)
  upcoming.push({ date: solar.peak.date.toISOString(), title: `Eclipse solar ${({ partial: 'parcial', annular: 'anular', total: 'total', hybrid: 'híbrido' } as Record<string, string>)[solar.kind] ?? ''}`.trim(), detail: 'Visible solo desde ciertas regiones del planeta.' })
  for (const e of curated) upcoming.push({ date: new Date(`${e.event_date}T12:00:00-04:00`).toISOString(), title: e.title, detail: e.description })

  const soon = upcoming
    .filter((e) => { const ms = new Date(e.date).getTime(); return ms >= now.getTime() - 86_400_000 && ms <= horizon })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
    .map((e) => ({ ...e, date: fmtDate(new Date(e.date)) }))

  return {
    date: ymd,
    moon: {
      phase: phaseName(angle), angle: Math.round(angle), illumination_pct: Math.round(illum * 100), waxing: angle < 180,
      sign: sign(A.EclipticGeoMoon(t).lon),
      next_full: fmtDate(nextFull), days_to_full: daysUntil(now, nextFull),
      next_new: fmtDate(nextNew), days_to_new: daysUntil(now, nextNew),
    },
    sun: { sign: sign(A.SunPosition(t).elon), sunrise: rise ? fmtTime(rise.date) : null, sunset: set ? fmtTime(set.date) : null },
    upcoming: soon,
  }
}
