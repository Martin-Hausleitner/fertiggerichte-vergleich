import { useMemo, useState } from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import { Img } from '@/components/product'
import { useApp, fmt, scoreColor, type Row } from '@/lib'
import { isReadyMeal, pricePerPortion, portionEstimated } from '@/app/meal'
import { valueScore, rankOk } from '@/app/scoring'

const MIN = 5 // Mindestanzahl bewertbarer Produkte, damit eine Kategorie angezeigt wird
const catOf = (r: Row) => r.cdish?.[0] ?? r.cprot?.[0] ?? 'Sonstige'

export default function HoferTop30() {
  const { D, open } = useApp()
  const [allFood, setAllFood] = useState(false)
  const hofer = useMemo(() => D.rows.filter(r => r.store === 'Hofer' && (allFood ? !r.nonfood : isReadyMeal(r))), [D, allFood])
  const ok = useMemo(() => hofer.filter(r => rankOk(r)).map(r => ({ r, v: valueScore(r)! })).filter(x => x.v != null), [hofer])
  const cats = useMemo(() => { const m: Record<string, { r: Row; v: number }[]> = {}; ok.forEach(x => (m[catOf(x.r)] ??= []).push(x)); return Object.entries(m).map(([c, xs]) => [c, xs.sort((a, b) => b.v - a.v).slice(0, 30)] as const).sort((a, b) => b[1].length - a[1].length) }, [ok])
  const shown = cats.filter(([, xs]) => xs.length >= MIN), thin = cats.filter(([, xs]) => xs.length < MIN)
  const allH = D.rows.filter(r => r.store === 'Hofer' && !r.nonfood), noPrice = allH.filter(r => r.price == null).length
  const old = ok.filter(x => x.r.pstat !== 'live 2026').length
  return <div className="space-y-4">
    <div><h1 className="text-xl font-bold tracking-tight">Hofer Top 30</h1><p className="text-sm text-muted-foreground">Die besten Hofer-Fertiggerichte je Kategorie nach Gesundheit pro Euro und Portion.</p></div>
    <Card className="space-y-2 p-4 text-sm shadow-none">
      <h2 className="flex items-center gap-1.5 font-semibold"><Info className="size-4" />Methode</h2>
      <p><b>Preis-Leistung = 50 % × Health-Score + 50 % × min(Protein pro € ÷ 20 g/€, 1) × 100</b> – dieselbe Formel wie überall in der App (Ranking, Heute, Ernährungsplan, KI-Ansicht). Protein pro € = Protein je Portion ÷ Preis je Portion. Gewichtung und Deckel sind im Ernährungsplan lokal einstellbar.</p>
      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
        <li>Health-Score 0–100 wie im Rest der App (Protein, Ballaststoffe, Gemüse positiv; Salz, gesättigte Fette, Verarbeitung negativ – siehe „Methodik & Quellen“).</li>
        <li>Nur vollwertige Fertiggerichte: 400–900 kcal und ≥ 20 g Protein pro Portion, Health-Score ≥ 30. Ausgeschlossen: Rohzutaten, Beilagen, Trockenprodukte, Desserts, Snacks (Brote, Burger, Baguettes, Toast, Instant-Nudeln).</li><li>Nur mit vollständigem Score, echtem Preis und bekannter Portionsgröße. Keine Schätzungen, keine Ersatzwerte.</li><li>Preis pro Portion = Packungspreis × Portion ÷ Packungsgröße. Großpackungen ≥ 800 g ohne Portionsangabe werden in ~400-g-Portionen geteilt (als „geschätzt“ markiert).</li>
        <li>Kategorie = erste Gerichtsart (z. B. Pasta, Curry), sonst Proteinart. Kategorien mit weniger als {MIN} bewertbaren Produkten werden nicht gerankt.</li>
        <li>Maximal 30 Produkte je Kategorie, absteigend nach Wert.</li>
      </ul>
    </Card>
    <Card className="flex gap-2 border-amber-300 bg-amber-50 p-4 text-sm shadow-none dark:bg-amber-950/30">
      <AlertTriangle className="size-5 shrink-0 text-amber-600" />
      <div><b>Hofer: unvollständig.</b> Insgesamt {allH.length} Hofer-Produkte, davon {noPrice} ohne Preis. {hofer.length} Hofer-{allFood ? 'Produkte' : 'Fertiggerichte'} erfasst, davon nur <b>{ok.length}</b> mit vollständigem Score, Preis und Portion{old > 0 && <> ({old} davon mit Preisstand 2025)</>}. {shown.length === 0 ? 'Für keine Kategorie reichen die Daten für ein faires Ranking – daher wird keine Rangliste angezeigt.' : `${shown.length} Kategorien erfüllen die Mindestanzahl.`} Die Hofer-Daten werden gerade ergänzt.</div>
    </Card>
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={allFood} onChange={e => setAllFood(e.target.checked)} />auch normale Lebensmittel zeigen</label>
    {shown.map(([c, xs]) => <Card key={c} className="p-3 shadow-none"><h2 className="mb-2 font-semibold">{D.catIcon[c] ?? ''} {c} <Badge>{xs.length}</Badge></h2>
      <ol className="divide-y">{xs.map(({ r, v }, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50">
        <span className="w-6 text-right font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-11 rounded" />
        <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-medium">{r.name}</span><span className="text-xs text-muted-foreground">Score <b style={{ color: scoreColor(r.score) }}>{fmt(r.score, 0)}</b> · {fmt(pricePerPortion(r), 2)} €/Portion · {r.pstat ?? 'Preisstand unbekannt'}{portionEstimated(r) && ' · Portion geschätzt'}</span></span>
        <span className="text-right text-sm font-bold">{fmt(v, 0)}<span className="block text-[10px] font-normal text-muted-foreground">Wert</span></span></button></li>)}</ol></Card>)}
    {thin.length > 0 && <p className="text-xs text-muted-foreground">Zu wenig Daten (nicht gerankt): {thin.map(([c, xs]) => `${c} (${xs.length})`).join(', ')}</p>}
  </div>
}
