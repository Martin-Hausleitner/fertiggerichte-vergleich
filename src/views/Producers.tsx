import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Factory, Globe, ArrowLeft, MapPin } from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { ZoomImage, Gallery, BrandLogo, StoreLogo } from '../components/product'
import { prodColor, Flag, InfoTip } from '../components/info'
import { useApp, useHashState, type Row } from '../lib'
function PlantMap({plants,height=300}:{plants:{lat:number;lon:number;address:string;name?:string}[];height?:number}){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(!ref.current||!plants.length)return;const m=L.map(ref.current,{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m)
    const b=L.latLngBounds([]);plants.forEach(p=>{L.circleMarker([p.lat,p.lon],{radius:8,color:'#1b6e3a',fillColor:'#1b6e3a',fillOpacity:.8}).addTo(m).bindPopup(`<b>${p.name??''}</b><br>${p.address}`);b.extend([p.lat,p.lon])});m.fitBounds(b.pad(.3),{maxZoom:plants.length>1?9:12});return()=>{m.remove()}},[plants])
  return <div ref={ref} style={{height}} className="rounded-xl overflow-hidden"/>
}
export default function Producers(){
  const {D,R}=useApp(); const [h,setH]=useHashState<string>('h','')
  const P=(D.producers||[]).filter(p=>p.summary||p.ids.length||p.plants.length)
  const byId=new Map(R.map(r=>[r.id,r]))
  const cur=P.find(p=>p.slug===h)
  if(cur){const rows=cur.ids.map((i:number)=>byId.get(i)).filter(Boolean) as Row[];const brands=[...new Set(rows.map(r=>r.brandN))] as string[]
    return <div className="space-y-3"><button onClick={()=>setH('')} className="text-sm text-brand flex items-center gap-1"><ArrowLeft size={14}/>Alle Hersteller</button>
      <Card className="p-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]"><div className="space-y-2"><div className="flex items-center gap-3">{cur.logo?<ZoomImage logo src={cur.logo} className="h-16 w-28"/>:<Factory size={40} className="text-slate-400"/>}<div><h2 className="text-xl font-bold" style={{color:prodColor(cur.slug)}}>🏭 {cur.legal||cur.name}</h2>{cur.group&&<div className="text-sm text-slate-500">👥 Gruppe/Eigentümer: {cur.group}</div>}<div className="flex items-center gap-1 text-sm"><Flag state={cur.plants[0]?.state} text={(cur.plants[0]?.address||'')+' '+(cur.legal||cur.name)} code={cur.plants[0]?.approval_code}/>{cur.plants[0]?.town}</div>{cur.website&&<a href={cur.website} target="_blank" rel="noreferrer" className="text-xs text-brand flex items-center gap-1"><Globe size={12}/>{cur.website}</a>}</div></div>
        {cur.summary&&<p className="text-sm">{cur.summary}</p>}
        {cur.facts&&<div className="grid sm:grid-cols-2 gap-x-4 text-xs">{Object.entries(cur.facts).map(([k,v]:any)=><div key={k} className="border-b py-1 dark:border-slate-800"><span className="text-slate-500 capitalize">{k.replace(/_/g,' ')}: </span>{Array.isArray(v)?v.join('; '):String(v)}</div>)}</div>}</div>
        <div>{cur.plants.length>0?<PlantMap plants={cur.plants.map((p:any)=>({...p,name:cur.name}))}/>:<div className="text-sm text-slate-500">Kein Werksstandort geokodiert.</div>}{cur.plants.map((p:any,i:number)=><div key={i} className="text-xs mt-1 flex gap-1"><MapPin size={12}/>{p.address} {p.approval_code&&<InfoTip k="id"><Badge className="bg-slate-100 dark:bg-slate-800">{p.approval_code}</Badge></InfoTip>}</div>)}</div></Card>
      {cur.brands.length>0&&<Card className="p-4"><h3 className="font-semibold mb-2">Beliefert diese Marken / Ketten</h3><div className="space-y-1.5">{cur.brands.map((b:any,i:number)=><div key={i} className="text-sm border-b pb-1 dark:border-slate-800"><b>{b.brand_at_chain}</b><div className="text-xs text-slate-500">{b.evidence} {b.source&&<a href={b.source} target="_blank" rel="noreferrer" className="text-brand underline">Quelle</a>}</div></div>)}</div></Card>}
      {rows.length>0&&<div className="flex flex-wrap gap-2 items-center"><span className="text-sm text-slate-500">Erhältlich bei:</span>{([...new Set(rows.map(r=>r.store))] as string[]).map(x=><StoreLogo key={x} store={x} size={48}/>)}</div>}
      {brands.length>0&&<div className="flex flex-wrap gap-2 items-center"><span className="text-sm text-slate-500">Marken im Datensatz:</span>{brands.map(b=><BrandLogo key={b} r={{brandN:b,logo:rows.find(r=>r.brandN===b)?.logo??null}} size={40}/>)}</div>}
      <h3 className="font-semibold">Produkte ({rows.length})</h3><Gallery rows={rows}/>
      {cur.sources&&<Card className="p-3 text-xs"><h4 className="font-semibold mb-1">Quellen</h4>{(Array.isArray(cur.sources)?cur.sources:Object.values(cur.sources)).map((s:any,i:number)=>{const u=typeof s==='string'?s:s.url;return <div key={i}><a href={u} target="_blank" rel="noreferrer" className="text-brand underline break-all">{typeof s==='string'?s:(s.title||s.url)}</a></div>})}</Card>}</div>}
  const all=P.flatMap(p=>p.plants.map((x:any)=>({...x,name:p.name})))
  return <div className="space-y-3"><p className="text-sm text-slate-500">Wer produziert die Eigenmarken? Grundlage sind die Identitätskennzeichen, die Zulassungslisten der Statistik Austria und die Recherche zu den Firmen.</p>
    {all.length>0&&<Card className="p-2"><PlantMap plants={all} height={360}/></Card>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{P.map(p=>{const c=prodColor(p.slug);const st=[...new Set(p.ids.map((i:number)=>byId.get(i)?.store).filter(Boolean))] as string[];return <Card key={p.slug} style={{borderTop:`5px solid ${c}`}} className="p-3 cursor-pointer hover:shadow-md transition space-y-2" onClick={()=>setH(p.slug)}><div className="flex items-center gap-2">{p.logo?<ZoomImage logo src={p.logo} className="h-10 w-16"/>:<Factory className="text-slate-400"/>}<div className="min-w-0"><div className="font-semibold leading-tight" style={{color:c}}>🏭 {p.legal||p.name}</div><div className="text-xs text-slate-500 flex items-center gap-1"><Flag state={p.plants[0]?.state} text={(p.plants[0]?.address||'')+' '+(p.legal||p.name)} code={p.plants[0]?.approval_code}/>{p.plants[0]?.town??''}</div>{p.group&&<div className="text-[11px] text-slate-500">👥 {p.group}</div>}</div></div>
      {p.summary&&<p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">{p.summary}</p>}<div className="flex flex-wrap gap-1">{(p.retail||[]).slice(0,4).map((b:string)=><Badge key={b} className="bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{b}</Badge>)}</div>{st.length>0&&<div className="flex flex-wrap gap-1 items-center"><span className="text-[11px] text-slate-500">erhältlich bei</span>{st.map(x=><StoreLogo key={x} store={x} size={30}/>)}</div>}<div className="text-xs text-brand">{p.ids.length} Produkte im Vergleich →</div></Card>})}</div></div>
}
