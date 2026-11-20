import { blocksFor } from '../lib/schedule'
import { hm, nowInCaracas } from '../lib/time'
import type { DailyLog, Profile } from '../lib/store'
import { sleepHours } from '../lib/store'
import type { Sub } from './Bienestar'
import { mealSummary, type Meal } from '../lib/nutrition'
import { streakParts, type HabitsState } from '../lib/habits'
import { ChevronRight } from 'lucide-react'
import type { SkyInsight } from '../lib/sky'
import { Luna } from '../components/Luna'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = { log: DailyLog; profile: Profile; meals: Meal[]; habits: HabitsState; sky: SkyInsight | null | undefined; onSave: (l: DailyLog) => void; onOpen: (s: Sub) => void; onHabits: () => void; onCielo: () => void }

export function Hoy({ log, profile, meals, habits, sky, onSave, onOpen, onHabits, onCielo }: Props) {
  const { minutes, weekday } = nowInCaracas()
  const blocks = blocksFor(weekday)
  const current = blocks.find((b) => minutes >= hm(b.start) && minutes < hm(b.end))
  const next = blocks.find((b) => hm(b.start) > minutes)
  const focus = current ?? next
  const sleep = sleepHours(log.sleep_start, log.sleep_end)
  const food = mealSummary(meals)
  const quit = habits.habits.find((h) => h.type === 'quit_streak')
  const streak = quit?.started_at ? streakParts(quit.started_at) : null

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
          <Stat label="Nutrición" value={`${food.main}/3`} pct={food.main / 3} onClick={() => onOpen('nutricion')} />
          {quit && <Stat label={quit.name} value={streak ? `${streak.days} d ${streak.hours} h` : 'Configurar'} pct={streak ? streak.progress : 0} onClick={onHabits} />}
        </div>

        {sky !== null && <CieloMini sky={sky} onClick={onCielo} />}

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

function CieloMini({ sky, onClick }: { sky: SkyInsight | undefined; onClick: () => void }) {
  const moon = sky?.astronomy_json.moon
  return (
    <button className="card cielo-mini" onClick={onClick}>
      {moon ? <Luna angle={moon.angle} size={48} /> : <span className="luna-vacia" aria-hidden />}
      <span className="cielo-mini-texto">
        <span className="label">Cielo de hoy{moon ? ` · ${moon.phase} ${moon.illumination_pct}%` : ''}</span>
        <strong className="serif">{sky ? sky.horoscope_json.headline : 'Leyendo el cielo…'}</strong>
        <span className="enlace">Ver cielo completo <ChevronRight size={16} strokeWidth={1.75} aria-hidden /></span>
      </span>
    </button>
  )
}
