import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { DEFAULT_PROFILE, emptyLog, loadLog, loadProfile, saveLog, saveProfile, type DailyLog, type Profile } from './lib/store'
import { todayKey } from './lib/time'
import { Hoy } from './screens/Hoy'
import { Agua } from './screens/Agua'
import { Ejercicio } from './screens/Ejercicio'
import { Sueno } from './screens/Sueno'
import { Perfil } from './screens/Perfil'

type Tab = 'hoy' | 'agua' | 'ejercicio' | 'sueno' | 'perfil'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hoy', label: 'Hoy', icon: '☀' },
  { id: 'agua', label: 'Agua', icon: '💧' },
  { id: 'ejercicio', label: 'Ejercicio', icon: '🏃' },
  { id: 'sueno', label: 'Sueño', icon: '🌙' },
  { id: 'perfil', label: 'Perfil', icon: '♥' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('hoy')
  const [day] = useState(todayKey())
  const [log, setLog] = useState<DailyLog>(emptyLog(day))
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [email, setEmail] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const refresh = () => { loadLog(day).then(setLog); loadProfile().then(setProfile) }
    refresh()
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setEmail(s?.user?.email ?? null); refresh() })
    return () => sub.subscription.unsubscribe()
  }, [day])

  const updateLog = (l: DailyLog) => {
    setLog(l)
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { saveLog(l) }, 600)
  }
  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p) }

  return (
    <div className="app">
      <main>
        {tab === 'hoy' && <Hoy log={log} profile={profile} onSave={updateLog} />}
        {tab === 'agua' && <Agua log={log} profile={profile} onSave={updateLog} />}
        {tab === 'ejercicio' && <Ejercicio log={log} profile={profile} onSave={updateLog} />}
        {tab === 'sueno' && <Sueno log={log} profile={profile} onSave={updateLog} />}
        {tab === 'perfil' && <Perfil profile={profile} onSave={updateProfile} email={email} />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-label={t.label}>
            <span aria-hidden>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
