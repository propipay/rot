/**
 * Luna dibujada según el ángulo de fase (0 = nueva, 180 = llena).
 * Creciente: luz a la derecha; menguante: luz a la izquierda (vista desde Venezuela).
 */
export function Luna({ angle, size = 96, label }: { angle: number; size?: number; label?: string }) {
  const R = 46
  const c = 50
  const a = ((angle % 360) + 360) % 360
  const rx = Math.abs(Math.cos((a * Math.PI) / 180)) * R
  const waxing = a < 180
  const crescent = waxing ? a < 90 : a > 270
  const lit = waxing
    ? `M${c} ${c - R}A${R} ${R} 0 0 1 ${c} ${c + R}A${rx} ${R} 0 0 ${crescent ? 0 : 1} ${c} ${c - R}Z`
    : `M${c} ${c - R}A${R} ${R} 0 0 0 ${c} ${c + R}A${rx} ${R} 0 0 ${crescent ? 1 : 0} ${c} ${c - R}Z`
  return (
    <svg className="luna" viewBox="0 0 100 100" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx={c} cy={c} r={R} className="luna-sombra" />
      <path d={lit} className="luna-luz" />
    </svg>
  )
}
