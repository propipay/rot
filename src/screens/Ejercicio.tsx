import { useEffect, useRef, useState } from 'react'
import type { DailyLog, Profile } from '../lib/store'

// Rutina sin equipo, progresiva. Se alterna por día de la semana.
const ROUTINES: { name: string; items: string[] }[] = [
  { name: 'Fuerza tren inferior', items: ['Movilidad de cadera 3 min', 'Sentadillas 3×12', 'Zancadas alternas 3×10', 'Puente de glúteo 3×15', 'Plancha 3×30 s'] },
  { name: 'Fuerza tren superior', items: ['Movilidad de hombros 3 min', 'Flexiones (rodillas si hace falta) 3×10', 'Fondos en silla 3×10', 'Superman 3×12', 'Plancha lateral 2×20 s por lado'] },
  { name: 'Cardio suave y core', items: ['Marcha en sitio 3 min', 'Jumping jacks 3×30 s', 'Escaladores 3×20', 'Bicho muerto 3×10', 'Estiramiento final 5 min'] },
]

export function Ejercicio({ log, profile, onSave }: { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }) {
  const routine = ROUTINES[new Date().getDay() % ROUTINES.length]
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(0)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    ref.current = window.setInterval(() => setSecs((s) => s + 1), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  const finish = () => {
    setRunning(false)
    const mins = Math.round(secs / 60)
    if (mins > 0) onSave({ ...log, exercise_min: log.exercise_min + mins })
    setSecs(0)
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <section>
      <p className="muted">Hoy: {routine.name} · meta {profile.exercise_goal_min} min · llevas {log.exercise_min} min</p>
      <ol className="routine">{routine.items.map((i) => <li key={i}>{i}</li>)}</ol>
      <div className="timer">{mm}:{ss}</div>
      <div className="row">
        {!running ? <button onClick={() => setRunning(true)}>{secs ? 'Seguir' : 'Empezar'}</button> : <button className="ghost" onClick={() => setRunning(false)}>Pausa</button>}
        <button onClick={finish} disabled={secs < 60}>Terminar y guardar</button>
      </div>
      <div className="row">
        <button className="ghost" onClick={() => onSave({ ...log, exercise_min: log.exercise_min + 5 })}>+5 min manual</button>
      </div>
    </section>
  )
}
