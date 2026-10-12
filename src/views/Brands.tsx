import { useMemo, useState } from 'react'
import { Card, Select, Input } from '../components/ui'
import { BrandLogo, Img, Price, PliBadge } from '../components/product'
import { fmt, useApp, scoreColor, type Row } from '../lib'
const md=(a:(number|null)[])=>{const v=a.filter(x=>x!=null).sort((x,y)=>x!-y!) as number[];return v.length?v[Math.floor(v.length/2)]:null}
export default function Brands(){
  const {R,open}=useApp()
  const [sort,setSort]=useState('n'),[q,setQ]=useState(''),[exp,setExp]=useState<string|null>(null)
  const brands=useMemo(()=>{const g:Record<string,Row[]>={};R.filter(r=>!r.dry).forEach(r=>(g[r.brandN]??=[]).push(r))
    return Object.entries(g).map(([b,rs])=>({b,rs,n:rs.length,stores:[...new Set(rs.map(r=>r.store))],price:md(rs.filter(r=>r.pstat==='live 2026').map(r=>r.price)),ppk:md(rs.map(r=>r.ppk)),eur10p:md(rs.filter(r=>r.rankable).map(r=>r.eur10p)),score:md(rs.filter(r=>r.rankable).map(r=>r.score)),pli:md(rs.map(r=>r.pli))}))},[R])
  const list=brands.filter(b=>!q||b.b.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>{const k=sort as keyof typeof a;if(k==='b')return a.b.localeCompare(b.b);const lo=['price','ppk','eur10p'].includes(sort);const x=(a as any)[k],y=(b as any)[k];if(x==null)return 1;if(y==null)return -1;return lo?x-y:y-x})
  return <div className="space-y-3">
    <Card className="p-2.5 flex flex-wrap gap-2 items-center"><Input placeholder="Marke suchen…" value={q} onChange={e=>setQ(e.target.value)} className="flex-1 min-w-[160px]"/>
      <Select value={sort} onChange={e=>setSort(e.target.value)}><option value="n">Anzahl Produkte</option><option value="pli">Preis-Leistungs-Index</option><option value="score">Health-Score</option><option value="eur10p">€ pro 10 g Protein (günstig zuerst)</option><option value="price">Preis/Pkg (günstig zuerst)</option><option value="ppk">€/kg (günstig zuerst)</option><option value="b">A–Z</option></Select><span className="text-xs text-slate-500">{list.length} Marken</span></Card>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1900px]:grid-cols-5">{list.map(b=><Card key={b.b} className="p-3 space-y-2">
      <div className="flex items-center gap-2"><BrandLogo r={{brandN:b.b,logo:b.rs.find(r=>r.logo)?.logo??null}} size={34}/><div className="min-w-0"><div className="font-semibold truncate">{b.b}</div><div className="text-xs text-slate-500">{b.n} Produkte · {b.stores.join(', ')}</div></div><div className="ml-auto"><PliBadge v={b.pli}/></div></div>
      <div className="grid grid-cols-4 gap-1 text-center text-xs">{[['Ø Preis',fmt(b.price,2)+' €'],['€/kg',fmt(b.ppk,2)],['€/10 g P',fmt(b.eur10p,2)],['Score',<span style={{color:scoreColor(b.score)}}>{fmt(b.score,0)}</span>]].map(([l,v])=><div key={l as string} className="rounded bg-slate-50 dark:bg-slate-800 py-1"><div className="font-semibold">{v}</div><div className="text-[10px] text-slate-500">{l}</div></div>)}</div>
      <div className="space-y-1">{(exp===b.b?b.rs:b.rs.slice(0,3)).sort((x,y)=>(y.pli??-1)-(x.pli??-1)).map(r=><button key={r.id} onClick={()=>open(r.id)} className="flex w-full items-center gap-2 text-left text-xs rounded hover:bg-slate-50 dark:hover:bg-slate-800 p-0.5"><Img src={r.img} className="h-8 w-8"/><span className="flex-1 truncate">{r.name}</span><Price r={r}/></button>)}
        {b.n>3&&<button className="text-xs text-brand" onClick={()=>setExp(exp===b.b?null:b.b)}>{exp===b.b?'weniger':`alle ${b.n} zeigen`}</button>}</div></Card>)}</div>
    <p className="text-xs text-slate-500">Logos über Wikidata/Wikimedia Commons; bei Eigenmarken ohne eigenes Logo steht das Logo des Händlers, sonst ein Kürzel. Die Mediane zählen nur Produkte mit vollständigen Daten.</p></div>
}
