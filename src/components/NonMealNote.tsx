import { Ban } from 'lucide-react'
import { nonMealLabel, type NonMeal } from '../app/nonMeal'
/** Sensecheck 38 (2): visible notice for rows that are not ready meals (row.nonMeal); tooltip = reason/evidence. */
export function NonMealNote({ n, className = '' }: { n?: NonMeal | null; className?: string }) {
  const l = nonMealLabel(n); if (!l) return null
  return <span data-testid="nonmeal-note" title={n?.reason || l} className={'inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100 ' + className}><Ban size={11} className="shrink-0"/>{l}</span>
}
