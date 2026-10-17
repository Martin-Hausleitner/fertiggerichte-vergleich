import { Ban } from 'lucide-react'
import { nonMealLabel, type NonMeal } from '../app/nonMeal'
/** Sensecheck 38 (2): visible notice for rows that are not ready meals (row.nonMeal); tooltip = reason/evidence. */
export function NonMealNote({ n, className = '' }: { n?: NonMeal | null; className?: string }) {
  const l = nonMealLabel(n); if (!l) return null
  return <span data-testid="nonmeal-note" title={n?.reason || l} className={'inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100 ' + className}><Ban size={11} className="shrink-0"/>{l}</span>
}
/** Sensecheck 38 (3): filled pasta without sauce kept as a ready meal (Kärntner Kasnudeln, Schlutzkrapfen, Maultaschen) – row.noSauce. */
export function NoSauceNote({ on, className = '' }: { on?: boolean | null; className?: string }) {
  if (!on) return null
  return <span data-testid="nosauce-note" title="Gefüllte Teigtaschen ohne Sauce im Pack – traditionell mit Butter/Zwiebeln bzw. in Brühe als Hauptgericht gegessen" className={'inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200 ' + className}>ohne Sauce</span>
}
