import { hm } from './time'

export type Block = { start: string; end: string; tag: string; title: string; focus: string; days: number[] }

const WEEKDAYS = [1, 2, 3, 4, 5]

// Ritmo semanal de la Bitácora compartida (Sección 3), hora de Caracas.
export const SCHEDULE: Block[] = [
  { start: '07:00', end: '07:45', tag: 'Bienestar', title: 'Activación e hidratación', focus: '500 ml de agua al despertar + 25–35 min de movilidad y fuerza sin equipo.', days: WEEKDAYS },
  { start: '09:00', end: '12:30', tag: 'Aldebaran / VEXBIZ', title: 'Trabajo profundo', focus: '+500 ml de agua y micro-pausa de 3 min a las 10:30.', days: WEEKDAYS },
  { start: '12:30', end: '13:30', tag: 'Bienestar', title: 'Nutrición y caminata', focus: 'Almuerzo sin pantallas + 500 ml de agua + caminata de 15–20 min.', days: WEEKDAYS },
  { start: '13:30', end: '16:00', tag: 'Aldebaran / VEXBIZ', title: 'Operaciones y reuniones', focus: 'Seguimientos comerciales (micro-pausa de 3 min a las 15:30).', days: WEEKDAYS },
  { start: '16:00', end: '17:15', tag: 'Road of Love', title: 'Bloque creativo', focus: 'Archivo de video, guiones (meta 50–70 videos a mar 2027) y avances de esta app.', days: [1, 3, 5] },
  { start: '16:00', end: '17:15', tag: 'Memories', title: 'memories.lealclub.com', focus: 'Desarrollo del producto Memories.', days: [2, 4] },
  { start: '21:45', end: '22:30', tag: 'Bienestar', title: 'Cierre e higiene digital', focus: 'Cierre de pendientes, desconexión de pantallas, a dormir 10:30 PM.', days: WEEKDAYS },
]

export function blocksFor(weekday: number) {
  return SCHEDULE.filter((b) => b.days.includes(weekday)).sort((a, b) => hm(a.start) - hm(b.start))
}
