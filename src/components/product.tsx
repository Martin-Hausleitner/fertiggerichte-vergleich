import { useState } from 'react'
import type React from 'react'
import { createPortal } from 'react-dom'
import { Beef, Flame, Droplets, Candy, Wheat, Leaf, Sprout, MapPin, UtensilsCrossed, Heart, GitCompare, AlertTriangle } from 'lucide-react'
import { Badge, Card } from './ui'
import { fmt, scoreColor, useApp, cn, fmtDist, STORE_LOGO, type Row } from '../lib'
import { Navigation } from 'lucide-react'
const isTouch=typeof window!=='undefined'&&matchMedia('(hover: none)').matches
export function ZoomImage({src,className='h-12 w-12',zoom=true,onErr}:{src:string|null;className?:string;zoom?:boolean;onErr?:()=>void}){
  const [err,setErr]=useState(false),[pos,setPos]=useState<{x:number;y:number}|null>(null),[full,setFull]=useState(false)
  if(!src||err) return <div className={cn(className,'flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800')}><UtensilsCrossed size={18}/></div>
  const S=400,place=(e:React.MouseEvent)=>{const x=e.clientX+24+S>innerWidth?e.clientX-24-S:e.clientX+24;const y=Math.min(Math.max(8,e.clientY-S/2),innerHeight-S-8);setPos({x,y})}
  return <>
    <img src={src} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>{setErr(true);onErr?.()}} className={cn('rounded-lg object-contain bg-white',className,zoom&&'cursor-zoom-in')} alt=""
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
    {r.protpack!=null&&<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" title="Protein pro Packung"><Beef size={11}/>{fmt(r.protpack,0)} g</Badge>}
    {r.kcal!=null&&<Badge className={N} title="kcal/100 g"><Flame size={11}/>{fmt(r.kcal,0)}</Badge>}
    {r.salt!=null&&<Badge className={r.salt>1.5?'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300':N} title="Salz g/100 g"><Droplets size={11}/>{fmt(r.salt,2)}</Badge>}
    {!compact&&r.sat!=null&&<Badge className={r.sat>4?'bg-orange-100 text-orange-700':N} title="ges. Fett g/100 g">🧈 {fmt(r.sat)}</Badge>}
    {!compact&&r.sugar!=null&&<Badge className={r.sugar>5?'bg-pink-100 text-pink-700':N} title="Zucker g/100 g"><Candy size={11}/>{fmt(r.sugar)}</Badge>}
    {!compact&&r.fib!=null&&<Badge className="bg-amber-100 text-amber-800" title="Ballaststoffe g/100 g"><Wheat size={11}/>{fmt(r.fib)}</Badge>}
    {r.bio&&<Badge className="bg-lime-200 text-lime-900"><Sprout size={11}/>Bio</Badge>}
    {r.vegan&&<Badge className="bg-green-200 text-green-900"><Leaf size={11}/>vegan</Badge>}
    {r.ooe&&<Badge className="bg-red-600 text-white"><MapPin size={11}/>OÖ</Badge>}
  </div>
}
export const Price=({r}:{r:Row})=> r.price==null?<span className="text-slate-400">–</span>:<span className={cn('font-semibold tabular-nums',r.pstat!=='live 2026'&&'text-slate-400 font-normal')}>{fmt(r.price,2)} €{r.pstat!=='live 2026'&&<Badge className="ml-1 bg-slate-200 text-slate-500 dark:bg-slate-700">{r.pstat}</Badge>}</span>
export function BrandLogo({r,size=28}:{r:Pick<Row,'brandN'|'logo'>;size?:number}){
  const [err,setErr]=useState(false)
  if(r.logo&&!err) return <span title={r.brandN} style={{height:size,width:size*2.2}} className="inline-flex"><ZoomImage src={r.logo} className="h-full w-full p-0.5" onErr={()=>setErr(true)}/></span>
  const h=[...r.brandN].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7),hue=Math.abs(h)%360
  return <span title={r.brandN} style={{height:size,minWidth:size,background:`hsl(${hue} 55% 42%)`,fontSize:size*.38}} className="inline-flex items-center justify-center rounded-md px-1 font-bold text-white">{r.brandN.replace(/[^A-Za-zÄÖÜäöü ]/g,'').split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?'}</span>
}
export function StoreLogo({store,size=28}:{store:string;size?:number}){
  const l=STORE_LOGO[store]
  return l?<span title={store} style={{height:size,width:size*2.4}} className="inline-flex"><ZoomImage src={l} className="h-full w-full p-0.5"/></span>:<BrandLogo r={{brandN:store,logo:null}} size={size}/>
}
export function Nearest({store,compact}:{store:string;compact?:boolean}){
  const {nearest}=useApp(); const s=nearest(store); if(!s) return null
  return <a href={s.gmaps} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-400 hover:underline" title={`${s.name}, ${s.addr??''}`}><Navigation size={11}/>{compact?'':'Nächste Filiale: '}<span className="truncate max-w-[170px]">{s.addr||s.name}</span>, <b>{fmtDist(s.walk_m??s.dist)}</b></a>
}
export function CatChips({r}:{r:Row}){const {D}=useApp(); const c=[...(r.cprot||[]),...(r.cdish||[])]; if(!c.length) return null
  return <div className="flex flex-wrap gap-1">{c.slice(0,4).map(x=><span key={x} className="rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-1.5 py-0.5 text-[10px]">{D.catIcon[x]??''} {x}</span>)}</div>}
export function PliBadge({v}:{v:number|null}){ if(v==null) return null; const c=v>=60?'bg-emerald-600':v>=45?'bg-lime-600':v>=30?'bg-amber-500':'bg-orange-600'; return <Badge className={c+' text-white'} title="Preis-Leistungs-Index = 50 % Health-Score + 50 % Protein/€ (20 g/€ = 100)">PLI {Math.round(v)}</Badge>}
export function PriceKpis({r}:{r:Row}){
  return <div className="grid grid-cols-4 gap-1 text-center">{[['€/kg',r.ppk,2],['€/10 g P',r.eur10p,2],['€/100 kcal',r.eur100k,2],['g P/€',r.ppe,1]].map(([l,v,d])=><div key={l as string} className="rounded-md bg-slate-50 dark:bg-slate-800 px-1 py-0.5"><div className="text-[12px] font-semibold tabular-nums">{fmt(v as number|null,d as number)}</div><div className="text-[9px] text-slate-500 leading-none">{l as string}</div></div>)}</div>
}
export function Actions({r}:{r:Row}){
  const {favs,toggleFav,compare,toggleCompare}=useApp()
  const f=favs.includes(r.id),c=compare.includes(r.id)
  return <div className="flex gap-1">
    <button onClick={e=>{e.stopPropagation();toggleFav(r.id)}} className={cn('rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800',f?'text-rose-500':'text-slate-400')} title="Favorit" aria-label="Favorit"><Heart size={16} fill={f?'currentColor':'none'}/></button>
    <button onClick={e=>{e.stopPropagation();toggleCompare(r.id)}} className={cn('rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800',c?'text-brand bg-brand/10':'text-slate-400')} title="Vergleichen" aria-label="Vergleichen"><GitCompare size={16}/></button>
  </div>
}
export function ProductCard({r}:{r:Row}){
  const {open,compare}=useApp()
  return <Card onClick={()=>open(r.id)} className={cn('p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition',compare.includes(r.id)&&'ring-2 ring-brand')}>
    <div className="flex gap-3"><Img src={r.img} className="h-20 w-20 shrink-0"/><div className="min-w-0 flex-1">
      <div className="font-semibold leading-tight line-clamp-2">{r.name}</div><div className="text-xs text-slate-500 truncate">{r.brand} · {r.store}</div>
      <div className="text-[11px] text-slate-500 truncate">{r.pack}</div><div className="mt-1 flex flex-wrap items-center gap-1.5 text-base"><Price r={r}/><PliBadge v={r.pli}/></div></div><div className="flex flex-col items-end gap-1"><StoreLogo store={r.store} size={30}/><BrandLogo r={r} size={20}/><Actions r={r}/></div></div>
    <div className="flex items-stretch gap-2"><div className="rounded-xl bg-emerald-600 text-white px-3 py-1.5 text-center shrink-0"><div className="text-lg font-bold leading-tight tabular-nums">{r.eur10p==null?'–':fmt(r.eur10p,2)+' €'}</div><div className="text-[10px] opacity-90">pro 10 g Protein</div></div>
      <div className="flex-1 rounded-xl border px-2 py-1 dark:border-slate-700"><div className="text-[10px] text-slate-500">Health-Score</div><ScoreBar r={r}/></div></div>
    <PriceKpis r={r}/><Chips r={r} compact/><CatChips r={r}/>{r.priceOnly&&<span className="text-[11px] text-slate-500">nur Preis, keine Nährwerte</span>}<Nearest store={r.store}/>
    {r.flags?.some(f=>f.startsWith('Packgröße')||f.startsWith('Großpackung'))&&<div className="text-[11px] text-amber-700 flex gap-1"><AlertTriangle size={12}/>{r.flags.find(f=>f.startsWith('Packgröße')||f.startsWith('Großpackung'))}</div>}
  </Card>
}
export function Gallery({rows,step=48}:{rows:Row[];step?:number}){
  const [n,setN]=useState(step)
  if(!rows.length) return <Card className="p-8 text-center text-slate-500">Keine Produkte</Card>
  return <div><div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5 min-[2400px]:grid-cols-6">{rows.slice(0,n).map(r=><ProductCard key={r.id} r={r}/>)}</div>
    {n<rows.length&&<div className="text-center mt-4"><button className="rounded-lg border px-4 py-2 text-sm dark:border-slate-700" onClick={()=>setN(n+step)}>Mehr laden ({rows.length-n} weitere)</button></div>}</div>
}
export const Img=ZoomImage
