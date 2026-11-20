import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { DEFAULT_PROFILE, clearLocal, emptyLog, flushPending, loadLog, loadProfile, saveLog, saveProfile, type DailyLog, type Profile } from './lib/store'
import { todayKey } from './lib/time'
import { flushOutbox } from './lib/sync'
import { loadMeals, type Meal } from './lib/nutrition'
import { loadHabits, type HabitsState } from './lib/habits'
import { TabBar, type Tab } from './components/TabBar'
import { Hoy } from './screens/Hoy'
import { Bienestar, type Sub } from './screens/Bienestar'
import { Habitos } from './screens/Habitos'
import { Cielo } from './screens/Cielo'
import { Mas } from './screens/Mas'
import { Login } from './screens/Login'

export default function App() {
  // undefined = revisando sesión; null = sin sesión
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="cargando" aria-busy="true" />
  if (supabase && !session) return <Login />
  return <Panel email={session?.user.email ?? null} key={session?.user.id ?? 'local'} />
}

function Panel({ email }: { email: string | null }) {
  const [tab, setTab] = useState<Tab>('hoy')
  const [sub, setSub] = useState<Sub>('agua')
  const [day] = useState(todayKey())
  const [log, setLog] = useState<DailyLog>(emptyLog(day))
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [meals, setMeals] = useState<Meal[]>([])
  const [habits, setHabits] = useState<HabitsState>({ habits: [], logs: [] })
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const refresh = () => flushPending().then(() => {
      loadLog(day).then(setLog); loadProfile().then(setProfile)
      loadMeals(day).then(setMeals); loadHabits().then(setHabits)
    })
    refresh()
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [day])

  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }) }

  const updateLog = (l: DailyLog) => {
    setLog(l)
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { saveLog(l) }, 600)
  }
  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p) }

  const signOut = async () => {
    if (timer.current) { clearTimeout(timer.current); await saveLog(log) }
    await flushPending()
    await flushOutbox()
    clearLocal()
    await supabase?.auth.signOut()
  }

  return (
    <div className="app">
      <TabBar tab={tab} onChange={go} />
      <main>
        {tab === 'hoy' && <Hoy log={log} profile={profile} meals={meals} habits={habits} onSave={updateLog} onOpen={(s) => { setSub(s); go('bienestar') }} onHabits={() => go('habitos')} />}
        {tab === 'bienestar' && <Bienestar sub={sub} onSub={setSub} log={log} profile={profile} onSave={updateLog} meals={meals} onMeals={setMeals} />}
        {tab === 'habitos' && <Habitos state={habits} onChange={setHabits} />}
        {tab === 'cielo' && <Cielo />}
        {tab === 'mas' && <Mas profile={profile} onSave={updateProfile} email={email} onSignOut={signOut} />}
      </main>
    </div>
  )
}
