export const tap = () => { try { navigator.vibrate?.(15) } catch { /* sin vibración */ } }
