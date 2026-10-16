import { useMemo, useState } from 'react'
import { ChefHat, Info } from 'lucide-react'
import { Card, Select } from '@/components/ui'
import { Img, ScoreBar } from '@/components/product'
import { useApp, fmt } from '@/lib'
import { pricePerPortion, protPerPortion, kcalPerPortion } from '@/app/meal'
import { valueScore, useCfg } from '@/app/scoring'
import { deliveryTitle } from '@/app/shops'

/** Liefertext wie in der Tabelle, aus delivers_4020 / delivery_note abgeleitet. */
const kitDelivery = (r: any): { t: string; cls: string } =>
  r.delivers_4020 === false ? { t: r.delivery_note?.trim() || 'Liefert nicht nach 4020 Linz', cls: 'text-red-700' }
    : r.delivers_4020 === true ? { t: 'Online / Lieferung', cls: 'text-muted-foreground' }
      : { t: 'Lieferung nach 4020 nicht geprüft', cls: 'italic text-muted-foreground/80' }

/** Meal-Kits (segment = meal_kit) – eigenes Ranking, getrennt von Fertiggerichten. Nur rankable_mealkit. */
export default function MealKits() {
  const { D, open } = useApp(); useCfg(); const [so, setSo] = useState<'value' | 'score' | 'price'>('value')
  const all = useMemo(() => D.rows.filter(r => (r as any).segment === 'meal_kit'), [D])
  const kits = useMemo(() => all.filter(r => (r as any).rankable_mealkit).map(r => ({ r, v: valueScore(r), pp: pricePerPortion(r) ?? r.price }))
    .sort((a, b) => so === 'price' ? (a.pp ?? 1e9) - (b.pp ?? 1e9) : so === 'score' ? (b.r.score ?? 0) - (a.r.score ?? 0) : (b.v ?? -1) - (a.v ?? -1)), [all, so])
  const ab = (r: any) => /ab-?Preis/i.test(r.price_kind ?? '') ? 'ab ' : ''
  return <div className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><ChefHat className="size-5" />Meal-Kits</h1>
      <p className="text-sm text-muted-foreground">Kochboxen zum Selberkochen – getrennt von Fertiggerichten gerankt. {kits.length} von {all.length} rankbar.</p></div>
      <Select value={so} onChange={e => setSo(e.target.value as any)} aria-label="Sortierung"><option value="value">Preis-Leistung</option><option value="score">Health-Score</option><option value="price">Preis pro Portion</option></Select></div>
    <Card className="flex gap-2 p-3 text-xs shadow-none"><Info className="size-4 shrink-0" />„ab €“ = günstigste Boxgröße ohne Versand; der tatsächliche Preis hängt von Boxgröße und Lieferung ab. Lieferung nach 4020 steht je Box.</Card>
    <ol className="divide-y rounded-xl border">{kits.map(({ r, v, pp }, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 p-2 text-left hover:bg-muted/50">
      <span className="w-6 text-right font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-12 shrink-0 rounded" />
      <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium">{r.name}</span><span className="text-xs text-muted-foreground">{r.brandN} · {ab(r)}{fmt(pp, 2)} €/Portion · {fmt(kcalPerPortion(r), 0)} kcal · {fmt(protPerPortion(r), 0)} g Protein{v != null && ` · Wert ${fmt(v, 0)}`}</span>{(() => { const d = kitDelivery(r); return <span data-testid="kit-delivery" title={deliveryTitle(r as any)} className={`block text-[11px] ${d.cls}`}>{d.t}</span> })()}</span>
      <span className="w-24 shrink-0 sm:w-32"><ScoreBar r={r} /></span></button></li>)}</ol>
  </div>
}
