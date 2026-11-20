import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { DEFAULT_PROFILE, emptyLog, loadLog, loadProfile, saveLog, saveProfile, type DailyLog, type Profile } from './lib/store'
import { todayKey } from './lib/time'
import { TabBar, type Tab } from './components/TabBar'
import { Hoy } from './screens/Hoy'
import { Bienestar, type Sub } from './screens/Bienestar'
import { Habitos } from './screens/Habitos'
import { Cielo } from './screens/Cielo'
import { Mas } from './screens/Mas'

export default function App() {
  const [tab, setTab] = useState<Tab>('hoy')
  const [sub, setSub] = useState<Sub>('agua')
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

  const go = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }) }

  const updateLog = (l: DailyLog) => {
    setLog(l)
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { saveLog(l) }, 600)
  }
  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p) }

  return (
    <div className="app">
      <TabBar tab={tab} onChange={go} />
      <main>
        {tab === 'hoy' && <Hoy log={log} profile={profile} onSave={updateLog} onOpen={(s) => { setSub(s); go('bienestar') }} />}
        {tab === 'bienestar' && <Bienestar sub={sub} onSub={setSub} log={log} profile={profile} onSave={updateLog} />}
        {tab === 'habitos' && <Habitos />}
        {tab === 'cielo' && <Cielo />}
        {tab === 'mas' && <Mas profile={profile} onSave={updateProfile} email={email} />}
      </main>
    </div>
  )
}
