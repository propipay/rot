import { supabase } from './supabase'

/**
 * Cola de cambios para tablas con filas (nutrición, hábitos…).
 * Cada cambio se aplica primero en pantalla y en el teléfono; luego se sube.
 * Si no hay conexión queda aquí y se reintenta al volver la red.
 */
type Op =
  | { kind: 'upsert'; table: string; row: Record<string, unknown>; onConflict?: string }
  | { kind: 'delete'; table: string; id: string }

const KEY = 'rot:outbox'
const read = (): Op[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const write = (ops: Op[]) => { try { localStorage.setItem(KEY, JSON.stringify(ops)) } catch { /* nada */ } }

let flushing: Promise<void> | null = null

export function enqueue(op: Op) {
  write([...read(), op])
  void flushOutbox()
}

export const outboxSize = () => read().length

export function flushOutbox(): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    let ops = read()
    while (ops.length) {
      const op = ops[0]
      try {
        const res = op.kind === 'upsert'
          ? await supabase.from(op.table).upsert(op.row, op.onConflict ? { onConflict: op.onConflict } : undefined)
          : await supabase.from(op.table).delete().eq('id', op.id)
        // Error de datos (no de red): se descarta para no bloquear la cola
        if (res.error && res.status >= 400 && res.status < 500) console.warn('Cambio descartado', res.error.message)
        else if (res.error) throw res.error
      } catch {
        break // sin red: se reintenta después
      }
      ops = ops.slice(1)
      write(ops)
    }
  })().finally(() => { flushing = null })
  return flushing
}

/** Caché local simple por clave */
export const cache = {
  get<T>(k: string): T | null { try { const v = localStorage.getItem('rot:' + k); return v ? JSON.parse(v) as T : null } catch { return null } },
  set(k: string, v: unknown) { try { localStorage.setItem('rot:' + k, JSON.stringify(v)) } catch { /* nada */ } },
}

export const uuid = () => crypto.randomUUID()
