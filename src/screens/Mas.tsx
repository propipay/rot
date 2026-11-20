import { Bell, ChevronLeft, ChevronRight, Mic, User } from 'lucide-react'
import { useState } from 'react'
import type { Profile } from '../lib/store'
import { Perfil } from './Perfil'
import { Pronto } from '../components/Pronto'
import { Recordatorios } from './Recordatorios'

export type MasView = 'menu' | 'recordatorios' | 'roadoflove' | 'perfil'

export function Mas({ profile, onSave, email, onSignOut, start = 'menu' }: { profile: Profile; onSave: (p: Profile) => void; email: string | null; onSignOut: () => void; start?: MasView }) {
  const [view, setView] = useState<MasView>(start)
  if (view !== 'menu') {
    return (
      <section>
        <button className="volver" onClick={() => setView('menu')}><ChevronLeft size={18} strokeWidth={1.75} aria-hidden /> Más</button>
        {view === "perfil" && <Perfil profile={profile} onSave={onSave} email={email} onSignOut={onSignOut} />}
        {view === 'recordatorios' && <Recordatorios focus={start === 'recordatorios'} />}
        {view === 'roadoflove' && (
          <>
            <h1 className="serif">Road of Love</h1>
            <Pronto titulo="Videos y podcast">Avance hacia la meta de 50 a 70 videos y la lista de tareas para lanzar "Un Mejor Planeta" en marzo.</Pronto>
          </>
        )}
      </section>
    )
  }
  const items = [
    { id: 'recordatorios' as const, label: 'Recordatorios Google', Icon: Bell },
    { id: 'roadoflove' as const, label: 'Road of Love y Podcast', Icon: Mic },
    { id: 'perfil' as const, label: 'Perfil y ajustes', Icon: User },
  ]
  return (
    <section>
      <h1 className="serif">Más</h1>
      <ul className="menu">
        {items.map(({ id, label, Icon }) => (
          <li key={id}>
            <button onClick={() => setView(id)}>
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
              <ChevronRight size={18} strokeWidth={1.75} aria-hidden className="muted" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
