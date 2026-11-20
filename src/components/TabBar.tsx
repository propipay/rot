import { Flame, HeartPulse, LayoutGrid, Sparkles, Sun, type LucideIcon } from 'lucide-react'

export type Tab = 'hoy' | 'bienestar' | 'habitos' | 'cielo' | 'mas'

export const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'hoy', label: 'Hoy', Icon: Sun },
  { id: 'bienestar', label: 'Bienestar', Icon: HeartPulse },
  { id: 'habitos', label: 'Hábitos', Icon: Flame },
  { id: 'cielo', label: 'Cielo', Icon: Sparkles },
  { id: 'mas', label: 'Más', Icon: LayoutGrid },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="Navegación principal">
      <div className="marca-lateral serif">Road of Love</div>
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={tab === id ? 'on' : ''} onClick={() => onChange(id)} aria-current={tab === id ? 'page' : undefined}>
          <Icon size={22} strokeWidth={1.75} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
