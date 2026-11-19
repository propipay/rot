import { blocksFor } from '../lib/schedule'
import { hm, nowInCaracas } from '../lib/time'
import type { DailyLog, Profile } from '../lib/store'
import { sleepHours } from '../lib/store'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function Hoy({ log, profile, onSave }: { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }) {
  const { minutes, weekday } = nowInCaracas()
  const blocks = blocksFor(weekday)
  const current = blocks.find((b) => minutes >= hm(b.start) && minutes < hm(b.end))
  const next = blocks.find((b) => hm(b.start) > minutes)
  const sleep = sleepHours(log.sleep_start, log.sleep_end)

  return (
    <section>
      <h1>Hola, {profile.display_name}</h1>
      <p className="muted">Hoy es {DAYS[weekday]}. Un paso a la vez, con gratitud.</p>

      <div className="card now">
        <span className="label">{current ? 'Ahora' : next ? 'Lo siguiente' : 'Día libre'}</span>
        {current || next ? (
          <>
            <h2>{(current ?? next)!.title}</h2>
            <p className="muted">{(current ?? next)!.start}–{(current ?? next)!.end} · {(current ?? next)!.tag}</p>
            <p>{(current ?? next)!.focus}</p>
          </>
        ) : (
          <p>Sin bloques programados. Descansa, camina y disfruta.</p>
        )}
      </div>

      <div className="stats">
        <Stat label="Agua" value={`${(log.water_ml / 1000).toFixed(1)} L`} pct={log.water_ml / profile.water_goal_ml} />
        <Stat label="Ejercicio" value={`${log.exercise_min} min`} pct={log.exercise_min / profile.exercise_goal_min} />
        <Stat label="Sueño" value={sleep ? `${sleep} h` : '—'} pct={sleep ? sleep / profile.sleep_goal_h : 0} />
      </div>

      <h3>Agenda de hoy</h3>
      {blocks.length === 0 && <p className="muted">Fin de semana: sin bloques fijos.</p>}
      <ul className="agenda">
        {blocks.map((b) => (
          <li key={b.start + b.tag} className={b === current ? 'active' : minutes >= hm(b.end) ? 'done' : ''}>
            <span className="time">{b.start}</span>
            <span><strong>{b.title}</strong><br /><small>{b.tag}</small></span>
          </li>
        ))}
      </ul>

      <h3>Gratitud de hoy</h3>
      <textarea
        rows={3}
        placeholder="Hoy agradezco…"
        value={log.gratitude}
        onChange={(e) => onSave({ ...log, gratitude: e.target.value })}
      />
    </section>
  )
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  const p = Math.max(0, Math.min(1, pct))
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <strong>{value}</strong>
      <div className="bar"><div style={{ width: `${p * 100}%` }} /></div>
    </div>
  )
}
