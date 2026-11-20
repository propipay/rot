import { Check, Plus, RotateCcw, Settings2, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  addHabit, archiveHabit, caracasInputToIso, dailyStreak, encouragement, isoToCaracasInput, lastNDays,
  milestoneLabel, resetStreak, streakParts, toggleCheck, updateHabit, type Habit, type HabitType, type HabitsState,
} from '../lib/habits'
import { todayKey } from '../lib/time'
import { tap } from '../lib/haptics'

const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function Habitos({ state, onChange }: { state: HabitsState; onChange: (s: HabitsState) => void }) {
  const [, setTick] = useState(0)
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), 60_000); return () => clearInterval(t) }, [])
  const [adding, setAdding] = useState(false)

  const quits = state.habits.filter((h) => h.type === 'quit_streak')
  const dailies = state.habits.filter((h) => h.type === 'daily_check')

  return (
    <section>
      <h1 className="serif">Hábitos</h1>
      {quits.map((h) => <QuitCard key={h.id} h={h} state={state} onChange={onChange} />)}

      <h3>Hábitos diarios</h3>
      <div className="card lista-habitos">
        {dailies.length === 0 && <p className="muted small">Aún no tienes hábitos diarios.</p>}
        {dailies.map((h) => <DailyRow key={h.id} h={h} state={state} onChange={onChange} />)}
      </div>

      {adding ? <NewHabit onCancel={() => setAdding(false)} onCreate={(name, type) => { onChange(addHabit(state, name, type)); setAdding(false) }} />
        : <button className="ghost ancho" onClick={() => setAdding(true)}><Plus size={18} strokeWidth={1.75} aria-hidden /> Nuevo hábito</button>}
    </section>
  )
}

function QuitCard({ h, state, onChange }: { h: Habit; state: HabitsState; onChange: (s: HabitsState) => void }) {
  const [editing, setEditing] = useState(!h.started_at)
  const [resetting, setResetting] = useState(false)
  const [note, setNote] = useState('')
  const [start, setStart] = useState(isoToCaracasInput(h.started_at) || isoToCaracasInput(new Date().toISOString()))
  const s = streakParts(h.started_at)
  const best = Math.max(h.best_streak_days, s.days)
  const resets = state.logs.filter((l) => l.habit_id === h.id && l.event_type === 'reset').sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div className="card racha">
      <div className="comida-head">
        <span className="label">{h.name}</span>
        <button className="icono" aria-label="Configurar fecha de inicio" onClick={() => setEditing(!editing)}><Settings2 size={18} strokeWidth={1.75} /></button>
      </div>

      {editing ? (
        <div>
          <label>¿Desde cuándo? (hora de Caracas)
            <input type="datetime-local" value={start} max={isoToCaracasInput(new Date().toISOString())} onChange={(e) => setStart(e.target.value)} />
          </label>
          <div className="row">
            <button onClick={() => { onChange(updateHabit(state, { ...h, started_at: caracasInputToIso(start) })); setEditing(false) }} disabled={!start}>Guardar</button>
            {h.started_at && <button className="ghost" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
          {h.started_at && <button className="enlace peligro" onClick={() => onChange(archiveHabit(state, h))}><Trash2 size={14} aria-hidden /> Quitar este hábito</button>}
        </div>
      ) : (
        <>
          <div className="contador num"><strong>{s.days}</strong> {s.days === 1 ? 'día' : 'días'} · <strong>{s.hours}</strong> h</div>
          <p className="muted">{encouragement(s.days)}</p>
          {s.next && (
            <div className="hito">
              <div className="hito-texto small"><span>Siguiente hito: {milestoneLabel(s.next)}</span><span className="num">{Math.round(s.progress * 100)}%</span></div>
              <span className="bar"><span style={{ width: `${s.progress * 100}%` }} /></span>
            </div>
          )}
          <div className="hitos" aria-label="Hitos">
            {[1, 3, 7, 14, 30, 60, 90, 180, 365].map((m) => (
              <span key={m} className={`hito-chip ${s.days >= m || (m === 1 && s.days >= 1) ? 'on' : ''}`}>{milestoneLabel(m)}</span>
            ))}
          </div>
          <p className="small muted num">Mejor racha: {best} {best === 1 ? 'día' : 'días'}</p>

          {resetting ? (
            <div className="tropiezo">
              <label>¿Qué aprendiste de este momento? (opcional)
                <textarea rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Sin culpa. Solo una nota para la próxima vez." />
              </label>
              <div className="row">
                <button onClick={() => { tap(); onChange(resetStreak(state, h, note)); setNote(''); setResetting(false) }}>Reiniciar contador</button>
                <button className="ghost" onClick={() => setResetting(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="enlace" onClick={() => setResetting(true)}><RotateCcw size={14} aria-hidden /> Registrar tropiezo</button>
          )}

          {resets.length > 0 && (
            <details className="historial-rachas">
              <summary className="small">Aprendizajes ({resets.length})</summary>
              <ul>{resets.map((r) => <li key={r.id} className="small"><span className="num muted">{r.logged_date}</span> {r.note || '—'}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}

function DailyRow({ h, state, onChange }: { h: Habit; state: HabitsState; onChange: (s: HabitsState) => void }) {
  const today = todayKey()
  const days = lastNDays(7)
  const checked = new Set(state.logs.filter((l) => l.habit_id === h.id && l.event_type === 'check').map((l) => l.logged_date))
  const done = checked.has(today)
  const streak = dailyStreak(state.logs, h.id)
  return (
    <div className="habito">
      <button className={`check ${done ? 'on' : ''}`} aria-pressed={done} aria-label={`${h.name}: ${done ? 'hecho hoy' : 'marcar como hecho'}`}
        onClick={() => { tap(); onChange(toggleCheck(state, h.id)) }}>
        {done && <Check size={20} strokeWidth={2.25} aria-hidden />}
      </button>
      <div className="habito-info">
        <strong>{h.name}</strong>
        <span className="small muted num">{streak > 0 ? `Racha: ${streak} ${streak === 1 ? 'día' : 'días'}` : 'Empieza hoy'}</span>
      </div>
      <div className="semana" aria-label="Últimos 7 días">
        {days.map((d) => (
          <span key={d} className={`dia ${checked.has(d) ? 'on' : ''}`} title={d}>{DOW[new Date(d + 'T12:00:00').getDay()]}</span>
        ))}
      </div>
    </div>
  )
}

function NewHabit({ onCreate, onCancel }: { onCreate: (n: string, t: HabitType) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<HabitType>('daily_check')
  return (
    <div className="card">
      <div className="comida-head">
        <h2 className="serif">Nuevo hábito</h2>
        <button className="icono" aria-label="Cerrar" onClick={onCancel}><X size={18} strokeWidth={1.75} /></button>
      </div>
      <label>Nombre<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ej. Días sin azúcar añadida" /></label>
      <div className="segmented">
        <button className={type === 'daily_check' ? 'on' : ''} onClick={() => setType('daily_check')}>Diario</button>
        <button className={type === 'quit_streak' ? 'on' : ''} onClick={() => setType('quit_streak')}>Días sin…</button>
      </div>
      <p className="small muted">{type === 'daily_check' ? 'Un toque cada día que lo cumplas.' : 'Un contador continuo desde hoy; puedes ajustar la fecha de inicio.'}</p>
      <button className="ancho" disabled={!name.trim()} onClick={() => onCreate(name, type)}>Crear hábito</button>
    </div>
  )
}
