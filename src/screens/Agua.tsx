import { Check, Undo2 } from 'lucide-react'
import type { DailyLog, Profile } from '../lib/store'
import { withWater, withoutWater } from '../lib/store'
import { clockCaracas, minutesCaracas } from '../lib/time'
import { tap } from '../lib/haptics'

// Checkpoints del Plan Maestro (hora de Caracas)
const CHECKPOINTS = [
  { key: 'despertar', label: 'Al despertar', ml: 500, from: 5 * 60, to: 9 * 60 },
  { key: '1030', label: '10:30 AM', ml: 500, from: 9 * 60, to: 12 * 60 },
  { key: 'almuerzo', label: 'Almuerzo', ml: 500, from: 12 * 60, to: 14 * 60 },
  { key: '1530', label: '3:30 PM', ml: 250, from: 14 * 60, to: 17 * 60 },
]

export function Agua({ log, profile, onSave }: { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }) {
  const goal = profile.water_goal_ml
  const pct = Math.min(1, log.water_ml / goal)
  const left = Math.max(0, goal - log.water_ml)
  const marks = Array.from({ length: Math.floor(goal / 1000) }, (_, i) => (i + 1) * 1000)

  const add = (ml: number, cp?: string) => { tap(); onSave(withWater(log, ml, cp)) }
  const remove = (at: string) => { tap(); onSave(withoutWater(log, at)) }

  const done = (c: (typeof CHECKPOINTS)[number]) =>
    log.water_events.some((e) => e.cp === c.key || (!e.cp && e.ml > 0 && minutesCaracas(e.at) >= c.from && minutesCaracas(e.at) < c.to))

  const history = [...log.water_events].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <section className="agua">
      <div className="agua-top">
        <div className="vaso" role="img" aria-label={`${Math.round(pct * 100)}% de la meta de agua`}>
          <div className="liquido" style={{ height: `${pct * 100}%`, opacity: pct > 0 ? undefined : 0 }}>
            <svg className="ola" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden>
              <path d="M0 6 Q15 0 30 6 T60 6 T90 6 T120 6 V12 H0 Z" />
            </svg>
          </div>
          {marks.map((m) => (
            <span key={m} className="marca" style={{ bottom: `${(m / goal) * 100}%` }}>{(m / 1000).toFixed(1)} L</span>
          ))}
        </div>
        <div className="agua-lectura">
          <span className="label">Hoy</span>
          <strong className="num grande">{(log.water_ml / 1000).toFixed(2)} L</strong>
          <span className="num">{Math.round(pct * 100)}% de {(goal / 1000).toFixed(1)} L</span>
          <span className="muted num">{left > 0 ? `Faltan ${(left / 1000).toFixed(2)} L` : 'Meta cumplida, bien hecho'}</span>
        </div>
      </div>

      <div className="row botones">
        <button onClick={() => add(250)}>+250 ml</button>
        <button onClick={() => add(500)}>+500 ml</button>
        <button className="ghost" onClick={() => add(-250)} disabled={log.water_ml <= 0}>−250 ml</button>
      </div>

      <h3>Checkpoints del Plan Maestro</h3>
      <div className="chips">
        {CHECKPOINTS.map((c) => {
          const ok = done(c)
          return (
            <button key={c.key} className={`chip ${ok ? 'on' : ''}`} onClick={() => !ok && add(c.ml, c.key)} aria-pressed={ok}>
              {ok && <Check size={14} strokeWidth={2} aria-hidden />}
              {c.label} <span className="num">· {c.ml} ml</span>
            </button>
          )
        })}
      </div>

      <h3>Tomas de hoy</h3>
      {history.length === 0 ? (
        <p className="muted small">Aún no registras agua hoy. Empieza con 500 ml al despertar.</p>
      ) : (
        <ul className="historial">
          {history.map((e) => (
            <li key={e.at}>
              <span className="num">{clockCaracas(e.at)}</span>
              <span className="num">{e.ml > 0 ? '+' : '−'}{Math.abs(e.ml)} ml</span>
              <button className="icono" onClick={() => remove(e.at)} aria-label="Deshacer esta toma"><Undo2 size={18} strokeWidth={1.75} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
