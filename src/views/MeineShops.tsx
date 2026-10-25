import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Star, MapPin, Truck, Info } from 'lucide-react'
import { Card, Badge, Button, Select } from '@/components/ui'
import { StoreLogo, Img, ScoreBar } from '@/components/product'
import { useApp, fmt, fmtDist, cn, STORE_LOGO, scoreColor, type Row } from '@/lib'
import { toggleMyShop, fmtR, setLoc, RADII } from '@/app/location'
import { useNearShops, onlineId, typeLabel, deliveryText, deliveryTitle, isRowRankable } from '@/app/shops'
import { isReadyMeal, pricePerPortion, passesRankMin, passesLightRank } from '@/app/meal'
import { OldPriceBadge } from '@/components/PriceAge'

const COL: Record<string, string> = { Billa: '#facc15', Spar: '#16a34a', Hofer: '#1d4ed8', Lidl: '#0050aa', Penny: '#dc2626', dm: '#e11d48' }

function ShopMap() {
  const { inR, my, loc } = useNearShops(); const ref = useRef<HTMLDivElement>(null); const map = useRef<L.Map | null>(null); const layer = useRef<L.LayerGroup | null>(null)
  useEffect(() => {
    if (!ref.current || map.current) return
    const m = L.map(ref.current, { scrollWheelZoom: false }); map.current = m
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap-Mitwirkende', maxZoom: 19 }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    return () => { m.remove(); map.current = null }
  }, [])
  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return
    g.clearLayers()
    L.circle([loc.lat, loc.lon], { radius: loc.radius, color: '#059669', weight: 1, fillOpacity: 0.06 }).addTo(g)
    L.marker([loc.lat, loc.lon], { icon: L.divIcon({ className: '', html: '<div style="font-size:24px;line-height:24px">📍</div>', iconSize: [24, 24], iconAnchor: [12, 22] }) }).addTo(g).bindPopup(`<b>Deine Adresse</b><br>${loc.addr}`)
    inR.forEach(s => {
      const on = my.includes(s.id), logo = s.hasProducts ? STORE_LOGO[s.chain] : undefined
      const html = `<div style="background:#fff;border:${on ? 3 : 2}px solid ${on ? '#059669' : COL[s.chain] ?? '#64748b'};border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.3);width:46px;height:26px;display:flex;align-items:center;justify-content:center;position:relative">${logo ? `<img src="${logo}" style="width:38px;height:16px;object-fit:contain"/>` : `<b style="font-size:8px;overflow:hidden;white-space:nowrap;max-width:42px">${s.name.slice(0, 9)}</b>`}${on ? '<span style="position:absolute;top:-9px;right:-9px;font-size:14px">⭐</span>' : ''}</div>`
      const mk = L.marker([s.lat, s.lon], { icon: L.divIcon({ className: '', html, iconSize: [46, 26], iconAnchor: [23, 13] }) }).addTo(g)
      const div = document.createElement('div')
      div.innerHTML = `<b>${s.name}</b><br>${s.addr ?? ''}<br>${s.hasProducts ? '' : typeLabel(s.type) + ' · keine Produktdaten<br>'}~${s.walkMin} min zu Fuß (${fmtDist(s.d)})${s.hours ? `<br><small>${s.hours}</small>` : ''}<br>`
      const b = document.createElement('button'); b.textContent = on ? '★ aus Meine Shops entfernen' : '☆ zu Meine Shops'; b.style.cssText = 'margin-top:4px;color:#047857;font-weight:600'
      b.onclick = () => { toggleMyShop(s.id); m.closePopup() }; div.appendChild(b); mk.bindPopup(div)
    })
    m.fitBounds(L.latLng(loc.lat, loc.lon).toBounds(loc.radius * 2.1))
  }, [inR, my, loc])
  return <div ref={ref} className="h-[340px] w-full overflow-hidden rounded-xl border sm:h-[440px]" role="region" aria-label="Karte der Shops" />
}

export default function MeineShops() {
  const { R, open } = useApp()
  const { inR, all, my, myChains, loc, deliversHere, online, countsByChain, rankableByChain } = useNearShops()
  const [allFood, setAllFood] = useState(false), [minScore, setMinScore] = useState(0), [gang, setGang] = useState('haupt'), [chain, setChain] = useState('')
  const ranking = useMemo(() => R.filter(r => (allFood ? !r.nonfood : isReadyMeal(r)) && (allFood ? r.score != null && r.price != null : isRowRankable(r as any)) && myChains.has(r.store) && (!gang || (r as any).gang === gang) && (r.score ?? 0) >= minScore && (!chain || r.store === chain))
    .sort((a, b) => (b.score! - a.score!) || ((a.p100g ?? 1e9) - (b.p100g ?? 1e9))).slice(0, 200), [R, myChains, gang, minScore, chain, allFood])
  const perChain = useMemo(() => [...myChains].map(c => { const xs = R.filter(r => r.store === c && (allFood ? r.score != null : isRowRankable(r as any)) && (allFood ? !r.nonfood : isReadyMeal(r)) && (!gang || (r as any).gang === gang)); const sc = xs.map(r => r.score!).sort((a, b) => a - b); return { c, n: xs.length, med: sc.length ? sc[Math.floor(sc.length / 2)] : null, best: sc.length ? sc[sc.length - 1] : null } }).sort((a, b) => (b.med ?? -1) - (a.med ?? -1)), [R, myChains, gang, allFood])
  const outside = all.length - inR.length
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><h1 className="text-xl font-bold tracking-tight">Meine Shops</h1>
        <p className="text-sm text-muted-foreground"><MapPin className="inline size-4" /> {loc.addr} · Umkreis {fmtR(loc.radius)} · {inR.length} Filialen in der Nähe</p></div>
      <Select value={loc.radius} onChange={e => setLoc({ ...loc, radius: +e.target.value })} aria-label="Umkreis">{RADII.map(r => <option key={r} value={r}>Umkreis {fmtR(r)}</option>)}</Select>
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <ShopMap />
      <Card className="flex max-h-[440px] flex-col p-0 shadow-none">
        <div className="border-b p-3 text-sm font-semibold">Filialen im Umkreis <span className="font-normal text-muted-foreground">– tippen zum Markieren</span></div>
        <div className="flex-1 overflow-y-auto">
          {inR.length === 0 && <p className="p-4 text-sm text-muted-foreground">Keine Filialen im Umkreis. Vergrößere den Umkreis.{outside > 0 && ` (${outside} bekannte Filialen liegen weiter weg.)`}</p>}
          {inR.map(s => { const on = my.includes(s.id); return <button key={s.id} onClick={() => toggleMyShop(s.id)} aria-pressed={on} className={cn('flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/60', on && 'bg-emerald-50 dark:bg-emerald-950/40')}>
            <StoreLogo store={s.chain} size={24} /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span><span className="block truncate text-xs text-muted-foreground">{s.type !== 'chain' && `${typeLabel(s.type)} · `}{s.addr ? `${s.addr} · ` : ''}~{s.walkMin} min ({fmtDist(s.d)}){!s.hasProducts ? ' · keine Produktdaten' : s.rankableCount > 0 ? <span data-testid="shop-rank-badge" className="ml-1 inline-block rounded bg-emerald-100 px-1 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">Im Vergleich ({s.rankableCount} im Ranking · {s.productCount} erfasst)</span> : s.productCount > 0 && <span data-testid="shop-zero-rank-badge" className="ml-1 inline-block rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" title="In der Nähe, aber aktuell 0 Gerichte mit vollständigem Preis & Score im Ranking">{s.productCount} erfasst · 0 im Ranking</span>}</span></span>
            <Star className={cn('size-5 shrink-0', on ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground')} /></button> })}
          <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold"><Truck className="mr-1 inline size-3.5" />Online & Lieferdienste</div>
          {online.map(p => { const id = onlineId(p), on = my.includes(id); return <button key={p} onClick={() => toggleMyShop(id)} aria-pressed={on} className={cn('flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/60', on && 'bg-emerald-50 dark:bg-emerald-950/40')}>
            <StoreLogo store={p} size={24} /><span className="flex-1">{p} <span data-testid="online-rank-badge" className={cn('text-xs', (rankableByChain[p] ?? 0) > 0 ? 'text-muted-foreground' : 'text-amber-700')}>({rankableByChain[p] ?? 0} im Ranking · {countsByChain[p] ?? 0} erfasst){deliversHere(p) === false ? <b className="ml-1 text-red-600">nicht lieferbar nach Linz</b> : deliversHere(p) == null && <span className="ml-1 text-amber-700" title="Keine offizielle Quelle für Lieferung nach 4020 Linz">Lieferung nach Linz unbestätigt</span>}</span></span><Star className={cn('size-5', on ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground')} /></button> })}
        </div>
      </Card>
    </div>

    <Card className="space-y-3 p-3 shadow-none">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">Ranking: die gesündesten Gerichte in meinen Shops</h2>
        <Select value={gang} onChange={e => setGang(e.target.value)} aria-label="Gang"><option value="">Alle Gänge</option><option value="haupt">Hauptspeise</option><option value="vorspeise">Vorspeise/Suppe</option><option value="beilage">Beilage</option><option value="dessert">Dessert</option></Select>
        <Select value={chain} onChange={e => setChain(e.target.value)} aria-label="Anbieter"><option value="">Alle meine Anbieter</option>{[...myChains].map(c => <option key={c}>{c}</option>)}</Select>
        <Select value={minScore} onChange={e => setMinScore(+e.target.value)} aria-label="Mindest-Score">{[0, 30, 45, 60].map(v => <option key={v} value={v}>{v ? `Score ≥ ${v}` : 'jeder Score'}</option>)}</Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={allFood} onChange={e => setAllFood(e.target.checked)} />auch normale Lebensmittel zeigen</label>
      </div>
      {myChains.size === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><Star className="mx-auto mb-2 size-6" />Markiere oben mindestens einen Shop als „Meine Shops“ – dann erscheint hier das Ranking.</p> : <>
        <div className="flex flex-wrap gap-2">{perChain.map(x => <Badge key={x.c} className="gap-1.5 py-1"><StoreLogo store={x.c} size={16} />{x.c}: {x.n} Gerichte · Median-Score {fmt(x.med, 0)} · Bester {fmt(x.best, 0)}</Badge>)}</div>
        <ol className="divide-y">{ranking.map((r: Row, i) => <li key={r.id}><button onClick={() => open(r.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/50">
          <span className="w-7 text-right text-sm font-bold text-muted-foreground">{i + 1}</span><Img src={r.img} className="size-12 shrink-0 rounded" />
          <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium">{r.name}{((r as any).rankableLight === true || passesLightRank(r as any)) && !((r as any).rankable === true || passesRankMin(r as any)) && <span data-testid="meineshops-light-badge" className="ml-1.5 inline-block rounded bg-sky-100 px-1 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">Leicht</span>}</span><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><StoreLogo store={r.store} size={14} />{r.store} · {r.brandN}{r.price != null && ` · ${fmt(r.price, 2)} €`}{pricePerPortion(r) != null && ` · ${fmt(pricePerPortion(r), 2)} €/Portion`} <OldPriceBadge r={r} /></span><span className="mt-0.5 inline-block rounded border px-1 text-[10px] text-muted-foreground" title={deliveryTitle(r)}>{deliveryText(r)}</span></span>
          <span className="w-24 shrink-0 sm:w-36"><ScoreBar r={r} /></span></button></li>)}</ol>
        {ranking.length === 0 && <p className="text-sm text-muted-foreground">Keine bewerteten Gerichte für diese Auswahl.</p>}
        <p className="flex gap-1 text-[11px] text-muted-foreground"><Info className="size-3.5 shrink-0" />Nur Fertiggerichte mit echtem Preis, Laden und vollständigem Score. „Kette führt es“ = Sortiment der Kette; nicht für die einzelne Filiale bestätigt. Sortiert nach Health-Score, bei Gleichstand nach Preis/100 g. Score-Farbe: <span style={{ color: scoreColor(60) }}>≥60 sehr gut</span>.</p>
      </>}
    </Card>
  </div>
}
