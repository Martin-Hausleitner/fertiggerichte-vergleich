import { ExternalLink, MapPin, Factory, CookingPot, AlertTriangle, Info } from 'lucide-react'
import { Img, Chips, Price, ScoreBar, Actions } from '../components/product'
import { Badge } from '../components/ui'
import { fmt, useApp } from '../lib'
export default function Detail({id}:{id:number}){
  const {R,D,open}=useApp(); const r=R[id]; if(!r) return null
  const same=D.same.find(g=>g.ids.includes(id))
  const sim=R.filter(x=>x.id!==id&&x.rankable&&x.pack===r.pack&&x.score!=null&&(x.score??0)>(r.score??0)).sort((a,b)=>(b.score??0)-(a.score??0)).slice(0,4)
  const Row=({l,v}:{l:string;v:any})=><div className="flex justify-between border-b py-1.5 text-sm dark:border-slate-800"><span className="text-slate-500">{l}</span><span className="font-medium text-right tabular-nums">{v??'–'}</span></div>
  return <div className="space-y-4">
    <div className="flex gap-4"><Img src={r.img} className="h-32 w-32 shrink-0"/><div className="space-y-1 min-w-0"><h2 className="text-lg font-bold leading-tight">{r.name}</h2><div className="text-sm text-slate-500">{r.brand} · {r.store}</div><Badge className="bg-slate-100 dark:bg-slate-800">{r.pack}</Badge><div className="text-lg"><Price r={r}/></div><Actions r={r}/></div></div>
    <Chips r={r}/><div><div className="text-xs text-slate-500 mb-1">Health-Score</div><ScoreBar r={r}/></div>
    {r.flags?.length>0&&<div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 text-xs text-amber-800 dark:text-amber-300 space-y-1">{r.flags.map(f=><div key={f} className="flex gap-1"><AlertTriangle size={13} className="shrink-0"/>{f}</div>)}</div>}
    <section><h3 className="font-semibold mb-1">Nährwerte pro 100 g</h3>
      <Row l="Energie" v={r.kcal!=null&&`${fmt(r.kcal,0)} kcal`}/><Row l="Protein" v={r.p100!=null&&`${fmt(r.p100)} g`}/><Row l="Fett" v={r.fat!=null&&`${fmt(r.fat)} g`}/><Row l="davon gesättigt" v={r.sat!=null&&`${fmt(r.sat)} g`}/><Row l="Kohlenhydrate" v={r.carbs!=null&&`${fmt(r.carbs)} g`}/><Row l="davon Zucker" v={r.sugar!=null&&`${fmt(r.sugar)} g`}/><Row l="Ballaststoffe" v={r.fib!=null&&`${fmt(r.fib)} g`}/><Row l="Salz" v={r.salt!=null&&`${fmt(r.salt,2)} g`}/>{r.ns&&<Row l="Nutri-Score" v={r.ns.toUpperCase()}/>}</section>
    <section><h3 className="font-semibold mb-1">Packung &amp; Preis</h3>
      <Row l="Inhalt" v={r.size&&`${fmt(r.size,0)} g`}/><Row l="Protein pro Packung" v={r.protpack&&`${fmt(r.protpack)} g`}/><Row l="kcal pro Packung" v={r.kcalpack&&fmt(r.kcalpack,0)}/><Row l="Protein pro 100 kcal" v={fmt(r.p100k)}/><Row l="€/kg" v={fmt(r.ppk,2)}/><Row l="Protein pro €" v={r.ppe&&`${fmt(r.ppe)} g`}/><Row l="Preisstatus" v={r.pstat}/></section>
    <section className="rounded-xl bg-brand/5 dark:bg-brand/20 p-3"><h3 className="font-semibold flex items-center gap-1.5"><CookingPot size={16}/>Multipot Pro <Badge className="bg-amber-100 text-amber-800">Richtwert</Badge></h3><p className="text-sm mt-1">{r.mp||'Keine spezifische Angabe; siehe Tab „Garzeiten“.'}</p>{r.prep&&<p className="text-xs text-slate-500 mt-1">Herstellerangabe Zubereitung: {r.prep}</p>}</section>
    <section><h3 className="font-semibold mb-1 flex items-center gap-1.5"><Factory size={16}/>Hersteller</h3><p className="text-sm whitespace-pre-line">{r.manuf||r.herst||'–'}</p>{r.ort&&<p className="text-sm flex items-center gap-1 text-slate-500"><MapPin size={13}/>{r.ort}{r.state?` (${r.state})`:''} {r.ooe&&<Badge className="bg-red-600 text-white">OÖ</Badge>}</p>}{r.pid&&<p className="text-xs text-slate-500">Identitätskennzeichen: {r.pid}</p>}{r.origin&&<p className="text-xs text-slate-500">Herkunft: {r.origin}</p>}
      {same&&<div className="mt-2 text-xs"><b>Gleicher Betrieb liefert auch:</b><ul className="list-disc pl-4">{same.ids.filter(i=>i!==id).map(i=><li key={i}><button className="hover:underline" onClick={()=>open(i)}>{R[i].brand} {R[i].name} ({R[i].store})</button></li>)}</ul></div>}</section>
    {sim.length>0&&<section><h3 className="font-semibold mb-1">Gesündere Alternativen ({r.pack})</h3>{sim.map(x=><button key={x.id} onClick={()=>open(x.id)} className="flex w-full items-center gap-2 py-1 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded"><Img src={x.img} className="h-9 w-9"/><span className="flex-1 truncate">{x.name}</span><span className="text-xs font-semibold">{fmt(x.score,0)}</span></button>)}</section>}
    <section className="text-xs text-slate-500 space-y-1"><h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1"><Info size={14}/>Quellen</h3>{r.url&&<a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline break-all"><ExternalLink size={12}/>{r.url}</a>}{r.psrc&&<div>Preisquelle: {r.psrc}</div>}<div>Datensatz: {r.src}</div></section>
  </div>
}
