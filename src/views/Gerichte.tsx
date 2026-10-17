import { useMemo, useState } from 'react'
import { useApp, fmt, cn, type Row } from '../lib'
import { Card, Input, Badge } from '../components/ui'
import { ZoomImage, BrandLogo, StoreLogo, PliBadge, HealthBadge, Price, Nearest } from '../components/product'
import { InfoTip, packEmo } from '../components/info'
import { useHashState } from '../lib'
import { LinkNote } from '../components/LinkNote'
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
export default function Gerichte(){
  const {D,open}=useApp()
  const [dk,setDk]=useHashState<string>('dish','wiener-suppentopf')
  const [q,setQ]=useState(''); const [focus,setFocus]=useState(false)
  const [sort,setSort]=useState<'pli'|'eur10p'|'price'|'score'>('pli')
  const dishes=useMemo(()=>{const m=new Map<string,{k:string;l:string;rows:Row[]}>();for(const r of D.rows){if(!r.dishKey||r.nonfood)continue;const e=m.get(r.dishKey)??{k:r.dishKey,l:r.dish||r.dishKey,rows:[]};e.rows.push(r);m.set(r.dishKey,e)}return [...m.values()].sort((a,b)=>b.rows.length-a.rows.length)},[D])
  const sugg=useMemo(()=>{const n=norm(q.trim());if(!n)return dishes.slice(0,12);return dishes.filter(d=>norm(d.l).includes(n)||d.rows.some(r=>norm(r.name).includes(n))).slice(0,12)},[q,dishes])
  const cur=dishes.find(d=>d.k===dk)??dishes[0]
  const val=(r:Row)=>sort==='pli'?-(r.pli??-1e9):sort==='score'?-(r.score??-1e9):sort==='price'?(r.price??1e9):(r.eur10p??1e9)
  const rows=cur?[...cur.rows].sort((a,b)=>val(a)-val(b)):[]
  const best=rows.find(r=>r.pli!=null)
  return <div className="space-y-3">
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">🍲 Gericht vergleichen</h2><InfoTip text="Alle Varianten eines Klassikers (z. B. Wiener Suppentopf) von allen Marken und Ketten nebeneinander. Standard-Sortierung nach Preis-Leistungs-Index (PLI)."/></div>
      <div className="relative max-w-xl">
        <Input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>setFocus(true)} onBlur={()=>setTimeout(()=>setFocus(false),150)} placeholder="🔎 Gericht suchen, z. B. Gulasch, Suppentopf, Lasagne…" className="w-full text-base py-2"/>
        {focus&&sugg.length>0&&<div className="absolute z-30 mt-1 w-full rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg max-h-80 overflow-auto">{sugg.map(d=><button key={d.k} onMouseDown={()=>{setDk(d.k);setQ('')}} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><ZoomImage zoom={false} src={d.rows.find(r=>r.img)?.img??null} className="h-8 w-8"/><span className="flex-1 font-medium">{d.l}</span><Badge className="bg-slate-100 dark:bg-slate-800">{d.rows.length} Varianten</Badge></button>)}</div>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto scroll-x pb-1">{dishes.map(d=><button key={d.k} onClick={()=>setDk(d.k)} className={cn('rounded-full border px-2.5 py-1 text-xs whitespace-nowrap',cur?.k===d.k?'bg-brand text-white border-brand':'hover:bg-slate-100 dark:hover:bg-slate-800 dark:border-slate-700')}>{d.l} <span className="opacity-60">{d.rows.length}</span></button>)}</div>
    </Card>
    {cur&&<Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-3"><h3 className="text-xl font-bold">{cur.l}</h3><Badge className="bg-emerald-100 text-emerald-800">{rows.length} Varianten · {new Set(rows.map(r=>r.store)).size} Ketten · {new Set(rows.map(r=>r.brandN)).size} Marken</Badge>
        {best&&<span className="text-sm text-slate-500">🏆 Bester PLI: <b>{best.name}</b></span>}
        <div className="ml-auto flex gap-1 text-xs">{([['pli','⭐ PLI'],['eur10p','💪 €/10 g Protein'],['price','💶 Preis'],['score','💚 Health']] as const).map(([k,l])=><button key={k} onClick={()=>setSort(k)} className={cn('rounded-lg border px-2 py-1',sort===k?'bg-brand text-white border-brand':'dark:border-slate-700')}>{l}</button>)}</div></div>
      <div className="flex gap-3 overflow-x-auto scroll-x pb-2 snap-x">{rows.map((r,i)=><div key={r.id} onClick={()=>open(r.id)} className={cn('snap-start shrink-0 w-56 cursor-pointer rounded-2xl border p-2.5 bg-white dark:bg-slate-900 dark:border-slate-700 hover:shadow-lg transition relative',i===0&&r.pli!=null&&'ring-2 ring-emerald-500')}>
        <span className="absolute left-2 top-2 z-10 rounded-full bg-slate-900/80 text-white text-[11px] font-bold w-6 h-6 flex items-center justify-center">{i+1}</span>
        <ZoomImage src={r.img} className="h-36 w-full"/>
        <div className="mt-2 flex items-center justify-between gap-1"><BrandLogo r={r} size={26}/><StoreLogo store={r.store} size={26}/></div>
        <div className="mt-1 text-sm font-semibold leading-tight line-clamp-2 min-h-[2.5rem]" title={r.name}>{r.name}</div>
        <div className="text-[11px] text-slate-500">{packEmo(r.pack)} {r.pack||'–'} · {r.size?fmt(r.size,0)+' g':'–'}</div>
        <div className="mt-1.5"><Price r={r}/></div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px]">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-1"><InfoTip k="eur10p"><span className="text-slate-500">€/10 g Prot.</span></InfoTip><div className="font-bold text-sm">{r.eur10p!=null?fmt(r.eur10p,2)+' €':'–'}</div></div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-1.5 py-1"><span className="text-slate-500">Protein/Pkg.</span><div className="font-bold text-sm">{r.protpack!=null?fmt(r.protpack,0)+' g':'–'}</div></div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-1.5 py-1"><span className="text-slate-500">€/100 g</span><div className="font-bold text-sm">{r.ppk!=null?fmt(r.ppk/10,2)+' €':'–'}</div></div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-1.5 py-1"><span className="text-slate-500">kcal/Pkg.</span><div className="font-bold text-sm">{r.kcalpack!=null?fmt(r.kcalpack,0):'–'}</div></div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1"><PliBadge v={r.pli}/><HealthBadge s={r.score}/>{r.pli==null&&<span className="text-[10px] text-slate-400">PLI fehlt (Preis/Nährwerte)</span>}</div>
        <div className="mt-1"><Nearest store={r.store} compact/></div>
        {r.url&&<a href={r.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-[10px] text-sky-600 hover:underline">🔗 Quelle</a>}{r.url&&<LinkNote url={r.url} className="ml-1"/>}
      </div>)}</div>
    </Card>}
  </div>
}
