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
/** Sensecheck 39 (3): filled pasta / cannelloni that bring their own sauce (ingredient list) stay ready meals – row.sauceInPack; tooltip = evidence. */
export function SauceNote({ s, className = '' }: { s?: { what?: string | null; evidence?: string | null } | null; className?: string }) {
  if (!s) return null
  return <span data-testid="sauce-note" title={[s.what, s.evidence].filter(Boolean).join(' – ')} className={'inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 ' + className}>Sauce im Pack</span>
}
