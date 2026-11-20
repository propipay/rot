import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/store'

export function Perfil({ profile, onSave, email, onSignOut }: { profile: Profile; onSave: (p: Profile) => void; email: string | null; onSignOut: () => void }) {
  const [p, setP] = useState(profile)
  return (
    <section>
      <h1 className="serif">Perfil</h1>
      <label>Nombre<input value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></label>
      <label>Meta de agua (ml)<input type="number" step={250} value={p.water_goal_ml} onChange={(e) => setP({ ...p, water_goal_ml: Number(e.target.value) })} /></label>
      <label>Meta de ejercicio (min)<input type="number" step={5} value={p.exercise_goal_min} onChange={(e) => setP({ ...p, exercise_goal_min: Number(e.target.value) })} /></label>
      <label>Meta de sueño (h)<input type="number" step={0.5} value={p.sleep_goal_h} onChange={(e) => setP({ ...p, sleep_goal_h: Number(e.target.value) })} /></label>
      <button onClick={() => onSave(p)}>Guardar perfil</button>

      <h3>Cuenta</h3>
      {!supabase && <p className="muted small">Modo local: tus datos se guardan solo en este teléfono.</p>}
      {supabase && email && (
        <>
          <p className="small">Sesión iniciada como <strong>{email}</strong>.</p>
          <button className="ghost" onClick={onSignOut}>Cerrar sesión</button>
        </>
      )}
    </section>
  )
}
