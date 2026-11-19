import type { DailyLog, Profile } from '../lib/store'

export function Agua({ log, profile, onSave }: { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }) {
  const pct = Math.min(1, log.water_ml / profile.water_goal_ml)
  const add = (ml: number) => onSave({ ...log, water_ml: Math.max(0, log.water_ml + ml) })
  return (
    <section>
      <h1>Agua</h1>
      <p className="muted">Meta: {(profile.water_goal_ml / 1000).toFixed(1)} L al día</p>
      <div className="glass" aria-label={`${Math.round(pct * 100)}% de la meta`}>
        <div className="fill" style={{ height: `${pct * 100}%` }} />
        <span>{(log.water_ml / 1000).toFixed(2)} L</span>
      </div>
      <div className="row">
        <button onClick={() => add(250)}>+250 ml</button>
        <button onClick={() => add(500)}>+500 ml</button>
        <button className="ghost" onClick={() => add(-250)}>−250</button>
      </div>
      <p className="muted small">Momentos clave: al despertar, 10:30 AM, almuerzo y 3:30 PM.</p>
    </section>
  )
}
