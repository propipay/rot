import { supabase } from './supabase'
import { cache, enqueue, flushOutbox, outboxSize, uuid } from './sync'

export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack'
export type Energy = 'alta' | 'estable' | 'pesada'
export type Meal = {
  id: string; day: string; meal_type: MealType; logged_at: string
  screen_free: boolean; tags: string[]; energy_after: Energy | null; notes: string
}

export const MEALS: { type: MealType; label: string }[] = [
  { type: 'desayuno', label: 'Desayuno' },
  { type: 'almuerzo', label: 'Almuerzo' },
  { type: 'cena', label: 'Cena' },
  { type: 'snack', label: 'Snack' },
]
export const TAGS = ['Proteína', 'Vegetales / Fruta', 'Comida real / Ligera']

const key = (day: string) => 'meals:' + day

export async function loadMeals(day: string): Promise<Meal[]> {
  const local = cache.get<Meal[]>(key(day)) ?? []
  if (!supabase) return local
  await flushOutbox()
  if (outboxSize() > 0) return local
  try {
    const { data, error } = await supabase.from('nutrition_logs')
      .select('id,day,meal_type,logged_at,screen_free,tags,energy_after,notes').eq('day', day)
    if (error) throw error
    if (!data) return local
    cache.set(key(day), data)
    return data as Meal[]
  } catch { return local }
}

export function blankMeal(day: string, meal_type: MealType): Meal {
  return { id: uuid(), day, meal_type, logged_at: new Date().toISOString(), screen_free: false, tags: [], energy_after: null, notes: '' }
}

export function saveMeal(all: Meal[], meal: Meal): Meal[] {
  const next = [...all.filter((m) => m.meal_type !== meal.meal_type), meal]
  cache.set(key(meal.day), next)
  enqueue({ kind: 'upsert', table: 'nutrition_logs', row: { ...meal }, onConflict: 'user_id,day,meal_type' })
  return next
}

export const isLogged = (m?: Meal) => !!m && (m.screen_free || m.tags.length > 0 || !!m.energy_after || m.notes.trim().length > 0)

export function mealSummary(meals: Meal[]) {
  const main = meals.filter((m) => m.meal_type !== 'snack' && isLogged(m)).length
  const screenFree = meals.filter((m) => isLogged(m) && m.screen_free).length
  return { main, screenFree, text: `${main}/3 comidas · ${screenFree} sin pantallas` }
}
