import type { ReactNode } from 'react'

export function Pronto({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="card pronto">
      <span className="label">Muy pronto</span>
      <h2 className="serif">{titulo}</h2>
      <div className="muted">{children}</div>
    </div>
  )
}
