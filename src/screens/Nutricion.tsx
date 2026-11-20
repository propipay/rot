import { Check, MonitorOff } from 'lucide-react'
import { MEALS, TAGS, blankMeal, isLogged, mealSummary, saveMeal, type Energy, type Meal } from '../lib/nutrition'
import { tap } from '../lib/haptics'

const ENERGY: { id: Energy; label: string }[] = [
  { id: 'alta', label: 'Alta' },
  { id: 'estable', label: 'Estable' },
  { id: 'pesada', label: 'Pesada' },
]

export function Nutricion({ day, meals, onChange }: { day: string; meals: Meal[]; onChange: (m: Meal[]) => void }) {
  const summary = mealSummary(meals)
  const update = (meal: Meal, patch: Partial<Meal>) => {
    tap()
    onChange(saveMeal(meals, { ...meal, ...patch, logged_at: new Date().toISOString() }))
  }

  return (
    <section>
      <p className="muted num">{summary.text}</p>
      {MEALS.map(({ type, label }) => {
        const meal = meals.find((m) => m.meal_type === type) ?? blankMeal(day, type)
        const done = isLogged(meal)
        return (
          <div key={type} className={`card comida ${done ? 'hecha' : ''}`}>
            <div className="comida-head">
              <h2 className="serif">{label}</h2>
              {done && <span className="ok"><Check size={16} strokeWidth={2} aria-hidden /> Registrada</span>}
            </div>
            <div className="chips">
              <button className={`chip ${meal.screen_free ? 'on' : ''}`} aria-pressed={meal.screen_free} onClick={() => update(meal, { screen_free: !meal.screen_free })}>
                <MonitorOff size={14} strokeWidth={1.75} aria-hidden /> Sin pantallas
              </button>
              {TAGS.map((t) => {
                const on = meal.tags.includes(t)
                return (
                  <button key={t} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => update(meal, { tags: on ? meal.tags.filter((x) => x !== t) : [...meal.tags, t] })}>{t}</button>
                )
              })}
            </div>
            <div className="energia">
              <span className="label">Energía después</span>
              <div className="chips">
                {ENERGY.map((e) => (
                  <button key={e.id} className={`chip ${meal.energy_after === e.id ? 'on' : ''}`} aria-pressed={meal.energy_after === e.id}
                    onClick={() => update(meal, { energy_after: meal.energy_after === e.id ? null : e.id })}>{e.label}</button>
                ))}
              </div>
            </div>
            <input className="nota" placeholder="¿Qué comiste? (opcional)" defaultValue={meal.notes} maxLength={500}
              onBlur={(e) => e.target.value !== meal.notes && update(meal, { notes: e.target.value })} />
          </div>
        )
      })}
    </section>
  )
}
