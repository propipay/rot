import { CalendarDays, Check, ListTodo, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { caracasInputToIso } from '../lib/habits'
import { tap } from '../lib/haptics'
import { cachedReminders, deleteReminder, loadReminders, newReminder, retryPending, syncReminder, type Reminder, type Target } from '../lib/reminders'
import { supabase } from '../lib/supabase'
import { clockCaracas, nowInCaracas, todayKey, TZ } from '../lib/time'

const shortDay = (iso: string) => {
  const key = todayKey(new Date(iso))
  const tomorrow = todayKey(new Date(Date.now() + 86_400_000))
  if (key === todayKey()) return 'Hoy'
  if (key === tomorrow) return 'Mañana'
  const s = new Intl.DateTimeFormat('es-VE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Próxima hora en punto (hora de Venezuela)
function nextHour(): string {
  const h = Math.min(23, Math.floor(nowInCaracas().minutes / 60) + 1)
  return `${String(h).padStart(2, '0')}:00`
}

export function Recordatorios({ focus = false }: { focus?: boolean }) {
  const [list, setList] = useState<Reminder[]>(cachedReminders)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState(nextHour)
  const [target, setTarget] = useState<Target>('calendar')
  const [notes, setNotes] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus) input.current?.focus()
    loadReminders().then(setList).then(() => retryPending()).then(setList)
  }, [focus])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const due = caracasInputToIso(`${date}T${time}`)
    if (new Date(due).getTime() < Date.now() - 60_000) { setMsg('Elige una fecha y hora que no hayan pasado.'); return }
    const r = newReminder({ title: t, due_at: due, target, notes: notes.trim() })
    tap(); setMsg(''); setTitle(''); setNotes('')
    setList((l) => [...l, r].sort((a, b) => a.due_at.localeCompare(b.due_at)))
    setSyncing(r.id)
    syncReminder(r).then(setList).finally(() => setSyncing(null))
  }

  const retry = (r: Reminder) => {
    setSyncing(r.id)
    syncReminder(r).then(setList).finally(() => setSyncing(null))
  }

  const remove = (id: string) => {
    if (confirm !== id) { setConfirm(id); return }
    setConfirm(null)
    deleteReminder(id).then(setList).catch(() => setMsg('No pude borrarlo ahora. Revisa tu conexión.'))
  }

  const now = Date.now()
  const upcoming = list.filter((r) => new Date(r.due_at).getTime() >= now - 60 * 60_000)
  const past = list.filter((r) => new Date(r.due_at).getTime() < now - 60 * 60_000).reverse()

  const item = (r: Reminder) => (
    <li key={r.id}>
      <span className="rec-icono" aria-hidden>{r.target === 'tasks' ? <ListTodo size={18} strokeWidth={1.75} /> : <CalendarDays size={18} strokeWidth={1.75} />}</span>
      <span className="rec-texto">
        <strong>{r.title}</strong>
        <small className="muted num">{shortDay(r.due_at)} · {clockCaracas(r.due_at)} · {r.target === 'tasks' ? 'Google Tasks' : 'Google Calendar'}</small>
        <Estado r={r} busy={syncing === r.id} onRetry={() => retry(r)} />
      </span>
      <button className={`icono${confirm === r.id ? ' peligro' : ''}`} onClick={() => remove(r.id)} aria-label={confirm === r.id ? `Confirmar: borrar ${r.title}` : `Borrar ${r.title}`}>
        {confirm === r.id ? <span className="confirmar">¿Borrar?</span> : <Trash2 size={18} strokeWidth={1.75} aria-hidden />}
      </button>
    </li>
  )

  return (
    <>
      <h1 className="serif">Recordatorios</h1>
      <p className="muted">Llegan a tu Google Calendar como evento con aviso 10 minutos antes, o a Google Tasks como tarea.</p>
      {!supabase && <p className="aviso">Modo local: se enviarán a Google cuando inicies sesión.</p>}

      <form className="card rec-form" onSubmit={submit}>
        <label>Qué quieres recordar
          <input ref={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ej. Grabar episodio de Road of Love" enterKeyHint="done" />
        </label>
        <div className="fila-2">
          <label>Fecha<input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} required /></label>
          <label>Hora<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></label>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Destino en Google">
          <button type="button" role="radio" aria-checked={target === 'calendar'} className={target === 'calendar' ? 'on' : ''} onClick={() => setTarget('calendar')}>
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden /> Calendar
          </button>
          <button type="button" role="radio" aria-checked={target === 'tasks'} className={target === 'tasks' ? 'on' : ''} onClick={() => setTarget('tasks')}>
            <ListTodo size={16} strokeWidth={1.75} aria-hidden /> Tasks
          </button>
        </div>
        {target === 'tasks' && <p className="muted pequeno">Google Tasks guarda solo el día; la hora queda escrita en las notas de la tarea.</p>}
        <label>Notas (opcional)
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </label>
        <button type="submit" disabled={!title.trim()}>Crear recordatorio</button>
        {msg && <p className="aviso" role="status">{msg}</p>}
      </form>

      <h3>Próximos</h3>
      {upcoming.length === 0 && <p className="muted">Nada pendiente. Crea el primero arriba.</p>}
      <ul className="recordatorios">{upcoming.map(item)}</ul>

      {past.length > 0 && (
        <details className="anteriores">
          <summary className="muted">Anteriores (últimos 7 días)</summary>
          <ul className="recordatorios">{past.map(item)}</ul>
        </details>
      )}
    </>
  )
}

function Estado({ r, busy, onRetry }: { r: Reminder; busy: boolean; onRetry: () => void }) {
  if (busy) return <span className="estado">Enviando a Google…</span>
  if (r.sync_status === 'synced') return <span className="estado ok"><Check size={14} strokeWidth={2} aria-hidden /> Sincronizado con Google</span>
  if (r.sync_status === 'error') {
    return (
      <span className="estado error">
        No llegó a Google
        <button className="chip pequeno-chip" onClick={onRetry}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> Reintentar</button>
        {r.sync_error && <small className="muted detalle">{r.sync_error}</small>}
      </span>
    )
  }
  return (
    <span className="estado">
      Pendiente
      {supabase && <button className="chip pequeno-chip" onClick={onRetry}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> Reintentar</button>}
    </span>
  )
}
