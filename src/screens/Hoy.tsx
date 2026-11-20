import { blocksFor } from '../lib/schedule'
import { hm, nowInCaracas } from '../lib/time'
import type { DailyLog, Profile } from '../lib/store'
import { sleepHours } from '../lib/store'
import type { Sub } from './Bienestar'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void; onOpen: (s: Sub) => void }

export function Hoy({ log, profile, onSave, onOpen }: Props) {
  const { minutes, weekday } = nowInCaracas()
  const blocks = blocksFor(weekday)
  const current = blocks.find((b) => minutes >= hm(b.start) && minutes < hm(b.end))
  const next = blocks.find((b) => hm(b.start) > minutes)
  const focus = current ?? next
  const sleep = sleepHours(log.sleep_start, log.sleep_end)

  return (
    <section className="hoy">
      <header className="hoy-saludo">
        <h1 className="serif">Hola, {profile.display_name}</h1>
        <p className="muted">Hoy es {DAYS[weekday]}. Un paso a la vez, con gratitud.</p>
      </header>

      <div className="hoy-col">
        <div className="card now">
          <span className="label">{current ? 'Ahora' : next ? 'Lo siguiente' : 'Día libre'}</span>
          {focus ? (
            <>
              <h2 className="serif">{focus.title}</h2>
              <p className="muted num">{focus.start}–{focus.end} · {focus.tag}</p>
              <p>{focus.focus}</p>
            </>
          ) : (
            <p>Sin más bloques por hoy. Descansa, camina y disfruta.</p>
          )}
        </div>

        <div className="stats">
          <Stat label="Agua" value={`${(log.water_ml / 1000).toFixed(1)} L`} pct={log.water_ml / profile.water_goal_ml} onClick={() => onOpen('agua')} />
          <Stat label="Ejercicio" value={`${log.exercise_min} min`} pct={log.exercise_min / profile.exercise_goal_min} onClick={() => onOpen('ejercicio')} />
          <Stat label="Sueño" value={sleep ? `${sleep} h` : '—'} pct={sleep ? sleep / profile.sleep_goal_h : 0} onClick={() => onOpen('sueno')} />
        </div>

        <h3>Gratitud de hoy</h3>
        <textarea rows={3} placeholder="Hoy agradezco…" value={log.gratitude} onChange={(e) => onSave({ ...log, gratitude: e.target.value })} />
      </div>

      <div className="hoy-col">
        <h3 className="sin-margen-arriba">Agenda de hoy</h3>
        {blocks.length === 0 && <p className="muted">Fin de semana: sin bloques fijos.</p>}
        <ul className="agenda">
          {blocks.map((b) => (
            <li key={b.start + b.tag} className={b === current ? 'active' : minutes >= hm(b.end) ? 'done' : ''}>
              <span className="time num">{b.start}</span>
              <span><strong>{b.title}</strong><br /><small>{b.tag}</small></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Stat({ label, value, pct, onClick }: { label: string; value: string; pct: number; onClick: () => void }) {
  const p = Math.max(0, Math.min(1, pct))
  return (
    <button className="stat" onClick={onClick}>
      <span className="label">{label}</span>
      <strong className="num">{value}</strong>
      <span className="bar"><span style={{ width: `${p * 100}%` }} /></span>
    </button>
  )
}
