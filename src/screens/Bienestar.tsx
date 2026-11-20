import type { DailyLog, Profile } from '../lib/store'
import { Agua } from './Agua'
import { Ejercicio } from './Ejercicio'
import { Sueno } from './Sueno'
import { Pronto } from '../components/Pronto'

export type Sub = 'agua' | 'nutricion' | 'ejercicio' | 'sueno'
const SUBS: { id: Sub; label: string }[] = [
  { id: 'agua', label: 'Agua' },
  { id: 'nutricion', label: 'Nutrición' },
  { id: 'ejercicio', label: 'Ejercicio' },
  { id: 'sueno', label: 'Sueño' },
]

type Props = { sub: Sub; onSub: (s: Sub) => void; log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }

export function Bienestar({ sub, onSub, log, profile, onSave }: Props) {
  return (
    <section>
      <h1 className="serif">Bienestar</h1>
      <div className="segmented" role="tablist">
        {SUBS.map((s) => (
          <button key={s.id} role="tab" aria-selected={sub === s.id} className={sub === s.id ? 'on' : ''} onClick={() => onSub(s.id)}>{s.label}</button>
        ))}
      </div>
      {sub === 'agua' && <Agua log={log} profile={profile} onSave={onSave} />}
      {sub === 'nutricion' && (
        <Pronto titulo="Nutrición consciente">
          Registro en menos de 10 segundos por comida: sin pantallas, proteína, vegetales y cómo te sentiste de energía.
        </Pronto>
      )}
      {sub === 'ejercicio' && <Ejercicio log={log} profile={profile} onSave={onSave} />}
      {sub === 'sueno' && <Sueno log={log} profile={profile} onSave={onSave} />}
    </section>
  )
}
