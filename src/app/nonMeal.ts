// Sensecheck 37 (2) / 38 (2): rows that are not ready meals carry row.nonMeal {kind, reason} (fertig qa/sensecheck37_nonmeal.json,
// qa/sensecheck38_fixes.json). The UI shows a visible 'Kein Fertiggericht' notice with the kind label; tooltip = reason (evidence).
export type NonMeal = { kind: string; reason?: string | null }
export const NON_MEAL_LABEL: Record<string, string> = {
  pasta: 'Zutat/Beilage – braucht Sauce',
  snack: 'Snack, keine Mahlzeit',
  dessert: 'Dessert',
  grocery: 'Lebensmittel/Zutat',
  seasoning: 'Würzmischung/Fix-Beutel',
}
export function nonMealLabel(n?: NonMeal | null): string | null {
  if (!n?.kind) return null
  return 'Kein Fertiggericht · ' + (NON_MEAL_LABEL[n.kind] ?? 'nicht in Rankings')
}
