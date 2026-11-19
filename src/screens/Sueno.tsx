import type { DailyLog, Profile } from '../lib/store'
import { sleepHours } from '../lib/store'

export function Sueno({ log, profile, onSave }: { log: DailyLog; profile: Profile; onSave: (l: DailyLog) => void }) {
  const h = sleepHours(log.sleep_start, log.sleep_end)
  return (
    <section>
      <h1>Sueño</h1>
      <p className="muted">Meta: {profile.sleep_goal_h} h · a la cama 10:30 PM, arriba 7:00 AM</p>
      <label>Anoche me dormí a las
        <input type="time" value={log.sleep_start ?? ''} onChange={(e) => onSave({ ...log, sleep_start: e.target.value || null })} />
      </label>
      <label>Hoy me desperté a las
        <input type="time" value={log.sleep_end ?? ''} onChange={(e) => onSave({ ...log, sleep_end: e.target.value || null })} />
      </label>
      <div className="card">
        {h === null ? <p>Registra tus horas para ver el total.</p> : (
          <p><strong>{h} h</strong> de descanso. {h >= 7 ? 'Bien hecho, tu cuerpo te lo agradece.' : 'Hoy intenta desconectar pantallas a las 9:45 PM.'}</p>
        )}
      </div>
    </section>
  )
}
