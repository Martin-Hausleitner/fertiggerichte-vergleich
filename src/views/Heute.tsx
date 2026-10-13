import { useMemo, useState } from 'react'
import { Clock, MapPin, Truck, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { Img, StoreLogo, ScoreBar } from '@/components/product'
import { useApp, fmt, fmtDist } from '@/lib'
import { useNearShops, ONLINE, type NearShop } from '@/app/shops'
import { openNow } from '@/app/hours'
import { pricePerPortion, lastPriceDate } from '@/app/meal'
import { valueScore, rankOk } from '@/app/scoring'

export default function Heute() {
  const { R, open } = useApp(); const { all, loc, deliversHere } = useNearShops(); const [maxMin, setMaxMin] = useState(10)
  const now = new Date(); const sunday = now.getDay() === 0
  const shops = useMemo(() => all.filter(s => s.walkMin <= maxMin).map(s => ({ ...s, open: openNow(s.hours, now) })), [all, maxMin])
  const openShops = shops.filter(s => s.open && s.hasProducts)
  const best: Record<string, NearShop> = {}; openShops.forEach(s => { if (!best[s.chain] || s.d < best[s.chain].d) best[s.chain] = s })
  const top = useMemo(() => R.filter(r => rankOk(r) && best[r.store])
    .map(r => ({ r, pp: pricePerPortion(r)!, shop: best[r.store] })).sort((a, b) => (valueScore(b.r) ?? 0) - (valueScore(a.r) ?? 0)).slice(0, 10), [R, openShops.length, maxMin])
  const updated = lastPriceDate(R)
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold tracking-tight">Was kaufe ich heute?</h1>
      <p className="text-sm text-muted-foreground"><MapPin className="inline size-4" /> ab {loc.addr} · {now.toLocaleString('de-AT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}{updated && <> · Preise zuletzt aktualisiert {new Date(updated).toLocaleDateString('de-AT')}</>}</p></div>
    <div className="flex flex-wrap items-center gap-2 text-sm">Gehzeit bis {[5, 10, 15, 20].map(m => <Button key={m} size="sm" active={maxMin === m} onClick={() => setMaxMin(m)}>≤ {m} min</Button>)}</div>
    {(sunday || openShops.length === 0) && <Card className="flex gap-2 border-amber-300 bg-amber-50 p-3 text-sm shadow-none dark:bg-amber-950/30"><AlertTriangle className="size-5 shrink-0 text-amber-600" />
      <div><b>{sunday ? 'Sonntag: Supermärkte haben in Österreich geschlossen.' : `Gerade hat keine Filiale in ≤ ${maxMin} Gehminuten offen.`}</b> Ausnahmen (Bahnhof, Tankstelle, Feiertage) sind nicht erfasst. Online-Anbieter: {ONLINE.map(p => `${p}${deliversHere(p) === false ? ' (nicht lieferbar nach Linz)' : ''}`).join(', ')}. Liefergebiet nur für Gurkerl geprüft.</div></Card>}
    <div className="flex flex-wrap gap-2">{shops.filter(s => s.hasProducts).map(s => <Badge key={s.id} className="gap-1.5 py-1"><StoreLogo store={s.chain} size={14} />{s.name} · ~{s.walkMin} min · <span className={s.open ? 'text-emerald-600' : s.open === false ? 'text-red-600' : 'text-muted-foreground'}>{s.open ? 'offen' : s.open === false ? 'geschlossen' : 'Zeiten unbekannt'}</span></Badge>)}</div>
    <p className="text-xs text-muted-foreground">{shops.filter(s => !s.hasProducts).length} weitere Geschäfte in ≤ {maxMin} min (Bäckereien, Nahversorger …) – ohne Produktdaten. Gehzeiten geschätzt (Luftlinie × 1,3).</p>
    {top.length > 0 && <Card className="p-3 shadow-none"><h2 className="mb-1 flex items-center gap-1.5 font-semibold"><Clock className="size-4" />Top 10 jetzt erhältlich</h2>
      <ol className="divide-y">{top.map(({ r, pp, shop }, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50">
        <span className="w-6 text-right font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-12 shrink-0 rounded" />
        <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium">{r.name}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><StoreLogo store={r.store} size={14} />{shop.name}{shop.addr ? `, ${shop.addr}` : ''} · ~{shop.walkMin} min ({fmtDist(shop.d)}) · {fmt(pp, 2)} €/Portion
            <span className="rounded border px-1 text-[10px]" title="Sortiment der Kette; nicht für diese Filiale bestätigt">Kette führt es</span></span></span>
        <span className="w-24 shrink-0 sm:w-32"><ScoreBar r={r} /></span></button></li>)}</ol>
      <p className="mt-2 text-[11px] text-muted-foreground">Sortiert nach Preis-Leistung je Portion (Standard: 50 % Health-Score, 50 % Protein pro €; im Ernährungsplan einstellbar). Nur vollwertige Fertiggerichte (400–900 kcal, ≥ 20 g Protein pro Portion, Score ≥ Mindestwert) mit echtem Preis und Laden. „Kette führt es“ = im Online-Sortiment der Kette; ob die konkrete Filiale es vorrätig hat, ist nicht bestätigt.</p></Card>}
    <Card className="flex items-center justify-between gap-2 p-3 text-sm shadow-none"><span><Truck className="mr-1 inline size-4" />Mehr Auswahl: alle Fertiggerichte filtern oder eigene Shops festlegen.</span>
      <span className="flex gap-2"><Button size="sm" onClick={() => { location.hash = 'tab=tabelle' }}>Alle filtern <ArrowRight className="size-4" /></Button><Button size="sm" onClick={() => { location.hash = 'tab=meine-shops' }}>Meine Shops</Button></span></Card>
  </div>
}
