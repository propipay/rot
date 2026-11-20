import { ChevronDown, RefreshCw, Sparkles, Sunrise, Sunset } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Luna } from '../components/Luna'
import { loadAstro, loadSky, type AstroProfile, type SkyInsight } from '../lib/sky'
import { supabase } from '../lib/supabase'
import { TZ } from '../lib/time'

const longDate = () => new Intl.DateTimeFormat('es-VE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
const inDays = (n: number) => (n <= 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`)

type Props = { sky: SkyInsight | null | undefined; onSky: (s: SkyInsight | null) => void }

export function Cielo({ sky, onSky }: Props) {
  const [astro, setAstro] = useState<AstroProfile | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { loadAstro().then(setAstro) }, [])

  const refresh = () => {
    setBusy(true); setErr('')
    loadSky(true).then(onSky).catch(() => setErr('No pude actualizar ahora. Revisa tu conexión e inténtalo de nuevo.')).finally(() => setBusy(false))
  }

  return (
    <section className="cielo">
      <header className="cielo-cabecera">
        <h1 className="serif">Cielo</h1>
        <p className="muted primera-mayuscula">{longDate()} · hora de Venezuela</p>
      </header>

      {sky === undefined && <div className="card cargando-cielo" aria-busy="true"><p className="muted">Leyendo el cielo de hoy…</p></div>}

      {sky === null && (
        <div className="card">
          {supabase ? (
            <>
              <h2 className="serif">No pude cargar el cielo</h2>
              <p className="muted">Puede ser la conexión. Tu lectura se guarda en el teléfono en cuanto se descarga.</p>
              <button onClick={refresh} disabled={busy}>{busy ? 'Intentando…' : 'Intentar de nuevo'}</button>
            </>
          ) : (
            <>
              <h2 className="serif">Disponible al iniciar sesión</h2>
              <p className="muted">El Cielo usa tu carta natal guardada de forma privada en tu cuenta.</p>
            </>
          )}
        </div>
      )}

      {sky && <CieloHoy sky={sky} busy={busy} err={err} onRefresh={refresh} />}

      {sky && (
        <div className="cielo-col">
          <Proximos sky={sky} />
          <details className="card acordeon">
            <summary>
              <span><span className="label">Tu mapa personal</span><strong className="serif">Carta natal y Revolución Solar</strong></span>
              <ChevronDown size={20} strokeWidth={1.75} aria-hidden className="flecha" />
            </summary>
            {astro === undefined ? <p className="muted">Cargando…</p> : astro ? <Carta p={astro} /> : <p className="muted">Tu carta natal todavía no está cargada en tu cuenta. En cuanto esté, tu lectura diaria se vuelve personal.</p>}
          </details>
        </div>
      )}
    </section>
  )
}

function CieloHoy({ sky, busy, err, onRefresh }: { sky: SkyInsight; busy: boolean; err: string; onRefresh: () => void }) {
  const { moon, sun } = sky.astronomy_json
  const h = sky.horoscope_json
  return (
    <div className="cielo-col">
      <div className="card noche">
        <Luna angle={moon.angle} size={112} label={`${moon.phase}, ${moon.illumination_pct}% iluminada`} />
        <div className="noche-texto">
          <span className="label">Luna de hoy</span>
          <h2 className="serif">{moon.phase}</h2>
          <p className="num">{moon.illumination_pct}% iluminada · en {moon.sign}</p>
          <p className="num">
            {moon.waxing
              ? <>Luna llena {inDays(moon.days_to_full)} · {moon.next_full}</>
              : <>Luna nueva {inDays(moon.days_to_new)} · {moon.next_new}</>}
          </p>
        </div>
        <ul className="sol">
          <li><Sunrise size={18} strokeWidth={1.75} aria-hidden /><span><small>Amanecer</small><strong className="num">{sun.sunrise ?? '—'}</strong></span></li>
          <li><Sunset size={18} strokeWidth={1.75} aria-hidden /><span><small>Atardecer</small><strong className="num">{sun.sunset ?? '—'}</strong></span></li>
          <li><Sparkles size={18} strokeWidth={1.75} aria-hidden /><span><small>Sol en</small><strong>{sun.sign}</strong></span></li>
        </ul>
      </div>

      <div className="card lectura">
        <span className="label">Tu lectura de hoy</span>
        <h2 className="serif">{h.headline}</h2>
        <p>{h.personal_horoscope}</p>
        <ul className="pildoras">
          {h.focus_pills.map((f) => (
            <li key={f.area}><span className="label">{f.area}</span><span>{f.tip}</span></li>
          ))}
        </ul>
        <p className="evento"><Sparkles size={16} strokeWidth={1.75} aria-hidden /> {h.sky_event}</p>
        <div className="lectura-pie">
          <small className="muted">{h.source === 'gemini' ? 'Conectada con tu carta natal y tu Revolución Solar.' : 'Lectura básica del cielo. Se vuelve personal cuando tu carta natal esté conectada.'}</small>
          <button className={`icono${busy ? ' girando' : ''}`} onClick={onRefresh} disabled={busy} aria-label="Actualizar lectura" title="Actualizar lectura">
            <RefreshCw size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {err && <p className="aviso" role="status">{err}</p>}
      </div>
    </div>
  )
}

function Proximos({ sky }: { sky: SkyInsight }) {
  const list = sky.astronomy_json.upcoming
  return (
    <div className="card">
      <span className="label">Próximas eventualidades astronómicas</span>
      {list.length === 0 && <p className="muted">Nada destacado en los próximos meses.</p>}
      <ul className="eventos">
        {list.map((e) => (
          <li key={e.date + e.title}>
            <span className="num evento-fecha">{e.date}</span>
            <strong>{e.title}</strong>
            <small className="muted">{e.detail}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = (x: any): string | null => (typeof x === 'string' ? x : x?.sign ? `${x.sign}${x.house ? ` · Casa ${x.house}` : ''}` : null)

function Carta({ p }: { p: AstroProfile }) {
  const n = p.natal_chart ?? {}
  // La revolución solar más reciente (ej. solar_return_2026_2027)
  const rsKey = Object.keys(p).filter((k) => k.startsWith('solar_return')).sort().pop()
  const rs = rsKey ? p[rsKey] ?? {} : null
  const years = rsKey?.match(/(\d{4})_(\d{4})/)
  const natal = [['Sol', place(n.sun)], ['Ascendente', place(n.ascendant)], ['Medio Cielo', place(n.midheaven)], ['Mercurio', place(n.mercury)], ['Venus', place(n.venus)]].filter(([, v]) => v)
  const ret = rs ? [['Ascendente', place(rs.ascendant)], ['Medio Cielo', place(rs.midheaven)], ['Luna', place(rs.moon)], ['Casa 2', place(rs.house_2)]].filter(([, v]) => v) : []
  return (
    <div className="carta">
      <h3>Carta natal</h3>
      <dl className="posiciones">{natal.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {Array.isArray(n.core_themes) && <ul className="temas">{n.core_themes.map((t: string) => <li key={t}>{t}</li>)}</ul>}
      {rs && (
        <>
          <h3>Revolución Solar {years ? `${years[1]}–${years[2]}` : ''}</h3>
          {rs.year_focus && <p className="foco-anual serif">{rs.year_focus}</p>}
          <dl className="posiciones">{ret.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {Array.isArray(rs.house_7_stellium) && (
            <>
              <p className="label">Casa 7 · alianzas</p>
              <ul className="temas">{rs.house_7_stellium.map((t: string) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
        </>
      )}
      <p className="muted pequeno">Cuando llegue tu próxima Revolución Solar (enero 2027) se actualiza aquí.</p>
    </div>
  )
}
