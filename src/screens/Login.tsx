import { Mail } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !email) return
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    })
    setState(error ? 'error' : 'sent')
  }

  return (
    <div className="login">
      <div className="card login-card">
        <span className="corazon" aria-hidden>
          <svg viewBox="0 0 512 512" width="56" height="56"><rect width="512" height="512" rx="96" fill="var(--accent)" /><path d="M256 392s-120-72-120-160a68 68 0 0 1 120-44 68 68 0 0 1 120 44c0 88-120 160-120 160z" fill="var(--bg)" /></svg>
        </span>
        <h1 className="serif">Road of Love</h1>
        <p className="muted">Tu espacio privado de bienestar. Escribe tu correo y te enviamos un enlace para entrar.</p>
        {state === 'sent' ? (
          <div className="aviso" role="status">
            <Mail size={20} strokeWidth={1.75} aria-hidden />
            <span>Listo. Revisa tu correo y abre el enlace desde este mismo teléfono.</span>
          </div>
        ) : (
          <form onSubmit={send}>
            <label>Correo
              <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </label>
            <button type="submit" disabled={!email || state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviarme enlace de acceso'}</button>
            {state === 'error' && <p className="small error" role="alert">No se pudo enviar el enlace. Revisa el correo o intenta en un minuto.</p>}
          </form>
        )}
      </div>
    </div>
  )
}
