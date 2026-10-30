import { useMemo, useState } from 'react'
import { Clock, MapPin, Truck, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { Img, StoreLogo, ScoreBar } from '@/components/product'
import { useApp, fmt, fmtDist, useHashState, type Row } from '@/lib'
import { VariantNote, PriceCondition, PriceWinnerBadge } from '@/components/RowNotes'
import { useNearShops, isPetrolShop, type NearShop } from '@/app/shops'
import { openNow, viennaDayMin } from '@/app/hours'
import { pricePerPortion, lastPriceDate, passesLightRank, portionG } from '@/app/meal'

const packPortions = (r: Row) => {
  const por = portionG(r) ?? r.portion ?? r.size
  return r.size && por && Math.round(r.size / por) >= 2 ? Math.round(r.size / por) : 1
}
const pliOf = (r: Row) => r.pli ?? r.pliLight ?? valueScore(r)
import { valueScore, rankOk } from '@/app/scoring'
import { OldPriceBadge } from '@/components/PriceAge'

export default function Heute() {
  const { R, open, D } = useApp(); const { all, loc, deliversHere, online } = useNearShops(); const [maxMin, setMaxMin] = useState(10); const [mode, setMode] = useState<'hc' | 'pli' | 'h'>('hc')
  const now = new Date(); const sunday = viennaDayMin(now).day === 6 // Mo=0 … So=6, Europe/Vienna (SC83 P3)
  const shops = useMemo(() => all.filter(s => s.walkMin <= maxMin).map(s => ({ ...s, open: openNow(s.hours, now) })), [all, maxMin])
  const fullShop = (s: NearShop) => s.hasProducts && !isPetrolShop(s)
  const openShops = shops.filter(s => s.open && fullShop(s))
  /** SC62 P3.1: Sind alle Filialen im Radius zu (Sonntag/abends), Top-Listen trotzdem für den nächsten Einkauf zeigen. */
  const closedMode = openShops.length === 0
  const pool = closedMode ? shops.filter(fullShop) : openShops
  const best: Record<string, NearShop> = {}; pool.forEach(s => { if (!best[s.chain] || s.d < best[s.chain].d) best[s.chain] = s })
  const cap = D.topCap; const [nl, setNl] = useHashState<string>('nolimit', ''); const unl = nl === '1'; const [, setTab] = useHashState<string>('tab', 'heute')
  /** Wie die Top-Listen: standardmäßig max. topCap.perProvider Gerichte je Anbieter, „ohne Limit“ schaltet das ab. */
  const capFilter = () => { const n: Record<string, number> = {}; return (x: { r: { store: string } }) => unl || !cap ? true : (n[x.r.store] = (n[x.r.store] ?? 0) + 1) <= cap.perProvider }
  const modeOk = (r: Row) => mode === 'hc' ? (r.score ?? 0) >= 45 : true
  const sortItems = (a: { r: Row }, b: { r: Row }) => mode === 'h'
    ? ((b.r.score ?? 0) - (a.r.score ?? 0)) || ((valueScore(b.r) ?? 0) - (valueScore(a.r) ?? 0))
    : ((valueScore(b.r) ?? 0) - (valueScore(a.r) ?? 0)) || ((b.r.score ?? 0) - (a.r.score ?? 0))
  const top = useMemo(() => R.filter(r => rankOk(r) && modeOk(r) && best[r.store])
    .map(r => ({ r, pp: pricePerPortion(r)!, shop: best[r.store] })).sort(sortItems).filter(capFilter()).slice(0, 10), [R, pool.length, closedMode, maxMin, unl, mode])
  const light = useMemo(() => R.filter(r => passesLightRank(r) && modeOk(r) && best[r.store])
    .map(r => ({ r, pp: pricePerPortion(r)!, shop: best[r.store] })).sort(sortItems).slice(0, 10), [R, pool.length, closedMode, maxMin, mode])
  const updated = lastPriceDate(R)
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold tracking-tight">Was kaufe ich heute?</h1>
      <p className="text-sm text-muted-foreground"><MapPin className="inline size-4" /> ab {loc.addr} · {now.toLocaleString('de-AT', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })}{updated && <> · Preise zuletzt aktualisiert {new Date(updated).toLocaleDateString('de-AT')}</>}</p></div>
    <div className="flex flex-wrap items-center gap-2 text-sm">Gehzeit bis {[5, 10, 15, 20].map(m => <Button key={m} size="sm" active={maxMin === m} onClick={() => setMaxMin(m)}>≤ {m} min</Button>)}<div className="flex flex-wrap items-center gap-1 ml-auto" data-testid="heute-mode">{([['hc', '🥇 Gesund & günstig'], ['pli', '🏆 Preis-Leistung'], ['h', '💚 Gesündeste']] as const).map(([v, l]) => <Button key={v} size="sm" active={mode === v} data-testid={`heute-mode-${v}`} onClick={() => setMode(v)}>{l}</Button>)}</div></div>
    {(sunday || openShops.length === 0) && <Card className="flex gap-2 border-amber-300 bg-amber-50 p-3 text-sm shadow-none dark:bg-amber-950/30"><AlertTriangle className="size-5 shrink-0 text-amber-600" />
      <div><b>{sunday ? 'Sonntag: Supermärkte haben in Österreich geschlossen.' : `Gerade hat keine Filiale in ≤ ${maxMin} Gehminuten offen.`}</b> Ausnahmen (Bahnhof, Tankstelle, Feiertage) sind nicht erfasst. Online-Anbieter: {online.map(p => `${p}${deliversHere(p) === false ? ' (nicht lieferbar nach Linz)' : deliversHere(p) == null ? ' (Lieferung nach Linz unbestätigt)' : ''}`).join(', ')}. Liefergebiet laut offizieller Versand-/Liefergebietsseite des Anbieters. <button type="button" className="font-medium text-amber-800 underline underline-offset-2 dark:text-amber-300" data-testid="goto-online" onClick={() => setTab('online')}>→ Online-Anbieter für Linz vergleichen</button></div></Card>}
    <div className="flex flex-wrap gap-2">{shops.filter(s => s.hasProducts).map(s => <Badge key={s.id} className={"gap-1.5 py-1" + (s.rankableCount === 0 ? " opacity-75" : "")} title={(s.addr ? `${s.addr} — ` : "") + (isPetrolShop(s) ? "Tankstellenshop (eingeschränktes Sortiment, nicht als Voll-Supermarkt gezählt)" : s.rankableCount === 0 ? "In der Nähe, aber aktuell 0 Gerichte mit vollständigem Preis & Score im Ranking" : `${s.rankableCount} Gerichte im Ranking (${s.productCount} erfasst)`)}><StoreLogo store={s.chain} size={14} />{s.name}{s.addr ? ` · ${s.addr.split(',')[0].replace(/\s*\(Tankstellenshop\)\s*$/, '')}` : ""}{isPetrolShop(s) && <span className="text-muted-foreground" data-testid="petrol-shop"> (Tankstellenshop)</span>} · ~{s.walkMin} min · <span data-testid="heute-shop-rank" className={isPetrolShop(s) ? "text-amber-700 dark:text-amber-300" : s.rankableCount > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>{isPetrolShop(s) ? "eingeschränktes Sortiment" : s.rankableCount > 0 ? `${s.rankableCount} im Ranking` : "0 im Ranking"}</span> · <span className={s.open ? 'text-emerald-600' : s.open === false ? 'text-red-600' : 'text-muted-foreground'}>{s.open ? 'offen' : s.open === false ? 'geschlossen' : 'Zeiten unbekannt'}</span></Badge>)}</div>
    <p className="text-xs text-muted-foreground">{shops.filter(s => !s.hasProducts).length} weitere Geschäfte in ≤ {maxMin} min (Bäckereien, Nahversorger …) – ohne Produktdaten. Gehzeiten geschätzt (Luftlinie × 1,3).</p>
    {top.length > 0 && <Card className="p-3 shadow-none"><h2 className="mb-1 flex items-center gap-1.5 font-semibold"><Clock className="size-4" />{closedMode ? 'Top 10 für deinen nächsten Einkauf (aktuell geschlossen)' : 'Top 10 jetzt erhältlich'}{cap && <label className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground" data-testid="nolimit" title={`Standard: höchstens ${cap.perProvider} Gerichte je Anbieter`}><input type="checkbox" checked={unl} onChange={e => setNl(e.target.checked ? '1' : '')} />ohne Limit</label>}</h2>
      {closedMode && <p className="mb-1 text-xs text-amber-700" data-testid="closed-banner">Alle Filialen in ≤ {maxMin} min haben gerade geschlossen. Die Liste zeigt, was du beim nächsten Einkauf dort holen kannst.</p>}
      <ol className="divide-y">{top.map(({ r, pp, shop }, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50">
        <span className="w-6 text-right font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-12 shrink-0 rounded" />
        <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium">{r.name}</span><VariantNote r={r} />
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><StoreLogo store={r.store} size={14} />{shop.name}{shop.addr ? `, ${shop.addr}` : ''} · ~{shop.walkMin} min ({fmtDist(shop.d)}) · {fmt(pp, 2)} €/Portion{packPortions(r) >= 2 && r.price != null && <span data-testid="heute-pack-price" className="text-muted-foreground"> (Packung {fmt(r.price, 2)} €)</span>} <OldPriceBadge r={r} /><PriceCondition r={r} /><PriceWinnerBadge r={r} />
            <span className="rounded border px-1 text-[10px]" title="Sortiment der Kette; nicht für diese Filiale bestätigt">Kette führt es</span></span></span>
        <span className="flex items-center gap-1.5 shrink-0"><span data-testid="heute-pli" className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 tabular-nums" title="Preis-Leistungs-Index (50 % Health-Score + 50 % Protein pro €)">PLI {fmt(pliOf(r), 1)}</span><span className="w-24 sm:w-32"><ScoreBar r={r} /></span></span></button></li>)}</ol>
      <p className="mt-2 text-[11px] text-muted-foreground">Sortiert nach Preis-Leistung je Portion (Standard: 50 % Health-Score, 50 % Protein pro €; im Ernährungsplan einstellbar). Nur vollwertige Fertiggerichte (400–900 kcal, ≥ 20 g Protein pro Portion, Score ≥ Mindestwert) mit echtem Preis und Laden. „Kette führt es“ = im Online-Sortiment der Kette; ob die konkrete Filiale es vorrätig hat, ist nicht bestätigt.</p></Card>}
    {light.length > 0 && <Card className="p-3 shadow-none" data-testid="light-meals"><h2 className="mb-1 font-semibold">Leichte Mahlzeiten{closedMode ? ' (nächster Einkauf, aktuell geschlossen)' : ''}</h2>
      <ol className="divide-y">{light.map(({ r, pp, shop }, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50">
        <span className="w-6 text-right font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-10 shrink-0 rounded" />
        <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium">{r.name}</span><VariantNote r={r} />
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><StoreLogo store={r.store} size={14} />{shop.name}{shop.addr ? `, ${shop.addr}` : ""} · ~{shop.walkMin} min ({fmtDist(shop.d)}) · {fmt(pp, 2)} €/Portion{packPortions(r) >= 2 && r.price != null && <span data-testid="heute-pack-price" className="text-muted-foreground"> (Packung {fmt(r.price, 2)} €)</span>} <OldPriceBadge r={r} /></span></span>
        <span className="flex items-center gap-1.5 shrink-0"><span data-testid="heute-pli" className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 tabular-nums" title="Preis-Leistungs-Index (50 % Health-Score + 50 % Protein pro €)">PLI {fmt(pliOf(r), 1)}</span><span className="w-24 sm:w-32"><ScoreBar r={r} /></span></span></button></li>)}</ol>
      <p className="mt-2 text-[11px] text-muted-foreground">Eigenes Ranking für leichte Mahlzeiten (250–399 kcal ab 15 g Protein sowie Gerichte ab 400 kcal mit 15–19,9 g Protein): gleiche Preis-Leistungs-Formel und Score ≥ Mindestwert, getrennt von den vollwertigen 400-kcal-/20-g-Protein-Hauptgerichten oben.</p></Card>}
    <Card className="flex items-center justify-between gap-2 p-3 text-sm shadow-none"><span><Truck className="mr-1 inline size-4" />Mehr Auswahl: alle Fertiggerichte filtern oder eigene Shops festlegen.</span>
      <span className="flex gap-2"><Button size="sm" onClick={() => { location.hash = 'tab=tabelle' }}>Alle filtern <ArrowRight className="size-4" /></Button><Button size="sm" onClick={() => { location.hash = 'tab=meine-shops' }}>Meine Shops</Button></span></Card>
  </div>
}
