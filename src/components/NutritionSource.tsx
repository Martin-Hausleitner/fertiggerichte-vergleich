import { cn } from '@/lib'
/** Nur besondere Nährwert-Herkünfte bekommen einen Hinweis; normale Shop-/OFF-Quellen (Freitext) nicht. */
const LABEL: Record<string, { t: string; tip: string }> = {
  'GTIN-confirmed': { t: 'Nährwerte: GTIN-bestätigt', tip: 'Nährwerte per EAN/GTIN einem identischen Produkt zugeordnet und geprüft' },
  'OFF name-match': { t: 'Nährwerte: OFF-Namensabgleich', tip: 'Werte eines namensgleichen Produkts aus Open Food Facts, nicht vom Händler bestätigt' },
}
export function NutritionSourceBadge({ r, className }: { r: { nutrition_source?: string | null }; className?: string }) {
  const l = r.nutrition_source ? LABEL[r.nutrition_source] : undefined; if (!l) return null
  return <span data-testid="nutrition-source" title={l.tip} className={cn('inline-flex items-center whitespace-nowrap rounded border border-sky-300 bg-sky-50 px-1 text-[10px] font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300', className)}>{l.t}</span>
}
