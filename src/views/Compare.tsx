import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Trophy, X, Share2 } from 'lucide-react'
import { Img, Price, ScoreBar } from '../components/product'
import { Button } from '../components/ui'
import { fmt, useApp, cn, type Row } from '../lib'
const PAL=['#1b6e3a','#2563eb','#db2777','#f59e0b']
type M={k:keyof Row;l:string;better:'hi'|'lo';d:number;u?:string}
const METRICS:M[]=[{k:'score',l:'Health-Score',better:'hi',d:0},{k:'protpack',l:'Protein/Packung',better:'hi',d:1,u:'g'},{k:'p100k',l:'Protein/100 kcal',better:'hi',d:1,u:'g'},{k:'ppe',l:'Protein pro €',better:'hi',d:1,u:'g'},{k:'price',l:'Preis',better:'lo',d:2,u:'€'},{k:'ppk',l:'€/kg',better:'lo',d:2,u:'€'},{k:'kcal',l:'kcal/100 g',better:'lo',d:0},{k:'salt',l:'Salz/100 g',better:'lo',d:2,u:'g'},{k:'sat',l:'ges. Fett/100 g',better:'lo',d:1,u:'g'},{k:'sugar',l:'Zucker/100 g',better:'lo',d:1,u:'g'},{k:'fib',l:'Ballaststoffe/100 g',better:'hi',d:1,u:'g'}]
export default function Compare(){
  const {R,compare,toggleCompare,setCompare,open}=useApp()
  const items=compare.map(i=>R[i]).filter(Boolean)
  if(items.length<2) return <div className="text-center text-slate-500 py-10">Wähle mindestens 2 Produkte (Vergleichs-Symbol oder Checkbox in der Tabelle).</div>
  const win=(m:M)=>{const v=items.map(r=>r[m.k] as number|null).filter(v=>v!=null) as number[];if(v.length<2)return null;return m.better==='hi'?Math.max(...v):Math.min(...v)}
  const norm=(m:M,v:number|null)=>{if(v==null)return 0;const all=R.map(r=>r[m.k] as number).filter(x=>x!=null).sort((a,b)=>a-b);const i=all.findIndex(x=>x>=v);const pct=(i<0?all.length:i)/all.length*100;return Math.round(m.better==='hi'?pct:100-pct)}
  const radarM=METRICS.filter(m=>['score','p100k','ppe','salt','sat','fib','kcal'].includes(m.k as string))
  const radar=radarM.map(m=>Object.fromEntries([['m',m.l.replace('/100 g','')],...items.map((r,i)=>[`p${i}`,norm(m,r[m.k] as number)])]))
  const wins=items.map(r=>METRICS.filter(m=>{const w=win(m);return w!=null&&r[m.k]===w}).length)
  return <div className="space-y-4">
    <div className="flex justify-between items-center gap-2"><span className="text-sm text-slate-500">{items.length} Produkte</span><div className="flex gap-1"><Button size="sm" onClick={()=>navigator.clipboard?.writeText(location.href)}><Share2 size={13}/>Link kopieren</Button><Button size="sm" onClick={()=>setCompare([])}>Leeren</Button></div></div>
    <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`}}>{items.map((r,i)=><div key={r.id} className="relative rounded-xl border p-2 text-center dark:border-slate-700" style={{borderTopColor:PAL[i],borderTopWidth:4}}>
      <button className="absolute right-1 top-1 text-slate-400 hover:text-red-500" onClick={()=>toggleCompare(r.id)} aria-label="Entfernen"><X size={14}/></button>
      <Img src={r.img} className="h-16 w-16 mx-auto"/><button onClick={()=>open(r.id)} className="mt-1 text-xs font-semibold leading-tight line-clamp-3 hover:underline">{r.name}</button><div className="text-[10px] text-slate-500">{r.store}</div><div className="text-xs mt-1"><Price r={r}/></div>
      {wins[i]===Math.max(...wins)&&<div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600"><Trophy size={11}/>{wins[i]} Siege</div>}</div>)}</div>
    <div className="h-[300px]"><ResponsiveContainer><RadarChart data={radar} outerRadius="72%"><PolarGrid/><PolarAngleAxis dataKey="m" tick={{fontSize:10}}/><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>{items.map((r,i)=><Radar key={r.id} name={r.name.slice(0,22)} dataKey={`p${i}`} stroke={PAL[i]} fill={PAL[i]} fillOpacity={.15}/>)}<Legend wrapperStyle={{fontSize:10}}/><Tooltip/></RadarChart></ResponsiveContainer></div>
    <p className="text-[11px] text-slate-500 -mt-2">Radar zeigt das Perzentil im Gesamtsortiment, 100 = am besten (bei Salz, Fett und kcal heißt das: am niedrigsten).</p>
    <div className="space-y-3">{METRICS.map(m=>{const w=win(m);const vals=items.map(r=>r[m.k] as number|null);const mx=Math.max(...vals.map(v=>v??0),0.0001)
      return <div key={m.k as string}><div className="flex justify-between text-xs font-medium mb-1"><span>{m.l}</span><span className="text-slate-400">{m.better==='hi'?'höher = besser':'niedriger = besser'}</span></div>
        {items.map((r,i)=>{const v=vals[i];const isW=w!=null&&v===w;return <div key={r.id} className="flex items-center gap-2 text-xs mb-0.5"><div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded" style={{width:`${(v??0)/mx*100}%`,background:PAL[i],opacity:isW?1:.45}}/></div><span className={cn('w-16 text-right tabular-nums',isW&&'font-bold text-brand')}>{isW&&'🏆 '}{m.k==='score'&&v!=null?<span>{fmt(v,0)}</span>:fmt(v,m.d)}{v!=null&&m.u?' '+m.u:''}</span></div>})}</div>})}</div>
    <div className="space-y-1">{items.map((r,i)=><div key={r.id} className="flex gap-2 items-center text-xs"><span className="w-3 h-3 rounded-full shrink-0" style={{background:PAL[i]}}/><span className="w-28 truncate">{r.name}</span><div className="flex-1"><ScoreBar r={r}/></div></div>)}</div>
  </div>
}
