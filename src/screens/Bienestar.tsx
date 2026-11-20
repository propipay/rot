import type { DailyLog, Profile } from '../lib/store'
import { Agua } from './Agua'
import { Ejercicio } from './Ejercicio'
import { Sueno } from './Sueno'
import { Nutricion } from './Nutricion'
import type { Meal } from '../lib/nutrition'

export type Sub = 'agua' | 'nutricion' | 'ejercicio' | 'sueno'
const SUBS: { id: Sub; label: string }[] = [
  { id: 'agua', label: 'Agua' },
  { id: 'nutricion', label: 'Nutrición' },
  { id: 'ejercicio', label: 'Ejercicio' },
  { id: 'sueno', label: 'Sueño' },
]

type Props = { sub: Sub; onSub: (s: Sub) => void; log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void; meals: Meal[]; onMeals: (m: Meal[]) => void }

export function Bienestar({ sub, onSub, log, profile, onSave, meals, onMeals }: Props) {
  return (
    <section>
      <h1 className="serif">Bienestar</h1>
      <div className="segmented" role="tablist">
        {SUBS.map((s) => (
          <button key={s.id} role="tab" aria-selected={sub === s.id} className={sub === s.id ? 'on' : ''} onClick={() => onSub(s.id)}>{s.label}</button>
        ))}
      </div>
      {sub === 'agua' && <Agua log={log} profile={profile} onSave={onSave} />}
      {sub === 'nutricion' && <Nutricion day={log.day} meals={meals} onChange={onMeals} />}
      {sub === 'ejercicio' && <Ejercicio log={log} profile={profile} onSave={onSave} />}
      {sub === 'sueno' && <Sueno log={log} profile={profile} onSave={onSave} />}
    </section>
  )
}
