import { useState } from 'react'
import type React from 'react'
import { createPortal } from 'react-dom'
import { Beef, Flame, Droplets, Candy, Wheat, Leaf, Sprout, MapPin, UtensilsCrossed, Heart, GitCompare, AlertTriangle } from 'lucide-react'
import { Badge, Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { fmt, scoreColor, useApp, cn, fmtDist, STORE_LOGO, type Row } from '../lib'
import { Navigation } from 'lucide-react'
import * as HC from '@radix-ui/react-hover-card'
import { InfoTip, KPI, STAGES, packEmo, Flag, ProducerChip } from './info'
Object.assign(KPI,{pPor:'Preis pro Portion = Packungspreis × Portion ÷ Packungsgewicht. Portion: Komplettmahlzeit = ganze Packung, Eintopf/Suppe max. 400 g, Protein-Komponente 150 g, Beilage 200 g, Gemüse 150 g.',p100g:'Preis pro 100 g = Packungspreis ÷ Gewicht × 100',protPor:'Protein pro Portion (g), Portionsgröße wie beim Preis pro Portion',kcalPor:'kcal pro Portion',saltPor:'Salz pro Portion in g und in % der Tagesobergrenze von 6 g (WHO/DGE: höchstens 5 bis 6 g pro Tag)',dist:'Fußweg zur nächsten Filiale dieser Kette ab Gruberstraße 19 (OSRM-Routing, OpenStreetMap)',pack:'Verpackungsart: Dose, Kühlschale/MAP, Tiefkühl, Glas, Trocken/Instant oder Pouch. Siehe Seite Verpackungen.',ns:'Nutri-Score A–E, offizieller Algorithmus, sofern vom Hersteller oder in OpenFoodFacts angegeben',id:'Identitätskennzeichen (z. B. AT 40148 EG) = Zulassungsnummer des Betriebs, der das tierische Produkt zuletzt verarbeitet hat. Darüber wird der Hersteller ermittelt.',mhd:'Mindesthaltbarkeit ungeöffnet, typischer Wert für diese Verpackungsart'})
export function KpiBox({k,label,v,unit='',d=2,hi}:{k:string;label:string;v:number|null|undefined;unit?:string;d?:number;hi?:boolean}){
  return <div className={cn('rounded-lg px-1 py-1 text-center',hi?'bg-emerald-600 text-white':'bg-slate-50 dark:bg-slate-800')}><div className="text-[13px] font-semibold tabular-nums leading-tight">{v==null?'–':fmt(v,d)+unit}</div><div className={cn('text-[9.5px] leading-none flex justify-center',hi?'text-white/90':'text-slate-500')}><InfoTip k={k}>{label}</InfoTip></div></div>
}
const isTouch=typeof window!=='undefined'&&matchMedia('(hover: none)').matches
export function ZoomImage({src,className='h-12 w-12',zoom=true,onErr,logo=false}:{src:string|null;className?:string;zoom?:boolean;onErr?:()=>void;logo?:boolean}){
  const [err,setErr]=useState(false),[pos,setPos]=useState<{x:number;y:number}|null>(null),[full,setFull]=useState(false)
  if(!src||err) return <div className={cn(className,'flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800')}><UtensilsCrossed size={18}/></div>
  const S=400,place=(e:React.MouseEvent)=>{const x=e.clientX+24+S>innerWidth?e.clientX-24-S:e.clientX+24;const y=Math.min(Math.max(8,e.clientY-S/2),innerHeight-S-8);setPos({x,y})}
  return <>
    <img src={src} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>{setErr(true);onErr?.()}} className={cn(logo?'object-contain object-center bg-transparent select-none':'rounded-lg object-contain bg-white',className,zoom&&'cursor-zoom-in')} alt=""
      onMouseEnter={zoom&&!isTouch?place:undefined} onMouseMove={zoom&&!isTouch?place:undefined} onMouseLeave={()=>setPos(null)}
      onClick={zoom&&isTouch?(e=>{e.stopPropagation();setFull(true)}):undefined}/>
    {pos&&createPortal(<div className="pointer-events-none fixed z-[70] rounded-2xl border bg-white p-2 shadow-2xl zoom-in" style={{left:pos.x,top:pos.y,width:S,height:S}}><img src={src} referrerPolicy="no-referrer" className="h-full w-full object-contain" alt=""/></div>,document.body)}
    {full&&createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 zoom-in" onClick={e=>{e.stopPropagation();setFull(false)}}><img src={src} referrerPolicy="no-referrer" className="max-h-[92vh] max-w-[96vw] object-contain bg-white rounded-lg" alt=""/><button className="absolute right-4 top-4 text-3xl text-white" aria-label="Schließen">×</button></div>,document.body)}
  </>
}
export function ScoreBar({r}:{r:Pick<Row,'score'|'incomplete'|'dry'>}){
  const s=r.score
  return <div className="flex items-center gap-2 w-full"><div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div className="h-full rounded-full" style={{width:`${s??0}%`,background:scoreColor(s)}}/></div>
    <span className="w-7 text-right text-xs font-semibold tabular-nums">{s==null?'–':Math.round(s)}</span>
    {r.dry?<Badge className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">trocken</Badge>:r.incomplete&&s!=null?<Badge className="bg-amber-100 text-amber-800" title="Salz oder ges. Fett fehlt">unvollständig</Badge>:null}</div>
}
const N='bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
export function Chips({r,compact}:{r:Row;compact?:boolean}){
  return <div className="flex flex-wrap gap-1">
    {r.protpack!=null&&<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" title="Protein pro Packung">🥩 {fmt(r.protpack,0)} g</Badge>}
    {r.kcal!=null&&<Badge className={N} title="kcal/100 g">🔥 {fmt(r.kcal,0)}</Badge>}
    {r.salt!=null&&<Badge className={r.salt>1.5?'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300':N} title="Salz g/100 g">🧂 {fmt(r.salt,2)}</Badge>}
    {!compact&&r.sat!=null&&<Badge className={r.sat>4?'bg-orange-100 text-orange-700':N} title="ges. Fett g/100 g">🧈 {fmt(r.sat)}</Badge>}
    {!compact&&r.sugar!=null&&<Badge className={r.sugar>5?'bg-pink-100 text-pink-700':N} title="Zucker g/100 g">🍬 {fmt(r.sugar)}</Badge>}
    {!compact&&r.fib!=null&&<Badge className="bg-amber-100 text-amber-800" title="Ballaststoffe g/100 g">🌾 {fmt(r.fib)}</Badge>}
    {r.bio&&<Badge className="bg-lime-200 text-lime-900">🌱 Bio</Badge>}
    {r.vegan&&<Badge className="bg-green-200 text-green-900">🌿 vegan</Badge>}
    {(r as any).ns&&<InfoTip k="ns"><Badge className={'text-white '+({A:'bg-green-700',B:'bg-lime-600',C:'bg-yellow-500',D:'bg-orange-500',E:'bg-red-600'} as any)[String((r as any).ns).toUpperCase()]}>Nutri {String((r as any).ns).toUpperCase()}</Badge></InfoTip>}{r.ooe&&<Badge className="bg-red-600 text-white">🦁 OÖ</Badge>}
  </div>
}
export const isLive=(p:string|null)=>!!p&&/live|aktuell/i.test(p)
export const Price=({r}:{r:Row})=> r.price==null?<span className="text-slate-400">–</span>:<span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className={cn('font-bold tabular-nums text-[1.05em]',isLive(r.pstat)?'text-slate-900 dark:text-white':'text-slate-500')}>{fmt(r.price,2)} €</span>{isLive(r.pstat)?<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">✓ aktuell</Badge>:<Badge className="bg-amber-100 text-amber-800 text-[10px]">{r.pstat}</Badge>}</span>
export function BrandLogo({r,size=28}:{r:Pick<Row,'brandN'|'logo'>;size?:number}){
  const [err,setErr]=useState(false)
  if(r.logo&&!err) return <span title={r.brandN} style={{height:size,width:size*2.6}} className="inline-flex shrink-0 items-center justify-center"><ZoomImage logo src={r.logo} className="h-full w-full" onErr={()=>setErr(true)}/></span>
  const h=[...r.brandN].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7),hue=Math.abs(h)%360
  return <span title={r.brandN} style={{height:size,minWidth:size,background:`hsl(${hue} 55% 42%)`,fontSize:size*.38}} className="inline-flex items-center justify-center rounded-md px-1 font-bold text-white">{r.brandN.replace(/[^A-Za-zÄÖÜäöü ]/g,'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}</span>
}
export function StoreLogo({store,size=28}:{store:string;size?:number}){
  const l=STORE_LOGO[store]
  return l?<span title={store} style={{height:size,width:size*2.6}} className="inline-flex shrink-0 items-center justify-center"><ZoomImage logo src={l} className="h-full w-full"/></span>:<BrandLogo r={{brandN:store,logo:null}} size={size}/>
}
export function Nearest({store,compact}:{store:string;compact?:boolean}){
  const {nearest}=useApp(); const s=nearest(store); if(!s) return null
  return <a href={s.gmaps} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-400 hover:underline" title={`${s.name}, ${s.addr??''}`}><Navigation size={11}/>{compact?'':'Nächste Filiale: '}<span className="truncate max-w-[170px]">{s.addr||s.name}</span>, <b>{fmtDist(s.walk_m??s.dist)}</b> 🚶</a>
}
export function NearestBox({store}:{store:string}){
  const {nearest}=useApp(); const s=nearest(store)
  return <a href={s?.gmaps} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/40 dark:border-sky-900 px-2 py-1.5 hover:bg-sky-100"><StoreLogo store={store} size={40}/>{s?<div className="min-w-0 flex-1 leading-tight"><div className="text-[12px] font-semibold truncate">📍 {s.name}</div><div className="text-[11px] text-slate-500 truncate">{s.addr}</div></div>:<div className="text-[11px] text-slate-500 flex-1">keine Filiale in der Nähe gefunden</div>}{s&&<div className="text-right shrink-0"><div className="text-base font-bold text-sky-700 dark:text-sky-300 tabular-nums">{Math.round(s.walk_m??s.dist)} m</div><div className="text-[10px] text-slate-500 flex justify-end"><InfoTip k="dist">🚶 {s.walk_min??Math.round((s.walk_m??s.dist)/80)} min</InfoTip></div></div>}</a>
}
export function CatChips({r}:{r:Row}){const {D}=useApp(); const c=[...(r.cprot||[]),...(r.cdish||[])]; if(!c.length) return null
  return <div className="flex flex-wrap gap-1">{c.slice(0,4).map(x=><span key={x} className="rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-1.5 py-0.5 text-[10px]">{D.catIcon[x]??''} {x}</span>)}</div>}
export function PliBadge({v}:{v:number|null}){ if(v==null) return null; const c=v>=60?'bg-emerald-600':v>=45?'bg-lime-600':v>=30?'bg-amber-500':'bg-orange-600'; return <InfoTip k="pli"><Badge className={c+' text-white text-sm'}>⭐ PLI {Math.round(v)}</Badge></InfoTip>}
export function PriceKpis({r}:{r:Row}){
  return <div className="grid grid-cols-4 gap-1">
    <KpiBox k="pPor" label="€/Portion" v={r.pPor} unit=" €"/><KpiBox k="p100g" label="€/100 g" v={r.p100g} unit=" €"/><KpiBox k="eur100k" label="€/100 kcal" v={r.eur100k} unit=" €"/><KpiBox k="ppe" label="g P/€" v={r.ppe} d={1}/>
    <KpiBox k="protPor" label="🥩 P/Portion" v={r.protPor} unit=" g" d={0}/><KpiBox k="kcalPor" label="🔥 kcal/Port." v={r.kcalPor} d={0}/><KpiBox k="p100k" label="P/100 kcal" v={r.p100k} unit=" g" d={1}/><KpiBox k="saltPor" label={`🧂 Salz ${r.saltPct??'–'} %`} v={r.saltPor} unit=" g"/></div>
}
export function StageBadge({r}:{r:Row}){const s=STAGES.find(x=>x[0]===r.stage);return s?<InfoTip k="stage"><Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">{s[1]} {s[2]}</Badge></InfoTip>:null}
export function ProdLine({r,size='sm'}:{r:Row;size?:'sm'|'md'}){const n=r.p2?.producer||r.herst;if(!n)return null;return <div className="flex items-center gap-1 min-w-0 flex-wrap"><ProducerChip slug={r.prodSlug} name={n} size={size}/><Flag text={(r.p2?.town||'')+' '+(r.ort||'')+' '+(r.origin||'')} state={r.ooe?'Oberösterreich':null}/>{r.p2?.confidence&&<InfoTip k="conf"><span className="text-[10px] text-slate-500">{r.p2.confidence}</span></InfoTip>}</div>}
export function RowSummary({r}:{r:Row}){
  return <div className="w-[360px] space-y-2"><div className="flex gap-3"><img src={r.img??''} referrerPolicy="no-referrer" className="h-36 w-36 object-contain rounded-lg bg-white"/><div className="min-w-0 space-y-1"><div className="font-semibold leading-tight">{r.name}</div><div className="text-xs text-slate-500">{r.brand}</div><StoreLogo store={r.store} size={40}/><div className="text-lg font-bold">{r.price!=null?fmt(r.price,2)+' €':'–'}</div><PliBadge v={r.pli}/></div></div>
    <div className="grid grid-cols-3 gap-1"><KpiBox k="eur10p" label="€/10 g P" v={r.eur10p} unit=" €" hi/><KpiBox k="score" label="Score" v={r.score} d={0}/><KpiBox k="pPor" label="€/Portion" v={r.pPor} unit=" €"/></div><PriceKpis r={r}/><div className="text-xs">{packEmo(r.pack)} {r.pack}</div><ProdLine r={r}/></div>
}
export function RowHover({r,children}:{r:Row;children:React.ReactNode}){
  if(isTouch) return <>{children}</>
  return <HC.Root openDelay={250} closeDelay={80}><HC.Trigger asChild>{children}</HC.Trigger><HC.Portal><HC.Content side="right" align="start" sideOffset={8} collisionPadding={10} className="z-[90] rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-700 p-3 shadow-2xl"><RowSummary r={r}/></HC.Content></HC.Portal></HC.Root>
}
export function Actions({r}:{r:Row}){
  const {favs,toggleFav,compare,toggleCompare}=useApp()
  const f=favs.includes(r.id),c=compare.includes(r.id)
  return <div className="flex gap-1">
    <button onClick={e=>{e.stopPropagation();toggleFav(r.id)}} className={cn('rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800',f?'text-rose-500':'text-slate-400')} title="Favorit" aria-label="Favorit"><Heart size={16} fill={f?'currentColor':'none'}/></button>
    <button onClick={e=>{e.stopPropagation();toggleCompare(r.id)}} className={cn('rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800',c?'text-brand bg-brand/10':'text-slate-400')} title="Vergleichen" aria-label="Vergleichen"><GitCompare size={16}/></button>
  </div>
}
export function HealthBadge({s}:{s:number|null}){if(s==null)return null;const c=s>=55?'bg-emerald-600':s>=40?'bg-lime-600':s>=25?'bg-amber-500':'bg-red-600';return <InfoTip k="score"><Badge className={c+' text-white text-xs px-2.5 py-1 shadow-sm'}>💚 {Math.round(s)}</Badge></InfoTip>}
export function ProductCard({r}:{r:Row}){
  const {open,compare}=useApp()
  const st=STAGES.find(x=>x[0]===r.stage)
  return <RowHover r={r}><Card onClick={()=>open(r.id)} className={cn('group overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:border-brand/40',compare.includes(r.id)&&'ring-2 ring-brand')}>
    <div className="relative bg-gradient-to-b from-white to-slate-50 dark:from-slate-100 dark:to-slate-200 h-48 flex items-center justify-center">
      <Img src={r.img} className="h-44 w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] bg-transparent"/>
      <div className="absolute left-2 top-2 rounded-xl bg-white/95 ring-1 ring-black/5 shadow-md px-2 py-1.5 backdrop-blur"><StoreLogo store={r.store} size={34}/></div>
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1"><PliBadge v={r.pli}/><HealthBadge s={r.score}/></div>
      {st&&<div className="absolute left-2 bottom-2"><Badge className="bg-white/95 text-slate-800 shadow-sm text-xs">{st[1]} {st[2]}</Badge></div>}
      <div className="absolute right-1 bottom-1 rounded-lg bg-white/90 shadow-sm"><Actions r={r}/></div>
    </div>
    <CardHeader className="pt-3"><div className="flex items-center gap-2 min-w-0"><span className="inline-flex items-center rounded-lg bg-white ring-1 ring-slate-200 px-1.5 py-1 dark:ring-slate-700"><BrandLogo r={r} size={30}/></span><span className="text-xs font-medium text-slate-500 truncate">{r.brandN}</span><span className="ml-auto text-[11px] text-slate-400 whitespace-nowrap"><InfoTip k="pack">{packEmo(r.pack)}</InfoTip></span></div>
      <CardTitle className="text-[15px] line-clamp-2 min-h-[2.5em]">{r.name}</CardTitle></CardHeader>
    <CardContent className="space-y-3 flex-1">
      <div className="flex items-end justify-between gap-2"><div className="text-2xl"><Price r={r}/></div>
        <div className="rounded-xl bg-emerald-600 text-white px-3 py-1 text-center shadow-sm"><div className="text-lg font-extrabold leading-tight tabular-nums">{r.eur10p==null?'–':fmt(r.eur10p,2)+' €'}</div><div className="text-[10px] opacity-90 flex justify-center"><InfoTip k="eur10p">pro 10 g Protein</InfoTip></div></div></div>
      <ScoreBar r={r}/>
      <Tabs defaultValue="preis" onClick={e=>e.stopPropagation()}><TabsList><TabsTrigger value="preis">💶 Preis</TabsTrigger><TabsTrigger value="naehr">🥩 Nährwerte</TabsTrigger><TabsTrigger value="herk">🏭 Herkunft</TabsTrigger></TabsList>
        <TabsContent value="preis"><PriceKpis r={r}/></TabsContent>
        <TabsContent value="naehr" className="space-y-1.5"><Chips r={r}/><CatChips r={r}/>{r.priceOnly&&<span className="text-[11px] text-slate-500">nur Preis, keine Nährwerte</span>}</TabsContent>
        <TabsContent value="herk" className="space-y-1.5 text-xs">{(r.p2?.producer||r.herst)?<ProdLine r={r}/>:<span className="text-slate-400">Hersteller unbekannt</span>}{r.origin&&<div>🌍 {r.origin}</div>}</TabsContent></Tabs>
      {r.flags?.some(f=>/Packgröße|Großpackung|Kilopreis|€\/kg/.test(f))&&<div className="text-[11px] text-amber-700 flex gap-1"><AlertTriangle size={12}/>{r.flags.find(f=>/Packgröße|Großpackung|Kilopreis|€\/kg/.test(f))}</div>}
    </CardContent>
    <CardFooter className="p-2"><div className="w-full"><NearestBox store={r.store}/></div></CardFooter>
  </Card></RowHover>
}
export function Gallery({rows,step=48}:{rows:Row[];step?:number}){
  const [n,setN]=useState(step)
  if(!rows.length) return <Card className="p-8 text-center text-slate-500">Keine Produkte</Card>
  return <div><div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5 min-[2400px]:grid-cols-6">{rows.slice(0,n).map(r=><ProductCard key={r.id} r={r}/>)}</div>
    {n<rows.length&&<div className="text-center mt-4"><button className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700" onClick={()=>setN(n+step)}>Mehr laden ({rows.length-n} weitere)</button></div>}</div>
}
export const Img=ZoomImage
