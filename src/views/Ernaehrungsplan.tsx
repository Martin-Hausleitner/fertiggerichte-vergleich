import { useMemo } from 'react'
import { ShieldCheck, ShoppingCart, Printer } from 'lucide-react'
import { Card, Button, Input } from '@/components/ui'
import { Slider } from '@/components/ui/slider'
import { StoreLogo } from '@/components/product'
import { useApp, useLocal, fmt } from '@/lib'
import { useNearShops } from '@/app/shops'
import { buildMealPlan, DEFAULT_TARGETS, ALLERGENS, type PlanTargets } from '@/app/plan'
import { OldPriceBadge } from '@/components/PriceAge'
import { useCfg, setCfg, DEFAULT_CFG } from '@/app/scoring'
import { Trash2 } from 'lucide-react'

export default function Ernaehrungsplan() {
  const { R, open } = useApp(); const { myChains } = useNearShops(); const cfg = useCfg()
  // Ziele NUR in localStorage (Art. 9 DSGVO) – nie in URL/Hash
  const [t, setT] = useLocal<PlanTargets>('fg-goals', DEFAULT_TARGETS)
  const plan = useMemo(() => buildMealPlan(R, myChains.size ? myChains : null, t), [R, myChains, t, cfg])
  const num = (k: keyof PlanTargets, l: string, u: string, step = 1) => <label className="space-y-1 text-xs"><span className="font-medium">{l}</span><div className="flex items-center gap-1"><Input type="number" inputMode="decimal" step={step} value={t[k] as number} onChange={e => setT({ ...t, [k]: Math.max(0, +e.target.value) })} className="h-9 w-full" /><span className="text-muted-foreground">{u}</span></div></label>
  return <div className="space-y-4">
    <div><h1 className="text-xl font-bold tracking-tight">Ernährungsplan</h1><p className="text-sm text-muted-foreground">Tages- oder Wochenplan aus Fertiggerichten {myChains.size ? `deiner ${myChains.size} Shops` : 'aller Anbieter (noch keine „Meine Shops“ gewählt)'} – mit Einkaufsliste.</p></div>
    <Card className="flex flex-wrap items-start gap-2 p-3 text-xs shadow-none"><ShieldCheck className="size-4 shrink-0 text-emerald-600" /><div className="flex-1 space-y-1"><p>Deine Ziele bleiben ausschließlich in diesem Browser (localStorage). Kein Server, keine Analyse, nichts in der URL. Keine medizinische Beratung.</p><p className="text-amber-700 dark:text-amber-400">Achtung KI: Gibst du Ziele an einen KI-Assistenten weiter (z. B. MCP-Tool <code>build_meal_plan</code>), werden sie Tool-Argumente und können beim Cloud-KI-Anbieter landen – Gesundheitsdaten nach Art. 9 DSGVO. Deine Wahl; standardmäßig wird nichts gesendet.</p></div><Button size="sm" variant="outline" onClick={() => { if (confirm('Ziele, Gewichtung und Meine Shops in diesem Browser löschen?')) { ['fg-goals', 'fg-scorecfg2', 'fg-myshops', 'fg-loc', 'fg-geocache'].forEach(k => localStorage.removeItem(k)); location.reload() } }}><Trash2 className="size-4" />Daten löschen</Button></Card>
    <Card className="grid grid-cols-2 gap-3 p-3 shadow-none sm:grid-cols-3 lg:grid-cols-5">
      <label className="space-y-1 text-xs"><span className="font-medium">Zeitraum</span><div className="flex gap-1"><Button size="sm" active={t.days === 1} onClick={() => setT({ ...t, days: 1 })}>Tag</Button><Button size="sm" active={t.days === 7} onClick={() => setT({ ...t, days: 7 })}>Woche</Button></div></label>
      {num('meals_per_day', 'Mahlzeiten/Tag', '×')}{num('kcal_target', 'Energie-Ziel', 'kcal', 50)}{num('protein_target_g', 'Protein-Ziel', 'g', 5)}{num('budgetPerDay', 'Budget', '€/Tag', 0.5)}
      {num('salt_max_g', 'Salz max.', 'g', 0.5)}{num('satfat_max_g', 'Ges. Fett max.', 'g', 1)}{num('sugar_max_g', 'Zucker max.', 'g', 5)}{num('fiber_target_g', 'Ballaststoffe', 'g', 1)}
      <div className="flex flex-wrap items-end gap-3 pb-2 text-xs">{(['vegan', 'vegetarian', 'bio'] as const).map(k => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={!!t[k]} onChange={e => setT({ ...t, [k]: e.target.checked })} />{k === 'vegetarian' ? 'vegetarisch' : k === 'bio' ? 'Bio' : 'vegan'}</label>)}</div>
      <div className="col-span-2 space-y-1 text-xs sm:col-span-3 lg:col-span-5"><span className="font-medium">Allergene ausschließen</span><div className="flex flex-wrap gap-x-3 gap-y-1">{ALLERGENS.map(([c, l]) => <label key={c} className="flex items-center gap-1"><input type="checkbox" checked={!!t.allergens?.includes(c)} onChange={e => setT({ ...t, allergens: e.target.checked ? [...(t.allergens ?? []).filter(x => /^[A-R]$/.test(x)), c] : (t.allergens ?? []).filter(x => x !== c) })} />{l} ({c})</label>)}</div>{!!t.allergens?.length && <span className="text-[10px] text-amber-700">Gerichte ohne Allergen-Angabe werden dann sicherheitshalber ausgeschlossen (Angaben bisher nur für einen Teil der Produkte). Immer die Packung prüfen.</span>}</div>
    </Card>
    <Card className="space-y-3 p-3 shadow-none"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Gewichtung (lokal)</h2><Button size="sm" variant="ghost" onClick={() => setCfg(DEFAULT_CFG)}>Standard</Button></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><div className="mb-2 flex justify-between text-xs"><span>Mindest-Score (Rankings)</span><span>≥ {cfg.minScore}</span></div><Slider min={0} max={70} step={5} value={[cfg.minScore]} onValueChange={v => setCfg({ minScore: v[0] })} aria-label="Mindest-Score" /></div>
        <div><div className="mb-2 flex justify-between text-xs"><span>Mindest-kcal pro Portion</span><span>≥ {cfg.minKcal}</span></div><Slider min={400} max={900} step={25} value={[cfg.minKcal]} onValueChange={v => setCfg({ minKcal: v[0] })} aria-label="Mindest-kcal" /></div>
        <div className="hidden sm:block" />
        <div><div className="mb-2 flex justify-between text-xs"><span>Gesundheit vs. Preis</span><span>{Math.round(cfg.wHealth * 100)} / {Math.round((1 - cfg.wHealth) * 100)}</span></div><Slider min={0} max={1} step={0.05} value={[cfg.wHealth]} onValueChange={v => setCfg({ wHealth: v[0] })} aria-label="Gesundheit vs. Preis" /></div>
        <div><div className="mb-2 flex justify-between text-xs"><span>Deckel Protein pro €</span><span>{cfg.ppeCap} g/€</span></div><Slider min={5} max={40} step={1} value={[cfg.ppeCap]} onValueChange={v => setCfg({ ppeCap: v[0] })} aria-label="Deckel Protein pro Euro" /></div>
        <div><div className="mb-2 flex justify-between text-xs"><span>Gewicht Zucker im Score</span><span>×{cfg.sugarW.toFixed(1)}</span></div><Slider min={0} max={2} step={0.1} value={[cfg.sugarW]} onValueChange={v => setCfg({ sugarW: v[0] })} aria-label="Gewicht Zucker" /></div>
      </div><p className="text-[11px] text-muted-foreground">Standard: 50/50, 20 g/€, Score ≥ 30, ≥ 400 kcal. Harte Grenze für alle Rankings: 400–900 kcal und ≥ 20 g Protein pro Portion. Preis-Leistung = w·Score + (1−w)·min(Protein pro € ÷ Deckel, 1)·100 – dieselbe Formel in Ranking, Hofer Top 30, Plan und KI-Ansicht. Score = Health Score v2 aus den Daten; der Zucker-Teil (score_parts.sugar) wird mit dem Gewicht skaliert (×1 = unverändert).</p></Card>
    {plan.note ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{plan.note}</p> : <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">{plan.days.map(d => <Card key={d.day} className="p-3 shadow-none"><div className="mb-1 flex justify-between text-sm font-semibold"><span>{t.days > 1 ? `Tag ${d.day}` : 'Heute'}</span><span className="font-normal text-muted-foreground">{fmt(d.kcal, 0)}/{t.kcal_target} kcal · {fmt(d.protein, 0)}/{t.protein_target_g} g Protein · Salz {fmt(d.salt, 1)}/{t.salt_max_g} g · Zucker {fmt(d.sugar, 0)}/{t.sugar_max_g} g · {fmt(d.cost, 2)} €</span></div>
        {d.meals.map((m, i) => <button key={i} onClick={() => open(m.id)} className="flex w-full items-center gap-2 border-t py-2 text-left text-sm hover:bg-muted/50"><StoreLogo store={m.store} size={18} /><span className="min-w-0 flex-1 truncate">{m.name}</span><span className="shrink-0 text-xs text-muted-foreground">{fmt(m.kcal, 0)} kcal · {fmt(m.protein, 0)} g · {fmt(m.price, 2)} €</span><OldPriceBadge r={{ price: m.priceRaw, price_date: m.price_date, pstat: m.pstat }} /></button>)}</Card>)}
        <p className="text-[11px] text-muted-foreground">{plan.candidates} passende Fertiggerichte. Nährwerte je Portion aus day_pct (Referenz 2000 kcal/50 g Protein/6 g Salz/20 g ges. Fett/90 g Zucker/30 g Ballaststoffe). Packungsrest wird nicht eingeplant.</p></div>
      <Card className="h-fit p-3 shadow-none"><div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-semibold"><ShoppingCart className="size-4" />Einkaufsliste</h2><Button size="sm" variant="ghost" onClick={() => print()}><Printer className="size-4" /></Button></div>
        {plan.shopping.map(s => <div key={s.id} className="flex items-center gap-2 border-t py-1.5 text-sm"><StoreLogo store={s.store} size={16} /><span className="w-6 text-right font-semibold">{s.qty}×</span><span className="min-w-0 flex-1 truncate">{s.name}</span><span className="text-xs">{fmt(s.cost, 2)} €</span></div>)}
        <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold"><span>Summe (ganze Packungen)</span><span>{fmt(plan.totals.cost, 2)} €</span></div></Card>
    </div>}
  </div>
}
