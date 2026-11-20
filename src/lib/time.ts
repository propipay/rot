export const TZ = 'America/Caracas'

/** Fecha YYYY-MM-DD en hora de Caracas */
export function todayKey(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

/** Minutos desde medianoche y día de la semana (0=dom) en hora de Caracas */
export function nowInCaracas(d = new Date()): { minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const h = Number(get('hour')) % 24
  const m = Number(get('minute'))
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { minutes: h * 60 + m, weekday: wd }
}

export const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

/** Hora corta en Caracas, ej. "07:12 AM" */
export function clockCaracas(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/ /g, ' ')
}

/** Minutos desde medianoche en Caracas para una fecha ISO */
export function minutesCaracas(iso: string): number {
  return nowInCaracas(new Date(iso)).minutes
}
