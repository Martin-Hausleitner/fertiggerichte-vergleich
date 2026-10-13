import { cn } from '@/lib'
const LABEL: Record<string, string> = { 'OFF name-match': 'Nährwerte: OFF-Namensabgleich' }
/** Kleiner Hinweis, woher die Nährwerte stammen, wenn nicht direkt vom Produkt (z. B. Open-Food-Facts-Namensabgleich). */
export function NutritionSourceBadge({ r, className }: { r: { nutrition_source?: string | null }; className?: string }) {
  const s = r.nutrition_source; if (!s) return null
  return <span data-testid="nutrition-source" title={`Nährwertquelle: ${s} – Werte eines namensgleichen Produkts, nicht vom Händler bestätigt`} className={cn('inline-flex items-center whitespace-nowrap rounded border border-sky-300 bg-sky-50 px-1 text-[10px] font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300', className)}>{LABEL[s] ?? `Nährwerte: ${s}`}</span>
}
