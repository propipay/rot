// generate-daily-sky: combina la astronomía real del día con la carta natal y la
// revolución solar del usuario, pide a Gemini una lectura breve y la guarda en caché diaria.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import { computeSky, type Astronomy } from './sky.ts'

// Solo la app propia puede llamar desde el navegador (además se exige sesión válida)
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

type Horoscope = { headline: string; personal_horoscope: string; focus_pills: { area: string; tip: string }[]; sky_event: string; source: 'gemini' | 'basico' }

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const auth = req.headers.get('Authorization')
  if (!auth) return json({ error: 'Sin sesión' }, 401)

  // Cliente con la sesión del usuario: RLS se aplica igual que en la app
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: u, error: ue } = await sb.auth.getUser()
  if (ue || !u.user) return json({ error: 'Sesión inválida' }, 401)

  const body = await req.json().catch(() => ({})) as { force?: boolean; lat?: unknown; lng?: unknown }
  const force = body.force === true
  // Ubicación del teléfono (opcional, ya redondeada a ~1 km); si no llega, la del perfil
  const phone = typeof body.lat === 'number' && typeof body.lng === 'number' && Math.abs(body.lat) <= 90 && Math.abs(body.lng) <= 180
    ? { lat: Math.round(body.lat * 100) / 100, lng: Math.round(body.lng * 100) / 100 } : null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date())

  const { data: prof } = await sb.from('astro_profile').select('profile_json').maybeSingle()
  const key = Deno.env.get('GEMINI_API_KEY')

  if (!force) {
    const { data: cached } = await sb.from('daily_sky_insights').select('*').eq('insight_date', today).maybeSingle()
    // Una lectura básica se rehace si ya hay carta natal y llave de Gemini
    const upgradable = cached?.horoscope_json?.source === 'basico' && key && prof
    if (cached && !upgradable) return json(cached)
  }

  const profile = (prof?.profile_json ?? {}) as Record<string, any>
  const loc = phone ?? profile.location_default ?? { lat: 10.4806, lng: -66.9036 } // Caracas por defecto
  const place = phone ? 'tu ubicación actual' : String(profile.location_default?.city ?? 'Caracas')

  const { data: curated } = await sb.from('astronomical_events').select('event_date,title,description').gte('event_date', today).order('event_date').limit(20)
  const sky: Astronomy = { ...computeSky(new Date(), loc.lat, loc.lng, curated ?? []), place }

  let horoscope: Horoscope = basic(sky)
  if (key && prof) {
    // A Gemini solo va la carta (sin fecha de nacimiento ni ubicación)
    const { birth_date: _b, location_default: _l, timezone: _t, ...chart } = profile
    try { horoscope = await gemini(key, chart, { ...sky, place: undefined }) } catch (e) { console.error('Gemini falló, uso lectura básica:', (e as Error).message) }
  }

  const row = { user_id: u.user.id, insight_date: today, astronomy_json: sky, horoscope_json: horoscope }
  const { data: saved, error } = await sb.from('daily_sky_insights').upsert(row, { onConflict: 'user_id,insight_date' }).select('*').single()
  if (error) return json({ error: error.message }, 500)
  return json(saved)
})

function basic(sky: Astronomy): Horoscope {
  const m = sky.moon
  return {
    headline: `${m.phase} en ${m.sign}: un día para avanzar con calma.`,
    personal_horoscope: `La Luna está en ${m.sign} con ${m.illumination_pct}% de luz y el Sol transita ${sky.sun.sign}. ${m.waxing ? 'La energía crece: buen momento para sembrar y empezar.' : 'La energía mengua: buen momento para cerrar, ordenar y soltar.'}`,
    focus_pills: [
      { area: 'Trabajo y Alianzas', tip: 'Elige una sola prioridad y termínala.' },
      { area: 'Bienestar', tip: 'Agua al despertar y una caminata corta.' },
      { area: 'Vínculos / Mente', tip: 'Escribe una línea de gratitud esta noche.' },
    ],
    sky_event: sky.upcoming[0] ? `${sky.upcoming[0].title}: ${sky.upcoming[0].date}` : `Próxima luna llena: ${m.next_full}`,
    source: 'basico',
  }
}

async function gemini(key: string, profile: Record<string, unknown>, sky: Astronomy): Promise<Horoscope> {
  const prompt = `Eres un astrólogo sereno y práctico. Escribe en español neutro, tono cálido, reflexivo y concreto; sin fatalismo, sin clichés, sin predicciones absolutas, sin consejos médicos ni financieros.
Conecta el cielo REAL de hoy con la carta natal y la revolución solar de la persona.

Cielo de hoy (datos astronómicos calculados, no inventes otros): ${JSON.stringify(sky)}
Perfil astrológico: ${JSON.stringify(profile)}

Devuelve SOLO JSON con:
- headline: 1 frase breve y serena (máx. 90 caracteres)
- personal_horoscope: 1 párrafo de 70 a 110 palabras
- focus_pills: exactamente 3 objetos {area, tip} con áreas "Trabajo y Alianzas", "Bienestar", "Vínculos / Mente"; tip de máx. 80 caracteres y accionable hoy
- sky_event: 1 frase sobre el dato astronómico destacado de hoy o el próximo evento de la lista`

  // Modelo configurable (GEMINI_MODEL); si Google responde 404 se prueba el siguiente.
  // Los proyectos nuevos ya no tienen acceso a gemini-2.5-*.
  const models = [...new Set([Deno.env.get('GEMINI_MODEL'), 'gemini-3.8-flash', 'gemini-3.5-flash-lite'].filter(Boolean) as string[])]
  let last = ''
  for (const model of models) {
    for (const withSchema of [true, false]) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: BODY(prompt, withSchema),
      })
      if (res.ok) {
        const data = await res.json()
        const out = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text)
        return { headline: String(out.headline), personal_horoscope: String(out.personal_horoscope), focus_pills: (out.focus_pills ?? []).slice(0, 3), sky_event: String(out.sky_event), source: 'gemini' }
      }
      last = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`
      console.error('Gemini respondió error:', last)
      if (res.status === 400 && withSchema) continue // reintenta sin esquema estricto
      break
    }
    if (!last.includes('HTTP 404')) break // solo 404 pasa al siguiente modelo
  }
  throw new Error(last)
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    personal_horoscope: { type: 'STRING' },
    focus_pills: { type: 'ARRAY', items: { type: 'OBJECT', properties: { area: { type: 'STRING' }, tip: { type: 'STRING' } }, required: ['area', 'tip'] } },
    sky_event: { type: 'STRING' },
  },
  required: ['headline', 'personal_horoscope', 'focus_pills', 'sky_event'],
}

const BODY = (prompt: string, withSchema: boolean) => JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.7, responseMimeType: 'application/json', ...(withSchema ? { responseSchema: SCHEMA } : {}) },
})
